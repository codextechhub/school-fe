import { act, type ChangeEventHandler } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogueModule, CataloguePermission } from "@/redux/services/roles/roles-types";

/**
 * The permission picker narrows by Module, then Resource, before it lists.
 *
 * Lagoon View's administrator opens a new role. Nothing is chosen for her, so
 * she cannot tick a box under a resource she never picked. She picks Academics,
 * then Calendar, and its permissions appear. Switching to Payroll, which the
 * school has not bought, clears Calendar, says why Payroll is locked, and still
 * shows its permissions with boxes that cannot be ticked.
 *
 * `SearchSelect` is replaced by a plain select: the behaviour under test is the
 * picker's, and the combobox widget is exercised in the running app.
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

import { AccessCataloguePicker } from "./access-catalogue-picker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const permission = (
  key: string,
  label: string,
  unavailableReason: string | null = null,
): CataloguePermission => ({
  key,
  label,
  resource: key.split(".").slice(0, 2).join("."),
  action: key.split(".")[2],
  sensitivity: "NORMAL",
  is_restricted: false,
  capability: null,
  available: unavailableReason === null,
  band: null,
  depth_label: null,
  unavailable_reason: unavailableReason,
});

const PAYROLL_REASON = "Payroll is not part of this school's plan.";

const CATALOGUE: CatalogueModule[] = [
  {
    module: "academics",
    label: "Academics",
    available: true,
    resources: [
      {
        resource: "calendar",
        label: "Calendar",
        available: true,
        fields: [],
        permissions: [
          permission("academics.calendar.view", "View calendar"),
          permission("academics.calendar.delete", "Manage calendar"),
        ],
      },
      {
        resource: "classes",
        label: "Classes",
        available: true,
        fields: [],
        permissions: [permission("academics.classes.view", "View classes")],
      },
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
        fields: [],
        permissions: [permission("payroll.payslips.generate", "Generate payslips", PAYROLL_REASON)],
      },
    ],
  },
];

describe("AccessCataloguePicker", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = (selected = new Set<string>(), onToggle = vi.fn()) =>
    act(async () => {
      root.render(<AccessCataloguePicker modules={CATALOGUE} selected={selected} onToggle={onToggle} />);
    });
  const select = (id: string) => container.querySelector<HTMLSelectElement>(`#${id}`)!;
  const choose = (id: string, value: string) =>
    act(async () => {
      const element = select(id);
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  const search = () => container.querySelector<HTMLInputElement>('input[placeholder="Search permission labels"]');
  const typeSearch = (value: string) =>
    act(async () => {
      const input = search()!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  // A permission row is a label holding a checkbox, whatever attributes it carries.
  const listed = () =>
    [...container.querySelectorAll("label")]
      .filter((row) => row.querySelector('[role="checkbox"]'))
      .map((row) => row.textContent);
  const PROMPT = "Choose a module, then a resource, to see its permissions.";

  it("keeps Resource disabled and lists nothing until a module is chosen", async () => {
    await render();

    expect(select("access-catalogue-module").value).toBe("");
    expect(select("access-catalogue-resource").disabled).toBe(true);
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(0);
    expect(search()).toBeNull();
    expect(container.textContent).toContain(PROMPT);
  });

  it("lists a resource's permissions once a module and then a resource are chosen", async () => {
    await render();

    await choose("access-catalogue-module", "academics");
    expect(select("access-catalogue-resource").disabled).toBe(false);
    expect(container.textContent).toContain(PROMPT);
    expect(listed()).toEqual([]);

    await choose("access-catalogue-resource", "calendar");
    expect(container.textContent).not.toContain(PROMPT);
    expect(listed()).toEqual(["View calendar", "Manage calendar"]);
  });

  it("clears the resource and the permission search when the module changes", async () => {
    await render();
    await choose("access-catalogue-module", "academics");
    await choose("access-catalogue-resource", "calendar");
    await typeSearch("manage");
    expect(listed()).toEqual(["Manage calendar"]);

    await choose("access-catalogue-module", "payroll");
    expect(select("access-catalogue-resource").value).toBe("");
    expect(container.textContent).toContain(PROMPT);

    await choose("access-catalogue-module", "academics");
    await choose("access-catalogue-resource", "calendar");
    expect(search()!.value).toBe("");
    expect(listed()).toEqual(["View calendar", "Manage calendar"]);
  });

  it("names an unavailable module, gives its reason, and locks its permissions", async () => {
    await render();

    const payrollOption = [...select("access-catalogue-module").options].find((option) => option.value === "payroll");
    expect(payrollOption?.textContent).toBe("Payroll (not on the current plan)");

    await choose("access-catalogue-module", "payroll");
    expect(container.querySelector('[role="note"]')?.textContent).toBe(PAYROLL_REASON);

    await choose("access-catalogue-resource", "payslips");
    expect(listed()[0]).toContain("Generate payslips");
    const box = container.querySelector<HTMLButtonElement>('[role="checkbox"]')!;
    expect(box.disabled).toBe(true);
  });

  it("leaves ticked permissions with the caller when the module changes", async () => {
    const onToggle = vi.fn();
    await render(new Set(["academics.calendar.view"]), onToggle);
    await choose("access-catalogue-module", "academics");
    await choose("access-catalogue-resource", "calendar");
    expect(container.querySelector('[role="checkbox"]')?.getAttribute("aria-checked")).toBe("true");

    await choose("access-catalogue-module", "payroll");
    await choose("access-catalogue-module", "academics");
    await choose("access-catalogue-resource", "calendar");

    expect(onToggle).not.toHaveBeenCalled();
    expect(container.querySelector('[role="checkbox"]')?.getAttribute("aria-checked")).toBe("true");
  });
});
