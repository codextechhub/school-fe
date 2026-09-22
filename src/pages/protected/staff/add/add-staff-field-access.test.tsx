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
 * The API hooks return fixed data and `usePermissions` returns the map under
 * test, so the form's own Field Access rules are what these exercise.
 */
let fieldAccess: FieldAccessMap = {};
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
vi.mock("@/redux/services/branches/branches-api", () => ({
  useGetMyBranchesQuery: () => ({ data: { data: [] } }),
}));
vi.mock("@/redux/services/academics/academics-api", () => ({
  useGetClassesQuery: () => ({ data: { data: [] } }),
  useGetSubjectsQuery: () => ({ data: { data: [] } }),
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffListQuery: () => ({
    data: { data: [], role_options: [{ value: "school.bursar", label: "Bursar" }] },
    isLoading: false,
  }),
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
      type(container.querySelector("select[aria-label='Role']") as HTMLSelectElement, "school.bursar");
    });
    const submit = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Create and invite",
    ) as HTMLButtonElement;
    await act(async () => submit.click());

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toMatchObject({ email: "musa.bello@lagoonview.edu.ng" });
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
