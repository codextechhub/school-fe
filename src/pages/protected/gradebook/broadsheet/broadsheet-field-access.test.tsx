import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { Broadsheet, Compile } from "@/redux/services/gradebook/gradebook-types";

/**
 * The broadsheet and the compile drawer ask Field Access what to show and
 * offer.
 *
 * Mrs Hauwa Sanni is class teacher of JSS1 B at Lagoon View. Tunde Adeleke has
 * his comment written; Bola Okafor does not. The average, the position and the
 * comment status follow their result switches on the broadsheet. In the
 * drawer the ratings and the comment follow theirs, and because every save
 * carries the comment, a comment she may not write leaves nothing to save.
 */
let fieldAccess: FieldAccessMap = {};
let granted = new Set<string>();

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: (code: string) => granted.has(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => granted.has(code)),
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const sheet: Broadsheet = {
  class: { id: 83, name: "JSS1 B" },
  term: { id: 44, name: "First Term" },
  class_teacher: { id: 215, name: "Hauwa Sanni" },
  stage: "COMPILING",
  returned: null,
  subjects: [{ id: 1, name: "Mathematics", short: "MTH", main_teacher: { id: 215, name: "Hauwa Sanni" }, in: true }],
  rows: [
    {
      student: { id: 382, name: "Tunde Adeleke", admission_number: "LV/0382" },
      cells: [{ subject: 1, state: "TOTAL", total: 45 }],
      average: "57.00",
      position: 2,
      position_of: 2,
      comment_done: true,
    },
    {
      student: { id: 381, name: "Bola Okafor", admission_number: "LV/0381" },
      cells: [{ subject: 1, state: "TOTAL", total: 58 }],
      average: "66.00",
      position: 1,
      position_of: 2,
      comment_done: false,
    },
  ],
  gaps: [],
  attendance_warning: null,
  can_submit: false,
  submit_blockers: { subjects_missing: [], comments_missing: 1 },
  ranks: true,
};

const bola: Compile = {
  student: { id: 381, name: "Bola Okafor", admission_number: "LV/0381" },
  index: 2,
  of: 2,
  previous: 382,
  next: null,
  subjects: [{ subject: { id: 1, name: "Mathematics" }, total: 58, grade: "C", state: "TOTAL" }],
  average: "66.00",
  attendance: { opened: 32, present: 30, absent: 2 },
  ratings: { Punctuality: 4 },
  traits: ["Punctuality", "Neatness"],
  teacher_comment: "",
  stage: "COMPILING",
  can_edit: true,
};
let drawer: Compile = bola;
const save = vi.fn();

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetBroadsheetQuery: () => ({ data: { data: sheet }, isLoading: false, isError: false, refetch: vi.fn() }),
  useSubmitClassMutation: () => [vi.fn(), { isLoading: false }],
  useGetCompileQuery: () => ({ data: { data: drawer }, isFetching: false }),
  useSaveCompileMutation: () => [save, { isLoading: false }],
}));

import BroadsheetPage from "./index";
import { CompileDrawer } from "./compile-drawer";
import { P } from "@/permissions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fieldAccess = {};
  granted = new Set([P.SUBMIT_CLASS_RESULTS]);
  drawer = bola;
  save.mockReset();
  save.mockResolvedValue({ data: { data: bola } });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const hide = (...names: string[]) => {
  fieldAccess = { [FIELD_RESOURCE.GRADEBOOK_RESULT]: { hidden: names, read_only: [], open_on_create: [] } };
};
const readOnly = (...names: string[]) => {
  fieldAccess = { [FIELD_RESOURCE.GRADEBOOK_RESULT]: { hidden: [], read_only: names, open_on_create: [] } };
};
const headers = () => Array.from(container.querySelectorAll("th")).map((th) => th.textContent);
const buttons = () => Array.from(document.body.querySelectorAll("button")).map((b) => b.textContent);

