import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GuardianRules } from "@/redux/services/students/students-types";

/**
 * The parent app rule on the guardian rules screen.
 *
 * Lagoon View gives every guardian the parent app automatically, which it has
 * by default, and has never asked for a guardian email of its own accord. The
 * email switch therefore shows on and locked. When the school turns the parent
 * app rule off, the email switch goes back to its own choice, off, and the
 * save sends both.
 */
const RULES: GuardianRules = {
  min_per_student: 1,
  email_required: false,
  parent_app_auto_access: true,
  binding_email_required: true,
  matching: "EMAIL_THEN_PHONE",
  matching_options: [{ value: "EMAIL_THEN_PHONE", label: "Email, then phone" }],
  extra_relationships: [],
  relationships: [],
};

let rules: GuardianRules = RULES;
const save = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess: {},
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("../use-settings-write", async (importActual) => ({
  ...(await importActual<typeof import("../use-settings-write")>()),
  useSettingsWrite: () => ({ canSave: true, reason: null }),
}));
vi.mock("@/redux/services/students/students-api", () => ({
  useGetGuardianRulesQuery: () => ({ data: { data: rules }, isLoading: false }),
  useUpdateGuardianRulesMutation: () => [save, { isLoading: false }],
}));

import { GuardiansSection } from "./guardians-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const toggle = (label: string) =>
  document.body.querySelector(`[aria-label='${label}']`) as HTMLButtonElement | null;
const button = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;

const PARENT_APP = "Give parents the parent app automatically";
const EMAIL = "Email required for a new guardian";

describe("GuardiansSection parent app rule", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    save.mockReset();
    save.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    rules = RULES;
  });

  const render = () => act(async () => root.render(<GuardiansSection />));

  it("shows the email switch on and locked while the parent app rule is on", async () => {
    await render();

    expect(toggle(PARENT_APP)?.getAttribute("aria-checked")).toBe("true");
    expect(toggle(EMAIL)?.getAttribute("aria-checked")).toBe("true");
    expect(toggle(EMAIL)?.disabled).toBe(true);
    expect(container.textContent).toContain("because the invitation goes to that email");
  });

  it("turns off parent access without submitting an unchanged email rule", async () => {
    await render();
    await act(async () => toggle(PARENT_APP)?.click());

    expect(toggle(EMAIL)?.getAttribute("aria-checked")).toBe("false");
    expect(toggle(EMAIL)?.disabled).toBe(false);

    await act(async () => button("Save guardian rules")?.click());
    expect(save).toHaveBeenCalledWith({ parent_app_auto_access: false });
  });

  it("offers no parent app switch where the server has no such rule", async () => {
    rules = { ...RULES, parent_app_auto_access: undefined, binding_email_required: false };
    await render();

    expect(toggle(PARENT_APP)).toBeNull();
    expect(toggle(EMAIL)?.disabled).toBe(false);
  });
});
