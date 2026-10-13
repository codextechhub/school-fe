import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  EnrolmentRules,
  GuardianRules,
} from "@/redux/services/students/students-types";

/**
 * The enrolment form marks a detail required only where the rule binds the
 * registrar.
 *
 * Holy Cross requires a state of origin and a previous school. Mrs. Okafor's
 * role may not write a previous school, so the server holds her only to the
 * state of origin (`binding_required_fields`) and leaves the previous school
 * for somebody with Write to complete. Her form shows the state of origin as
 * required and the previous school as optional, instead of asking for a value
 * she cannot give. A server that sends no binding list binds everyone to
 * `required_fields`.
 */
const BASE_RULES: EnrolmentRules = {
  min_age_years: 2,
  max_age_years: 25,
  required_documents: [],
  document_types: [],
  required_fields: ["state_of_origin", "previous_school"],
  optional_fields: [
    { value: "nationality", label: "Nationality" },
    { value: "state_of_origin", label: "State of origin" },
    { value: "previous_school", label: "Previous school" },
  ],
  capacity_mode: "WARN",
  default_capacity: null,
};
let rules: EnrolmentRules = BASE_RULES;
let guardianRules: GuardianRules | undefined;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess: {},
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({
  useBranchLens: () => ({ applies: false, branch: "all", choices: [] }),
}));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/custom/permission-gate", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/redux/services/students/students-api", () => ({
  useEnrolStudentMutation: () => [vi.fn(), { isLoading: false }],
  useGetAdmissionPolicyQuery: () => ({ data: undefined }),
  useGetEnrolmentRulesQuery: () => ({ data: { data: rules } }),
  useGetGuardianRulesQuery: () => ({ data: guardianRules ? { data: guardianRules } : undefined }),
  useGetAdmissionRulesQuery: () => ({ data: undefined }),
  useGetClassSeatsQuery: () => ({ data: { data: [] } }),
}));

import EnrolStudent from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function labelText(container: HTMLElement, text: string): string | undefined {
  return Array.from(container.querySelectorAll("label"))
    .map((node) => node.textContent ?? "")
    .find((content) => content.replace(/\s*\*$/, "").trim().startsWith(text));
}

describe("EnrolStudent and the rules that bind the registrar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    rules = BASE_RULES;
    guardianRules = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function render() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <EnrolStudent />
        </MemoryRouter>,
      );
    });
  }

  it("marks as required only the details that bind the registrar", async () => {
    rules = { ...BASE_RULES, binding_required_fields: ["state_of_origin"] };
    await render();

    expect(labelText(container, "State of origin")).toMatch(/\*$/);
    expect(labelText(container, "Previous school")).toBe("Previous school (optional)");
  });

  it("marks nothing required where the registrar is bound by none of the school's requirements", async () => {
    rules = { ...BASE_RULES, binding_required_fields: [] };
    await render();

    expect(labelText(container, "State of origin")).not.toMatch(/\*$/);
    expect(labelText(container, "Previous school")).toBe("Previous school (optional)");
  });

  it("holds everyone to the school's list when the server sends no binding list", async () => {
    await render();

    expect(labelText(container, "State of origin")).toMatch(/\*$/);
    expect(labelText(container, "Previous school")).toMatch(/\*$/);
  });
});