const renderSheet = () =>
  act(() =>
    root.render(
      <MemoryRouter initialEntries={["/gradebook/classes/83"]}>
        <Routes>
          <Route path="/gradebook/classes/:classId" element={<BroadsheetPage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
const renderDrawer = () =>
  act(() =>
    root.render(
      <CompileDrawer classKey={{ classId: 83 }} className="JSS1 B" studentId={381} onMove={vi.fn()} onClose={vi.fn()} />,
    ),
  );

describe("broadsheet Field Access", () => {
  it("shows the average, the position and each comment's status", () => {
    renderSheet();
    expect(headers()).toEqual(expect.arrayContaining(["Average", "Position", "Compile"]));
    expect(container.textContent).toContain("66.00");
    expect(container.textContent).toContain("1st");
    expect(container.textContent).toContain("No comment");
    expect(buttons()).toContain("1 comment to write");
  });

  it("drops the average and the position when they are hidden", () => {
    hide("overall_average", "average", "position", "annual_position");
    renderSheet();
    expect(container.textContent).toContain("Bola Okafor");
    expect(headers()).not.toContain("Average");
    expect(headers()).not.toContain("Position");
    expect(container.textContent).not.toContain("66.00");
  });

  it("drops the comment status but keeps Open when the comment is hidden", () => {
    hide("teacher_comment", "comment_done", "teacher_name");
    renderSheet();
    expect(container.textContent).not.toContain("No comment");
    expect(container.textContent).not.toContain("Done");
    expect(buttons()).toContain("Open");
  });

  it("offers neither Submit nor Open to a reader who may do neither", () => {
    granted = new Set([P.VIEW_RESULTS_HUB]);
    renderSheet();
    expect(container.textContent).toContain("Bola Okafor");
    expect(buttons()).not.toContain("1 comment to write");
    expect(buttons()).not.toContain("Open");
  });
});

describe("compile drawer Field Access", () => {
  it("lets the class teacher rate and comment", () => {
    renderDrawer();
    const radios = document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(radios).toHaveLength(10);
    expect(Array.from(radios).every((radio) => !radio.disabled)).toBe(true);
    expect(document.body.querySelector("textarea")).not.toBeNull();
    expect(document.body.textContent).toContain("Opened 32 · present 30 · absent 2");
  });

  it("sends no ratings when they are read-only", async () => {
    readOnly("ratings", "traits");
    renderDrawer();
    const radios = document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(Array.from(radios).every((radio) => radio.disabled)).toBe(true);
    const textarea = document.body.querySelector("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(textarea, "A steady term.");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "Save")!;
    await act(async () => saveButton.click());
    expect(save).toHaveBeenCalledWith({ classId: 83, studentId: 381, body: { teacher_comment: "A steady term." } });
  });

  it("offers nothing to save when the comment is read-only", () => {
    readOnly("teacher_comment", "comment_done", "teacher_name");
    renderDrawer();
    expect(document.body.querySelector("textarea")).toBeNull();
    expect(buttons()).not.toContain("Save");
    const radios = document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(Array.from(radios).every((radio) => radio.disabled)).toBe(true);
  });

  it("drops the ratings and the comment when they are hidden", () => {
    hide("ratings", "traits", "teacher_comment", "comment_done", "teacher_name");
    renderDrawer();
    expect(document.body.textContent).not.toContain("Conduct and skills");
    expect(document.body.textContent).not.toContain("Class teacher's comment");
    expect(buttons()).not.toContain("Save");
  });

  it("reads the drawer locked once the class is with the principal", () => {
    drawer = { ...bola, stage: "AWAITING", can_edit: false, teacher_comment: "A steady term." };
    renderDrawer();
    expect(document.body.querySelector("textarea")).toBeNull();
    expect(document.body.textContent).toContain("A steady term.");
    expect(document.body.textContent).toContain("The class has gone to the principal");
  });
});
