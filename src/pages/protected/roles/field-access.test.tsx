import { act, type ChangeEventHandler, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogueModule, RoleFieldAccessEntry } from "@/redux/services/roles/roles-types";

/**
 * Field Access narrows by Module, then Resource, and never loses a draft doing it.
 *
 * Lagoon View's administrator opens the Bursar role. No fields show until she
 * picks Staff and then Bank details. She turns Read off on Account number, then
 * looks at Payroll and at Contact before coming back: the unsaved switch is
 * still counted on Save, because moving between resources is looking, not
 * abandoning.
 *
 * The API hooks return fixed data and `SearchSelect` is a plain select, so the
 * page's own narrowing and draft rules are what these exercise.
 */
vi.mock("@/components/custom/search-select", () => ({
  SearchSelect: ({
    id,
    label,
    options,
    value,
    disabled,
    placeholder,
    onChange,
  }: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    value: string;
    disabled?: boolean;
    placeholder?: string;
    onChange: ChangeEventHandler<HTMLSelectElement>;
  }) => (
    <label>
      {label}
      <select id={id} value={value} disabled={disabled} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  ),
}));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children, className }: { children: ReactNode; className?: string }) => (
    <main className={className}>{children}</main>
  ),
}));
vi.mock("@/components/custom/page-access-denied", () => ({ default: () => <p>Access denied</p> }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => true, hasAnyPermission: () => true }),
}));
vi.mock("@/redux/store", () => ({ useAppSelector: () => null }));
vi.mock("@/redux/features/auth/auth-slice", () => ({ selectUser: () => null }));
vi.mock("@/redux/services/auth/auth-api", () => ({ useLazyGetMeQuery: () => [vi.fn()] }));

const PAYROLL_REASON = "Payroll is not part of this school's plan.";

const field = (
  module: string,
  resource: string,
  key: string,
  label: string,
): RoleFieldAccessEntry => ({
  key,
  name: key,
  api_names: [key],
  label,
  group: "General",
  description: "",
  sensitive: false,
  writable: true,
  default: { read: true, write: true },
  module,
  resource,
  read: true,
  write: true,
  source: "default",
  set_by_name: null,
  set_at: null,
});

const FIELDS = [
  field("staff", "bank_details", "staff.bank_details.account_number", "Account number"),
  field("staff", "contact", "staff.contact.phone", "Phone"),
  field("payroll", "payslips", "payroll.payslips.net_pay", "Net pay"),
];

const CATALOGUE: CatalogueModule[] = [
  {
    module: "staff",
    label: "Staff",
    available: true,
    resources: [
      { resource: "bank_details", label: "Bank details", available: true, permissions: [], fields: [FIELDS[0]] },
      { resource: "contact", label: "Contact", available: true, permissions: [], fields: [FIELDS[1]] },
      { resource: "notes", label: "Notes", available: true, permissions: [], fields: [] },
    ],
  },
  {
    module: "payroll",
    label: "Payroll",
    available: false,
    resources: [
      {
        resource: "payslips",
        label: "Payslips",
        available: false,
        fields: [FIELDS[2]],
        permissions: [
          {
            key: "payroll.payslips.view",
            label: "View payslips",
            resource: "payroll.payslips",
            action: "view",
            sensitivity: "NORMAL",
            is_restricted: false,
            capability: "payroll",
            available: false,
            band: null,
            depth_label: null,
            unavailable_reason: PAYROLL_REASON,
          },
        ],
      },
    ],
  },
];

const ROLES = {
  data: [
    { key: "bursar", name: "Bursar" },
    { key: "form-teacher", name: "Form Teacher" },
  ],
  isLoading: false,
};
const CATALOGUE_QUERY = { data: { data: CATALOGUE }, isLoading: false };
const FIELDS_QUERY = { data: { data: { fields: FIELDS } }, isLoading: false, refetch: vi.fn() };
const ROLE_QUERY = { data: undefined };
const SAVE = [vi.fn(), { isLoading: false }];

