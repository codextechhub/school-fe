import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffNumberPolicy } from "@/redux/services/staff/staff-types";

/**
 * The Add form under Lagoon View's own staff rules.
 *
 * Lagoon View numbers its staff LVS/0001 onwards and requires one for
 * everybody. Its Ikeja Branch issues the next number itself. And since the
 * bursary asked for it, every hire is approved in Workflow before anybody is
 * emailed. These pin what the form says under each rule, where a refusal
 * from the server lands, and what the screen after saving promises.
 */
let policy: StaffNumberPolicy | undefined;
let rules: { hire_requires_approval: boolean } | undefined;
const policyArgs = vi.fn();
const create = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: (m: string) => toastError(m), warning: vi.fn() },
}));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess: {},
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
vi.mock("@/redux/services/academics/academics-api", () => ({
  useGetClassesQuery: () => ({ data: { data: [] } }),
  useGetSubjectsQuery: () => ({ data: { data: [] } }),
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffListQuery: () => ({
    data: { data: [], role_options: [], starting_role: { value: "teacher", label: "Teacher" } },
    isLoading: false,
  }),
  useGetStaffNumberPolicyQuery: (arg: unknown) => {
    policyArgs(arg);
    return { data: policy ? { data: policy } : undefined };
  },
  useGetStaffRulesQuery: () => ({ data: rules ? { data: rules } : undefined }),
  useCreateStaffMutation: () => [create, { isLoading: false }],
  useUpdateStaffMutation: () => [vi.fn()],
  useResendStaffInvitationMutation: () => [vi.fn(), { isLoading: false }],
}));

import AddStaff from "./index";
import { staffNumberField } from "./staff-number-rule";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LVS: StaffNumberPolicy = {
  required: true,
  pattern: "LVS/\\d{4}",
  hint: "Lagoon View numbers staff LVS/ and four digits, as LVS/0042.",
  auto_issue: false,
  source: "school",
  suggestion: "",
};

function labelFor(container: HTMLElement, text: string): HTMLLabelElement | undefined {
  return Array.from(container.querySelectorAll("label")).find(
    (node) => node.textContent?.replace(/\s*\*$/, "").trim() === text,
  );
}

function inputLabelled(container: HTMLElement, text: string): HTMLInputElement {
  const id = labelFor(container, text)?.getAttribute("for");
  return container.querySelector(`#${CSS.escape(id ?? "")}`) as HTMLInputElement;
}

function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function button(container: HTMLElement, text: string): HTMLButtonElement {
  return Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes(text),
  ) as HTMLButtonElement;
}

describe("AddStaff under the school's staff rules", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    create.mockReset();
    toastError.mockReset();
    policyArgs.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    policy = undefined;
    rules = undefined;
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

  async function fillName() {
    await act(async () => {
      type(inputLabelled(container, "First name"), "Musa");
      type(inputLabelled(container, "Last name"), "Bello");
      type(inputLabelled(container, "Email address"), "musa.bello@lagoonview.edu.ng");
    });
  }

  it("marks the Staff ID required and prints the school's hint", async () => {
    policy = LVS;
    await render();

    expect(labelFor(container, "Staff ID")?.textContent).toContain("*");
    expect(container.textContent).toContain(LVS.hint);
    expect(container.textContent).not.toContain("Nothing checks its shape");
  });

  it("refuses a blank or misshapen number before sending it", async () => {
    policy = LVS;
    await render();
    await fillName();

    await act(async () => button(container, "Create and invite").click());
    expect(create).not.toHaveBeenCalled();

    await act(async () => type(inputLabelled(container, "Staff ID"), "LV-42"));
    await act(async () => button(container, "Create and invite").click());
    expect(create).not.toHaveBeenCalled();

    await act(async () => type(inputLabelled(container, "Staff ID"), "LVS/0042"));
    create.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 9, full_name: "Musa Bello" } }),
    });
    await act(async () => button(container, "Create and invite").click());
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toMatchObject({ staff_number: "LVS/0042" });
  });

  it("offers the next number where the school issues them, and lets the box stay blank", async () => {
    policy = { ...LVS, auto_issue: true, suggestion: "LVS/0043" };
    await render();

    expect(inputLabelled(container, "Staff ID").placeholder).toBe("Next: LVS/0043");
    expect(labelFor(container, "Staff ID")?.textContent).not.toContain("*");
    expect(container.textContent).toContain("Leave it blank and LVS/0043 is issued");

    create.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 9, full_name: "Musa Bello" } }),
    });
    await fillName();
    await act(async () => button(container, "Create and invite").click());
    expect(create).toHaveBeenCalledOnce();
  });

  it("puts the server's refusal under the Staff ID box", async () => {
    create.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: {
            success: false,
            message: "Validation failed.",
            error: { detail: { staff_number: ["Somebody at this school already has that staff ID."] } },
          },
        }),
    });
    await render();
    await fillName();
    await act(async () => type(inputLabelled(container, "Staff ID"), "LVS/0001"));
    await act(async () => button(container, "Create and invite").click());

    expect(container.textContent).toContain("Somebody at this school already has that staff ID.");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("says a refusal aloud when the form has no box for it", async () => {
    create.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: {
            success: false,
            message: "Validation failed.",
            error: { detail: { role: ["New staff start as Teacher."] } },
          },
        }),
    });
    await render();
    await fillName();
    await act(async () => button(container, "Create and invite").click());

    expect(toastError).toHaveBeenCalledWith("New staff start as Teacher.");
  });

  it("promises no email when the school approves each hire", async () => {
    rules = { hire_requires_approval: true };
    create.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: { id: 9, full_name: "Musa Bello", email: "musa.bello@lagoonview.edu.ng", awaiting_approval: true },
        }),
    });
    await render();
    expect(container.textContent).toContain("once the hire is approved in Workflow");

    await fillName();
    await act(async () => button(container, "Create and send for approval").click());

    expect(container.textContent).toContain(
      "Added. Their invitation is sent once the hire is approved in Workflow.",
    );
    expect(container.textContent).not.toContain("Invitation sent");
    expect(button(container, "Resend invitation")).toBeUndefined();
  });
});

describe("staffNumberField", () => {
  it("asks for the first number where the school issues them but has none to continue", () => {
    const rule = staffNumberField({ ...LVS, auto_issue: true, suggestion: "" });
    expect(rule.required).toBe(true);
    expect(rule.hint).toContain("has none to continue from yet");
  });

  it("describes a school with no rule as checking only that the ID is unique", () => {
    const rule = staffNumberField({
      required: false, pattern: "", hint: "", auto_issue: false, source: "default", suggestion: "",
    });
    expect(rule.required).toBe(false);
    expect(rule.hint).toContain("only that nobody here already has it");
  });
});
