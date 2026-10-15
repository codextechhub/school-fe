import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { ApprovalRow, PrincipalComments } from "@/redux/services/gradebook/gradebook-types";

/**
 * The approvals queue and the principal's comments ask Field Access what to
 * offer.
 *
 * Mr Emeka Obi approves results at Lagoon View. SSS1 A awaits him with Sade
 * Adeyemi held; JSS1 A is published. Return needs Write on the return note,
 * because a class never goes back without one. The principal's comments
 * follow their own switch, and the school's remark templates theirs.
 */
let fieldAccess: FieldAccessMap = {};

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({ useBranchLens: () => ({ branch: "all", applies: false, label: "" }) }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const awaiting: ApprovalRow = {
  class: { id: 86, name: "SSS1 A" },
  branch: { id: 22, name: "Main Branch" },
  class_teacher: { id: 70, name: "Amaka Nwosu" },
  subjects_in: 5,
  subjects_due: 5,
  stage: "AWAITING",
  submitted_at: "2026-10-14T10:00:00Z",
  published_at: null,
  held: [{ student: { id: 393, name: "Sade Adeyemi" }, held_by: "Ngozi Ibekwe", placed_at: "2026-10-14T10:00:00Z" }],
  can_decide: true,
};
const published: ApprovalRow = {
  ...awaiting,
  class: { id: 82, name: "JSS1 A" },
  stage: "PUBLISHED",
  published_at: "2026-10-14T12:00:00Z",
  held: [],
  can_decide: false,
};
let rows: ApprovalRow[] = [awaiting, published];

const comments: PrincipalComments = {
  class: { id: 86, name: "SSS1 A" },
  term: { id: 44, name: "First Term" },
  locked: false,
  bands: [
    { band_min: 0, template: "This result needs attention.", override: null },
    {
      band_min: 70,
      template: "An excellent result. Keep it up.",
      override: { text: "An excellent result.", written_by: "Emeka Obi", written_at: "2026-10-14T10:00:00Z" },
    },
  ],
};
let drawerComments: PrincipalComments = comments;
const saveComments = vi.fn();

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetAmendmentsQuery: () => ({ data: undefined }),
  useGetApprovalsQuery: () => ({
    data: { data: { branch_dimension: true, classes: rows } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetPrincipalCommentsQuery: () => ({ data: { data: drawerComments }, isLoading: false }),
  useSavePrincipalCommentsMutation: () => [saveComments, { isLoading: false }],
  useReturnClassMutation: () => [vi.fn(), { isLoading: false }],
  useGetBroadsheetQuery: () => ({ data: undefined }),
  useGetPublishPreviewQuery: () => ({ data: undefined, isFetching: true }),
  usePublishClassesMutation: () => [vi.fn(), { isLoading: false }],
}));

import ApprovalsPage from "./index";
import { PrincipalCommentsDrawer } from "./principal-comments-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fieldAccess = {};
  rows = [awaiting, published];
  drawerComments = comments;
  saveComments.mockReset();
  saveComments.mockResolvedValue({ data: { data: comments } });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const access = (resource: string, hidden: string[], readOnly: string[]) => {
  fieldAccess = { ...fieldAccess, [resource]: { hidden, read_only: readOnly, open_on_create: [] } };
};
const labels = () => Array.from(document.body.querySelectorAll("button, a")).map((b) => b.textContent);
const renderPage = () => act(() => root.render(<MemoryRouter><ApprovalsPage /></MemoryRouter>));
const renderDrawer = () => act(() => root.render(<PrincipalCommentsDrawer row={awaiting} onClose={vi.fn()} />));

describe("approvals Field Access", () => {
  it("offers the approver every decision on an awaiting class, and names who is held", () => {
    renderPage();
    expect(labels()).toEqual(expect.arrayContaining(["Return", "Principal's comments", "Approve and publish"]));
    expect(container.textContent).toContain("Sade Adeyemi is held by Ngozi Ibekwe.");
    expect(container.textContent).toContain("No result in this class is held.");
  });

  it("withholds Return, but not publishing, when the return note may not be written", () => {
    access(FIELD_RESOURCE.GRADEBOOK_SHEET, [], ["note", "returned_note"]);
    renderPage();
    expect(labels()).not.toContain("Return");
    expect(labels()).toContain("Approve and publish");
  });

  it("leaves the principal's comments out when they are hidden", () => {
    access(FIELD_RESOURCE.GRADEBOOK_RESULT, ["principal_comment", "comments", "override", "principal_name"], []);
    renderPage();
    expect(labels()).not.toContain("Principal's comments");
    expect(labels()).toContain("Approve and publish");
  });

  it("offers ticking and a batch publish only where two classes await a decision", () => {
    renderPage();
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(0);
    rows = [awaiting, { ...awaiting, class: { id: 87, name: "SSS1 B" } }];
    renderPage();
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
    expect(labels()).toContain("Publish the ticked class");
  });
});

describe("principal's comments Field Access", () => {
  it("writes from the school's remark and sends only the bands that changed", async () => {
    renderDrawer();
    expect(document.body.querySelectorAll("textarea")).toHaveLength(2);
    const useRemark = Array.from(document.body.querySelectorAll("button")).filter(
      (b) => b.textContent === "Use the school's remark",
    );
    expect(useRemark).toHaveLength(2);
    await act(async () => useRemark[1].click());
    const save = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "Save comments")!;
    await act(async () => save.click());
    expect(saveComments).toHaveBeenCalledWith({
      classId: 86,
      body: { comments: [{ band_min: 0, text: "This result needs attention." }] },
    });
  });

  it("reads only when the principal's comment may not be written", () => {
    access(FIELD_RESOURCE.GRADEBOOK_RESULT, [], ["principal_comment", "comments", "override", "principal_name"]);
    renderDrawer();
    expect(document.body.querySelector("textarea")).toBeNull();
    expect(labels()).not.toContain("Save comments");
    expect(document.body.textContent).toContain("An excellent result.");
  });

  it("writes from a blank box when the school's remarks may not be read", () => {
    drawerComments = {
      ...comments,
      bands: comments.bands.map(({ template: _template, ...band }) => band),
    };
    renderDrawer();
    expect(document.body.textContent).not.toContain("School's remark:");
    expect(labels()).not.toContain("Use the school's remark");
    expect(document.body.querySelectorAll("textarea")).toHaveLength(2);
  });

  it("reads only once the class is published", () => {
    drawerComments = { ...comments, locked: true };
    renderDrawer();
    expect(document.body.querySelector("textarea")).toBeNull();
    expect(document.body.textContent).toContain("The class is published");
  });
});