vi.mock("@/redux/services/roles/roles-api", () => ({
  useGetFieldAccessRolesQuery: () => ROLES,
  useGetAccessCatalogueQuery: () => CATALOGUE_QUERY,
  useGetSchoolRoleQuery: () => ROLE_QUERY,
  useGetRoleFieldAccessQuery: () => FIELDS_QUERY,
  useUpdateRoleFieldAccessMutation: () => SAVE,
}));

const { default: FieldAccess } = await import("./field-access");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Field Access page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<FieldAccess />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const select = (id: string) => container.querySelector<HTMLSelectElement>(`#${id}`)!;
  const choose = (id: string, value: string) =>
    act(async () => {
      const element = select(id);
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  const search = () => container.querySelector<HTMLInputElement>('input[placeholder="Search field labels"]')!;
  const typeSearch = (value: string) =>
    act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search(), value);
      search().dispatchEvent(new Event("input", { bubbles: true }));
    });
  const saveLabel = () =>
    [...container.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Save"))?.textContent;
  const PROMPT = "Choose a module, then a resource, to see its fields.";

  it("shows a prompt and no fields until a module and a resource are chosen", () => {
    expect(select("field-access-module").value).toBe("");
    expect(select("field-access-resource").disabled).toBe(true);
    expect(search().disabled).toBe(true);
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
    expect(container.textContent).toContain(PROMPT);
  });

  it("offers only resources with fields, and lists the chosen resource's fields", async () => {
    await choose("field-access-module", "staff");
    expect([...select("field-access-resource").options].map((option) => option.value)).toEqual(["", "bank_details", "contact"]);

    await choose("field-access-resource", "bank_details");
    expect(container.textContent).toContain("Account number");
    expect(container.textContent).not.toContain("Phone");
    expect(search().disabled).toBe(false);
  });

  it("clears the resource and the field search when the module changes", async () => {
    await choose("field-access-module", "staff");
    await choose("field-access-resource", "bank_details");
    await typeSearch("account");

    await choose("field-access-module", "payroll");
    expect(select("field-access-resource").value).toBe("");
    expect(search().value).toBe("");
    expect(container.textContent).toContain(PROMPT);
  });

  it("names an unavailable module and gives its reason", async () => {
    const payroll = [...select("field-access-module").options].find((option) => option.value === "payroll");
    expect(payroll?.textContent).toBe("Payroll (not on the current plan)");

    await choose("field-access-module", "payroll");
    expect(container.querySelector('[role="note"]')?.textContent).toBe(PAYROLL_REASON);
  });

  it("keeps an unsaved switch while moving between modules and resources", async () => {
    await choose("field-access-module", "staff");
    await choose("field-access-resource", "bank_details");
    await act(async () => container.querySelector<HTMLButtonElement>('[role="switch"]')!.click());
    expect(saveLabel()).toBe("Save 1 changes");

    await choose("field-access-module", "payroll");
    await choose("field-access-resource", "payslips");
    await choose("field-access-module", "staff");
    await choose("field-access-resource", "contact");

    expect(saveLabel()).toBe("Save 1 changes");
  });

  it("picks the role from the searchable box and drops drafts only on a different role", async () => {
    expect(select("field-access-role").value).toBe("bursar");
    expect([...select("field-access-role").options].map((option) => option.textContent)).toEqual([
      "Choose a role",
      "Bursar",
      "Form Teacher",
    ]);

    await choose("field-access-module", "staff");
    await choose("field-access-resource", "bank_details");
    await act(async () => container.querySelector<HTMLButtonElement>('[role="switch"]')!.click());

    await choose("field-access-role", "bursar");
    expect(saveLabel()).toBe("Save 1 changes");

    await choose("field-access-role", "form-teacher");
    expect(select("field-access-role").value).toBe("form-teacher");
    expect(saveLabel()).toBe("Save changes");
  });
});
