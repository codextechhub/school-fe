import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveFieldAccess, type FieldAccessMap } from "@/components/finance-ui";
import { CREATING, FIELD_RESOURCE } from "@/lib/field-resources";

/**
 * The staff Add form asks Field Access as a record being created.
 *
 * Lagoon View's registrar holds a role with Read off on a staff member's email.
 * Her `/me` map lists `email` under both `hidden` and `open_on_create`, because
 * the backend declares it open on create. On the Add form she is still asked for
 * the new teacher's address, and it is sent, since the invitation has nowhere
 * else to go. On Mr. Bello's existing record the address stays out of sight.
 *
 * Lagoon View is live, so the form asks for no role: Mr. Bello starts as
 * Teacher and nothing about a role is sent. Before Bright Star goes live its
 * admin is still asked to pick School Admin or Branch Admin.
 *
 * The API hooks return fixed data and `usePermissions` returns the map under
 * test, so the form's own rules are what these exercise.
 */
let fieldAccess: FieldAccessMap = {};
const LIVE = {
  data: [],
  role_options: [{ value: "school.bursar", label: "Bursar" }],
  starting_role: { value: "teacher", label: "Teacher" },
};
const ONBOARDING = {
  data: [],
  role_options: [{ value: "school_admin", label: "School Admin" }],
  starting_role: null,
};
let listData: typeof LIVE | typeof ONBOARDING = LIVE;
const create = vi.fn();

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
vi.mock("../drawers/reader-reach", () => ({
  useReaderReach: () => ({
    wholeSchool: true, branches: [], soleBranch: null, isLoading: false, covers: () => true,
  }),
}));
vi.mock("@/redux/services/branches/branches-api", () => ({
  useGetMyBranchesQuery: () => ({ data: { data: [] } }),
}));
vi.mock("@/redux/services/academics/academics-api", () => ({
  useGetClassesQuery: () => ({ data: { data: [] } }),
  useGetSubjectsQuery: () => ({ data: { data: [] } }),
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffListQuery: () => ({ data: listData, isLoading: false }),
  useGetStaffNumberPolicyQuery: () => ({ data: undefined }),
  useGetStaffRulesQuery: () => ({ data: undefined }),
  useCreateStaffMutation: () => [create, { isLoading: false }],
  useUpdateStaffMutation: () => [vi.fn()],
  useResendStaffInvitationMutation: () => [vi.fn(), { isLoading: false }],
}));

import AddStaff from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EMAIL_HIDDEN_BUT_OPEN: FieldAccessMap = {
  [FIELD_RESOURCE.STAFF]: { hidden: ["email"], read_only: [], open_on_create: ["email"] },
};

function inputLabelled(container: HTMLElement, text: string): HTMLInputElement | null {
  const label = Array.from(container.querySelectorAll("label")).find(
    (node) => node.textContent?.replace(/\s*\*$/, "").trim() === text,
  );
  const id = label?.getAttribute("for");
  return id ? (container.querySelector(`#${CSS.escape(id)}`) as HTMLInputElement | null) : null;
}

function submitButton(container: HTMLElement): HTMLButtonElement {
  return Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent === "Create and invite",
  ) as HTMLButtonElement;
}

function type(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

describe("AddStaff and an email open on create", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    create.mockReset();
    create.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: 9, full_name: "Musa Bello" } }) });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    fieldAccess = {};
    listData = LIVE;
  });

  async function render() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AddStaff />
        </MemoryRouter>,
      );
    });
  }

  it("offers and sends the email to a role that may not read it", async () => {
    fieldAccess = EMAIL_HIDDEN_BUT_OPEN;
    await render();

    const email = inputLabelled(container, "Email address");
    expect(email).not.toBeNull();
    expect(email?.closest("fieldset")?.disabled).toBe(false);

    await act(async () => {
      type(inputLabelled(container, "First name") as HTMLInputElement, "Musa");
      type(inputLabelled(container, "Last name") as HTMLInputElement, "Bello");
      type(email as HTMLInputElement, "musa.bello@lagoonview.edu.ng");
    });
    await act(async () => submitButton(container).click());

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toMatchObject({ email: "musa.bello@lagoonview.edu.ng" });
  });

  it("asks for no role at a live school and sends none", async () => {
    await render();

    expect(container.querySelector("select[aria-label='Role']")).toBeNull();
    expect(container.textContent).toContain("They start as Teacher");

    await act(async () => {
      type(inputLabelled(container, "First name") as HTMLInputElement, "Musa");
      type(inputLabelled(container, "Last name") as HTMLInputElement, "Bello");
      type(inputLabelled(container, "Email address") as HTMLInputElement, "musa.bello@lagoonview.edu.ng");
    });
    await act(async () => submitButton(container).click());

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).not.toHaveProperty("role");
    expect(create.mock.calls[0][0]).not.toHaveProperty("role_branch");
  });

  it("asks an onboarding school to pick an administrator role", async () => {
    listData = ONBOARDING;
    await render();

    const role = container.querySelector("select[aria-label='Role']") as HTMLSelectElement;
    expect(role).not.toBeNull();
    expect(container.textContent).not.toContain("They start as");

    await act(async () => {
      type(inputLabelled(container, "First name") as HTMLInputElement, "Ngozi");
      type(inputLabelled(container, "Last name") as HTMLInputElement, "Umeh");
      type(inputLabelled(container, "Email address") as HTMLInputElement, "ngozi@brightstar.edu.ng");
    });
    await act(async () => submitButton(container).click());
    expect(create).not.toHaveBeenCalled();

    await act(async () => type(role, "school_admin"));
    await act(async () => submitButton(container).click());
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toMatchObject({ role: "school_admin" });
  });

  it("leaves the email out when it is hidden and not open on create", async () => {
    fieldAccess = { [FIELD_RESOURCE.STAFF]: { hidden: ["email"], read_only: [], open_on_create: [] } };
    await render();

    expect(inputLabelled(container, "Email address")).toBeNull();
  });

  it("keeps the email out of sight on an existing staff member", () => {
    const existing = { id: 9, full_name: "Musa Bello", phone: "0803 000 0000" };
    const onRecord = resolveFieldAccess(EMAIL_HIDDEN_BUT_OPEN, FIELD_RESOURCE.STAFF, existing);
    const onAdd = resolveFieldAccess(EMAIL_HIDDEN_BUT_OPEN, FIELD_RESOURCE.STAFF);

    expect(onRecord.isHidden("email")).toBe(true);
    expect(onAdd.isHidden("email")).toBe(true);
    expect(onAdd.isHidden("email", CREATING)).toBe(false);
  });
});
