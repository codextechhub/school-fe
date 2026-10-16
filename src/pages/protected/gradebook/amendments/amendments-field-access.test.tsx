import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { AmendmentForm, AmendmentRow } from "@/redux/services/gradebook/gradebook-types";

/**
 * Corrections and the correction drawer ask Field Access and the keys what to
 * show and offer.
 *
 * Mrs Adaeze Okafor, branch administrator at Lagoon View, asked for Tunde
 * Bello's Mathematics examination to be corrected from 26 to 36. Mr Emeka
 * Obi decides corrections. A correction is never decided by the person who
 * asked for it, which the server says in `can_decide`.
 */
let fieldAccess: FieldAccessMap = {};
let decides = true;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => decides,
    hasAnyPermission: () => decides,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({ useBranchLens: () => ({ branch: "all", applies: false, label: "" }) }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const waiting: AmendmentRow = {
  id: 7,
  status: "PENDING",
  student: { id: 381, name: "Tunde Bello", admission_number: "LV/0381" },
  class: { id: 82, name: "JSS1 A" },
  term: { id: 44, name: "First Term" },
  subject: { id: 41, name: "Mathematics" },
  branch: null,
  amendment_reason: "The examination was added up wrongly.",
  raised_by: "Adaeze Okafor",
  raised_at: "2026-10-15T09:00:00Z",
  decided_by: null,
  decided_at: null,
  decision_note: "",
  version: null,
  before: { cells: [{ component: 1, mark: 7, marker: null }, { component: 3, mark: 26, marker: null }], total: 33, grade: "F" },
  after: { cells: [{ component: 1, mark: 7, marker: null }, { component: 3, mark: 36, marker: null }], total: 43, grade: "D" },
  can_decide: true,
};
let rows: AmendmentRow[] = [waiting];

const form: AmendmentForm = {
  class: { id: 82, name: "JSS1 A" },
  student: { id: 381, name: "Tunde Bello", admission_number: "LV/0381" },
  subject: { id: 41, name: "Mathematics" },
  term: { id: 44, name: "First Term" },
  version: 1,
  components: [
    { id: 1, name: "1st CA", short_name: "CA1", max_score: 40, is_exam: false },
    { id: 3, name: "Examination", short_name: "EXAM", max_score: 60, is_exam: true },
  ],
  cells: [{ component: 1, mark: 7, marker: null }, { component: 3, mark: 26, marker: null }],
  total: 33,
  obtainable: 100,
  grade: "F",
  pending: null,
};
let drawerForm: AmendmentForm = form;
const raise = vi.fn();

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetAmendmentsQuery: (args?: { status?: string }) => {
    const filtered = args?.status ? rows.filter((row) => row.status === args.status) : rows;
    return {
      data: {
        success: true,
        message: "",
        pagination: { currentPage: 1, pageSize: 25, totalItems: filtered.length, totalPages: 1, next: null, previous: null },
        data: filtered,
        branch_dimension: false,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useApproveAmendmentMutation: () => [vi.fn(), { isLoading: false }],
  useRejectAmendmentMutation: () => [vi.fn(), { isLoading: false }],
  useGetAmendmentFormQuery: () => ({ data: { data: drawerForm }, isLoading: false, isError: false }),
  useRaiseAmendmentMutation: () => [raise, { isLoading: false }],
}));

import AmendmentsPage from "./index";
import { CorrectionDrawer } from "./correction-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fieldAccess = {};
  decides = true;
  rows = [waiting];
  drawerForm = form;
  raise.mockReset();
  raise.mockResolvedValue({ data: { data: waiting } });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const access = (resource: string, hidden: string[], readOnly: string[]) => {
  fieldAccess = { ...fieldAccess, [resource]: { hidden, read_only: readOnly, open_on_create: [] } };
};
const labels = () => Array.from(document.body.querySelectorAll("button, a")).map((b) => b.textContent);
const button = (text: string) => Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === text);
const buttonContaining = (text: string) => Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent?.includes(text));
const type = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
const renderPage = () => act(() => root.render(<MemoryRouter><AmendmentsPage /></MemoryRouter>));
const renderDrawer = () =>
  act(() => root.render(<CorrectionDrawer target={{ classId: 82, studentId: 381, subjectId: 41 }} onClose={vi.fn()} />));

