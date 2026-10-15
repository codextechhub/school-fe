import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { Department } from "@/redux/services/academics/academics-types";

/**
 * The head of a department, as its detail panel shows it.
 *
 * Lagoon View's Sciences department is headed by Mr Oluwaseun Bakare, and that
 * is what sends its senior sheets to him to moderate. The head follows its own
 * Field Access switch: hidden, the panel is not drawn at all; read-only, the
 * name shows with nothing to change it; writable, it can be changed or cleared.
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
vi.mock("@/redux/services/academics/academics-api", () => ({
  useUpdateDepartmentMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffListQuery: () => ({ data: { data: [] }, isFetching: false }),
}));

import { DepartmentHeadPanel } from "./department-head";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sciences: Department = {
  id: 24, name: "Sciences", code: "SCI", description: "", is_active: true,
  branch: null, branch_name: null, scope_label: "School-wide",
  program_count: 1, subject_count: 4,
  head: { id: 160, name: "Oluwaseun Bakare" },
} as Department;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  fieldAccess = {};
});

afterEach(() => act(() => root.unmount()));

const render = (department: Department = sciences) =>
  act(() => root.render(<DepartmentHeadPanel department={department} canEdit />));
const buttons = () => Array.from(container.querySelectorAll("button")).map((b) => b.textContent);

describe("department head Field Access", () => {
  it("names the head and offers Change and Clear when the switch is writable", () => {
    render();
    expect(container.textContent).toContain("Oluwaseun Bakare");
    expect(buttons()).toEqual(["Change", "Clear"]);
  });

  it("names the head with nothing to change it when the switch is read-only", () => {
    fieldAccess = { [FIELD_RESOURCE.ACADEMICS_DEPARTMENT]: { hidden: [], read_only: ["head"], open_on_create: [] } };
    render();
    expect(container.textContent).toContain("Oluwaseun Bakare");
    expect(buttons()).toEqual([]);
  });

  it("draws nothing when the switch is hidden, or the server left the head out", () => {
    fieldAccess = { [FIELD_RESOURCE.ACADEMICS_DEPARTMENT]: { hidden: ["head"], read_only: [], open_on_create: [] } };
    render();
    expect(container.textContent).toBe("");

    fieldAccess = {};
    const { head: _withheld, ...withoutHead } = sciences;
    render(withoutHead as Department);
    expect(container.textContent).toBe("");
  });

  it("says moderation never happens without a head", () => {
    render({ ...sciences, head: null });
    expect(container.textContent).toContain("never moderated");
    expect(buttons()).toEqual(["Name a head"]);
  });
});
