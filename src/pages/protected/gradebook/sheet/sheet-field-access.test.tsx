import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { Sheet } from "@/redux/services/gradebook/gradebook-types";

/**
 * The score sheet asks Field Access what to show and what to offer.
 *
 * Mrs Hauwa Sanni is main teacher of SSS1 B English at Lagoon View. Her school
 * can narrow what a role reads on a sheet with three switches: the marks
 * themselves (`mark`, read and write), the worked-out figures (`row_result`,
 * which the server sends as `total`, `percentage`, `grade` and the rest) and
 * the return note. These pin what each setting does to the screen she sees:
 *
 * - marks writable: inputs, ABS and Excused, and Submit;
 * - marks read-only: the same marks as text, nothing to type in, no Submit;
 * - marks hidden: a notice, never an empty grid that reads as nothing entered;
 * - figures hidden: no Total, %, Grade or Remark columns and no progress count.
 *
 * The API hooks return a fixed sheet and `usePermissions` returns the map under
 * test, so the screen's own rules are what these exercise.
 */
let fieldAccess: FieldAccessMap = {};
let sheet: Sheet;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/hooks/use-school-display", () => ({
  useSchoolDisplay: () => ({
    formatDay: (iso: string) => iso,
    formatInstantTime: () => "1:20 pm",
    formatRelativeDay: () => "Today",
  }),
}));
vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetSheetQuery: () => ({ data: { data: sheet }, isLoading: false, isError: false, refetch: vi.fn() }),
  useGetMySheetsQuery: () => ({ data: undefined }),
  useSaveScoresMutation: () => [vi.fn()],
  useSubmitSheetMutation: () => [vi.fn(), { isLoading: false }],
}));

import ScoreSheet from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COMPONENTS = [
  { id: 8, name: "1st CA", short_name: "CA1", max_score: 20, is_exam: false },
  { id: 10, name: "Examination", short_name: "EXAM", max_score: 60, is_exam: true },
];

function englishSheet(overrides: Partial<Sheet> = {}): Sheet {
  return {
    class: { id: 87, name: "SSS1 B" },
    subject: { id: 42, name: "English Language" },
    term: { id: 44, name: "First Term" },
    main_teacher: { id: 152, name: "Hauwa Sanni" },
    assistants: [],
    exam_paper: null,
    status: "IN_PROGRESS",
    needs_moderation: false,
    is_elective: false,
    takers: null,
    roll: null,
    returned: null,
    saved_at: null,
    progress: { complete: 1, total: 1 },
    can_enter: true,
    can_submit: true,
    blank_count: 0,
    components: COMPONENTS,
    rows: [
      {
        student: { id: 416, name: "Daniel Afolabi", admission_number: "LV/2026/0001" },
        cells: [
          { component: 8, mark: 11, marker: null },
          { component: 10, mark: null, marker: "ABS" },
        ],
        total: 11,
        obtainable: 80,
        percentage: "13.75",
        grade: "F9",
        remark: "Fail",
        is_fail: true,
        complete: true,
        excused_note: null,
      },
    ],
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fieldAccess = {};
  sheet = englishSheet();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render() {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/gradebook/sheets/87/42"]}>
        <Routes>
          <Route path="/gradebook/sheets/:classId/:subjectId" element={<ScoreSheet />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const inputs = () => container.querySelectorAll("input[data-sheet-cell]");
const headers = () => Array.from(container.querySelectorAll("th")).map((th) => th.textContent);
const submit = () =>
  Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Submit sheet");

describe("score sheet Field Access", () => {
  it("offers inputs, the markers and Submit when the marks are writable", () => {
    render();
    expect(inputs().length).toBeGreaterThan(0);
    expect(container.querySelector('[aria-label="Daniel Afolabi, 1st CA"]')).not.toBeNull();
    expect(submit()).toBeDefined();
  });

  it("shows the marks as text, with nothing to type in, when they are read-only", () => {
    fieldAccess = { [FIELD_RESOURCE.GRADEBOOK_SHEET]: { hidden: [], read_only: ["mark", "marker", "cells"], open_on_create: [] } };
    render();
    expect(inputs().length).toBe(0);
    expect(submit()).toBeUndefined();
    expect(container.textContent).toContain("11");
    expect(container.textContent).toContain("ABS");
  });

  it("is read-only when the server says this reader may not enter, whatever the switches say", () => {
    sheet = englishSheet({ can_enter: false, can_submit: false });
    render();
    expect(inputs().length).toBe(0);
    expect(submit()).toBeUndefined();
    expect(container.textContent).toContain("only the subject's main teacher enters marks");
  });

  it("says the marks are withheld rather than drawing an empty grid when they are hidden", () => {
    fieldAccess = { [FIELD_RESOURCE.GRADEBOOK_SHEET]: { hidden: ["mark", "marker", "cells"], read_only: [], open_on_create: [] } };
    sheet = englishSheet({ rows: [{ student: { id: 416, name: "Daniel Afolabi", admission_number: "" } }] });
    render();
    expect(container.textContent).toContain("Your role cannot read the marks on this sheet");
    expect(container.querySelector("table")).toBeNull();
    expect(submit()).toBeUndefined();
  });

  it("drops the figures columns and the progress count when the figures are hidden", () => {
    fieldAccess = {
      [FIELD_RESOURCE.GRADEBOOK_SHEET]: {
        hidden: ["total", "obtainable", "percentage", "grade", "remark", "is_fail", "complete", "excused_note"],
        read_only: [],
        open_on_create: [],
      },
    };
    render();
    expect(headers()).not.toContain("Total");
    expect(headers()).not.toContain("Grade");
    expect(headers()).not.toContain("Remark");
    expect(container.textContent).not.toContain("1 of 1 complete");
    expect(inputs().length).toBeGreaterThan(0);
  });

  it("pins the return note above the sheet, and leaves it out when the server withheld it", () => {
    sheet = englishSheet({
      status: "RETURNED",
      returned: { by: "Oluwaseun Bakare", at: "2026-10-14T17:22:00Z", note: "Two columns look swapped." },
    });
    render();
    expect(container.textContent).toContain("Returned by Oluwaseun Bakare");
    expect(container.textContent).toContain("Two columns look swapped.");

    act(() => root.unmount());
    root = createRoot(container);
    sheet = englishSheet({ status: "RETURNED", returned: { by: "Oluwaseun Bakare", at: "2026-10-14T17:22:00Z" } });
    render();
    expect(container.textContent).toContain("Returned by Oluwaseun Bakare");
    expect(container.textContent).not.toContain("swapped");
  });
});