describe("corrections list", () => {
  it("shows why, the marks before and after, and opens both decisions for the approver", async () => {
    renderPage();
    expect(container.textContent).toContain("The examination was added up wrongly.");
    expect(container.textContent).toContain("7 · 26 · total 33, F");
    expect(container.textContent).toContain("7 · 36 · total 43, D");
    expect(labels()).toEqual(expect.arrayContaining(["Review decision", "View report card"]));
    await act(async () => button("Review decision")!.click());
    expect(labels()).toEqual(expect.arrayContaining(["Approve correction", "Reject correction"]));
  });

  it("offers no decision on a correction the reader asked for, or to a reader without the decide key", () => {
    rows = [{ ...waiting, can_decide: false }];
    renderPage();
    expect(labels()).not.toContain("Review decision");
    rows = [waiting];
    decides = false;
    renderPage();
    expect(labels()).not.toContain("Review decision");
  });

  it("withholds Reject, but not Approve, when the decision note may not be written", async () => {
    access(FIELD_RESOURCE.GRADEBOOK_AMENDMENT, [], ["decision_note"]);
    renderPage();
    await act(async () => button("Review decision")!.click());
    expect(labels()).not.toContain("Reject correction");
    expect(labels()).toContain("Approve correction");
    expect(document.body.querySelector("textarea")).toBeNull();
  });

  it("uses the sliding status filter without mixing rows from another state", async () => {
    rows = [
      waiting,
      { ...waiting, id: 8, status: "APPROVED", student: { id: 382, name: "Amina Yusuf", admission_number: "LV/0382" }, can_decide: false },
    ];
    renderPage();
    expect(container.textContent).toContain("Tunde Bello");
    expect(container.textContent).toContain("Amina Yusuf");
    await act(async () => buttonContaining("Approved")!.click());
    expect(container.textContent).not.toContain("Tunde Bello");
    expect(container.textContent).toContain("Amina Yusuf");
    expect(buttonContaining("Approved")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("drops the reason and the marks the server withheld", () => {
    rows = [{ ...waiting, amendment_reason: undefined, before: undefined, after: undefined }];
    renderPage();
    expect(container.textContent).not.toContain("added up wrongly");
    expect(container.textContent).not.toContain("As published");
  });
});

describe("correction drawer", () => {
  it("sends only the changed column with the reason", async () => {
    renderDrawer();
    const inputs = document.body.querySelectorAll<HTMLInputElement>("input");
    expect(inputs[1].value).toBe("26");
    await type(inputs[1], "36");
    await type(document.body.querySelector("textarea")!, "The examination was added up wrongly.");
    await act(async () => button("Ask for the correction")!.click());
    expect(raise).toHaveBeenCalledWith({
      term: 44,
      class: 82,
      student: 381,
      subject: 41,
      reason: "The examination was added up wrongly.",
      cells: [{ component: 3, mark: 36, marker: null }],
    });
  });

  it("prints a cell the server refused under its column", async () => {
    raise.mockResolvedValue({
      error: {
        status: 422,
        data: { error: { code: "CELLS_REFUSED", detail: { cells: [{ student: 381, component: 3, code: "OVER_MAX", message: "Max 60" }] } } },
      },
    });
    renderDrawer();
    const inputs = document.body.querySelectorAll<HTMLInputElement>("input");
    await type(inputs[1], "36");
    await type(document.body.querySelector("textarea")!, "Added up wrongly.");
    await act(async () => button("Ask for the correction")!.click());
    expect(document.body.textContent).toContain("Max 60");
  });

  it("offers nothing to send while a correction to the subject waits", () => {
    drawerForm = { ...form, pending: { id: 7, raised_at: "2026-10-15T09:00:00Z" } };
    renderDrawer();
    expect(document.body.textContent).toContain("already waiting");
    expect(document.body.querySelector("textarea")).toBeNull();
    expect(labels()).not.toContain("Ask for the correction");
  });

  it("offers nothing to send when the marks or the reason may not be written", () => {
    access(FIELD_RESOURCE.GRADEBOOK_SHEET, [], ["mark"]);
    renderDrawer();
    expect(document.body.querySelector("textarea")).toBeNull();
    expect(labels()).not.toContain("Ask for the correction");
    act(() => root.unmount());
    root = createRoot(container);
    fieldAccess = {};
    access(FIELD_RESOURCE.GRADEBOOK_AMENDMENT, [], ["amendment_reason"]);
    renderDrawer();
    expect(labels()).not.toContain("Ask for the correction");
  });

  it("says so when the marks may not be read", () => {
    drawerForm = { ...form, cells: undefined };
    renderDrawer();
    expect(document.body.textContent).toContain("cannot read this subject's marks");
  });
});
