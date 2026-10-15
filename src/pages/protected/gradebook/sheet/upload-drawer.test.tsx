import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ImportPreview, Sheet } from "@/redux/services/gradebook/gradebook-types";

import { cellVerdict, defaultChosen } from "./upload";

/**
 * Filling SSS1 B's English Language from a spreadsheet.
 *
 * Mrs Hauwa Sanni downloads the sheet, fills the last pupils' marks offline
 * and uploads it. The file has four rows: Ada Okoro gains her examination
 * mark, Bola Peters' first test goes from 12 to 14, Chidi Quadri's row is
 * unchanged, and row 5 names an admission number nobody holds.
 */
const preview: ImportPreview = {
  token: "tok-1",
  expires_at: "2026-10-15T14:00:00Z",
  summary: { rows: 4, ready: 3, with_issues: 1, replaces: 1 },
  file_issues: [],
  rows: [
    {
      row_number: 2,
      admission_number: "LV/2026/0001",
      student: { id: 1, name: "Ada Okoro" },
      cells: [{ component: 10, value: 15, outcome: "SAME", existing: 15 }, { component: 11, value: 48, outcome: "NEW", existing: null }],
      issues: [],
    },
    {
      row_number: 3,
      admission_number: "LV/2026/0002",
      student: { id: 2, name: "Bola Peters" },
      cells: [{ component: 10, value: 14, outcome: "REPLACES", existing: 12 }, { component: 11, value: null, outcome: "BLANK", existing: 40 }],
      issues: [],
    },
    {
      row_number: 4,
      admission_number: "LV/2026/0003",
      student: { id: 3, name: "Chidi Quadri" },
      cells: [{ component: 10, value: 11, outcome: "SAME", existing: 11 }, { component: 11, value: 39, outcome: "SAME", existing: 39 }],
      issues: [],
    },
    {
      row_number: 5,
      admission_number: "LV/2026/0999",
      student: null,
      cells: [],
      issues: [{ code: "UNKNOWN_ADMISSION_NUMBER", message: "No pupil has this admission number." }],
    },
  ],
};

describe("what an upload does", () => {
  it("ticks the ready rows that change something, and nothing else", () => {
    expect(defaultChosen(preview)).toEqual([2, 3]);
  });

  it("words each cell's outcome", () => {
    expect(cellVerdict(preview.rows[0].cells[1], undefined)).toEqual({ text: "48", tone: "new" });
    expect(cellVerdict(preview.rows[1].cells[0], undefined)).toEqual({ text: "14 (was 12)", tone: "replaces" });
    expect(cellVerdict(preview.rows[1].cells[1], undefined)).toEqual({ text: "left as is", tone: "blank" });
    expect(cellVerdict({ component: 11, value: "EXC", outcome: "NEW", existing: null }, undefined).text).toBe("Exc");
    expect(cellVerdict({ component: 11, value: "75", outcome: null }, "Max 60")).toEqual({ text: "Max 60", tone: "issue" });
  });
});

const confirm = vi.fn();
const check = vi.fn();
vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useDownloadSheetTemplateMutation: () => [vi.fn(), { isLoading: false }],
  usePreviewSheetImportMutation: () => [check, { isLoading: false }],
  useConfirmSheetImportMutation: () => [confirm, { isLoading: false }],
}));

const { UploadDrawer } = await import("./upload-drawer");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sheet = {
  class: { id: 87, name: "SSS1 B" },
  subject: { id: 42, name: "English Language" },
  term: { id: 44, name: "First Term" },
  components: [
    { id: 10, name: "1st CA", short_name: "CA1", max_score: 20, is_exam: false },
    { id: 11, name: "Examination", short_name: "EXAM", max_score: 60, is_exam: true },
  ],
} as unknown as Sheet;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  check.mockReset();
  confirm.mockReset();
  check.mockResolvedValue({ data: { data: preview } });
  confirm.mockResolvedValue({ data: { data: sheet } });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const choose = async () => {
  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File(["x"], "english.xlsx");
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
};
const button = (text: RegExp) => Array.from(document.body.querySelectorAll("button")).find((b) => text.test(b.textContent ?? ""));

describe("the upload drawer", () => {
  it("shows each row's outcome and saves the ticked rows", async () => {
    act(() => root.render(<UploadDrawer sheet={sheet} sheetKey={{ classId: 87, subjectId: 42 }} onClose={vi.fn()} />));
    await choose();
    expect(check).toHaveBeenCalled();
    expect(document.body.textContent).toContain("4 rows · 3 ready · 1 with a problem · 1 would replace");
    expect(document.body.textContent).toContain("14 (was 12)");
    expect(document.body.textContent).toContain("No pupil has this admission number.");
    await act(async () => button(/^Save 2 rows$/)!.click());
    expect(confirm).toHaveBeenCalledWith({ classId: 87, subjectId: 42, token: "tok-1", rows: [2, 3] });
  });

  it("checks the file again when the sheet changed after the check, and saves nothing", async () => {
    confirm.mockResolvedValue({
      error: { status: 409, data: { error: { code: "SHEET_CHANGED_SINCE_PREVIEW" }, message: "The sheet changed." } },
    });
    act(() => root.render(<UploadDrawer sheet={sheet} sheetKey={{ classId: 87, subjectId: 42 }} onClose={vi.fn()} />));
    await choose();
    await act(async () => button(/^Save 2 rows$/)!.click());
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("says a file that does not fit the sheet can save nothing", async () => {
    check.mockResolvedValue({
      data: {
        data: {
          ...preview,
          token: null,
          rows: [],
          file_issues: [{ code: "MISSING_COLUMN", message: "The file has no Examination column." }],
        },
      },
    });
    act(() => root.render(<UploadDrawer sheet={sheet} sheetKey={{ classId: 87, subjectId: 42 }} onClose={vi.fn()} />));
    await choose();
    expect(document.body.textContent).toContain("The file has no Examination column.");
    expect(button(/^Save/)?.disabled).toBe(true);
  });
});
