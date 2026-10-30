import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PromotionRules } from "@/redux/services/students/students-types";

/**
 * The promotion pass mark on the promotion rules screen.
 *
 * Brightfield's registrar sets 50% as a guide for whoever records promotion
 * outcomes. Saving sends the mark only when it changed, so saving another rule
 * leaves a mark set elsewhere alone; clearing the box sends null; a mark
 * outside 1 to 100 is refused on the screen with the server's own sentence.
 */
const RULES: PromotionRules = {
  suspended: "HOLD",
  not_placed: "HOLD",
  arms: "SAME_ARM",
  capacity_mode: "FOLLOW_ENROLMENT",
  effective_capacity_mode: "WARN",
  enrolment_capacity_mode: "WARN",
  pass_mark: null,
  options: { suspended: [], not_placed: [], arms: [], capacity_mode: [] },
};

let rules: PromotionRules = RULES;
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
  useGetPromotionRulesQuery: () => ({ data: { data: rules }, isLoading: false }),
  useUpdatePromotionRulesMutation: () => [save, { isLoading: false }],
}));

import { readPassMark } from "./pass-mark";
import { PromotionSection } from "./promotion-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const button = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("readPassMark", () => {
  it("reads a blank box as no pass mark", () => {
    expect(readPassMark("  ")).toEqual({ value: null, problem: "" });
  });

  it("reads a whole percentage", () => {
    expect(readPassMark("50")).toEqual({ value: 50, problem: "" });
  });

  it("refuses a mark outside 1 to 100 and a fraction", () => {
    expect(readPassMark("0").problem).toBe("A pass mark is between 1% and 100%.");
    expect(readPassMark("101").problem).toBe("A pass mark is between 1% and 100%.");
    expect(readPassMark("49.5").problem).toBe(
      "Give the pass mark as a whole percentage, such as 50.",
    );
  });
});

describe("the pass mark panel", () => {
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

  const passMarkInput = () =>
    container.querySelector("input[type='number']") as HTMLInputElement;

  it("saves a new pass mark", async () => {
    await act(async () => root.render(<PromotionSection />));
    await type(passMarkInput(), "50");
    await act(async () => button("Save promotion rules")?.click());

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toMatchObject({ pass_mark: 50 });
  });

  it("leaves the pass mark out when only another rule changed", async () => {
    rules = { ...RULES, pass_mark: 50 };
    await act(async () => root.render(<PromotionSection />));
    const spread = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Spread across the arms"),
    ) as HTMLButtonElement;
    await act(async () => spread.click());
    await act(async () => button("Save promotion rules")?.click());

    expect(save.mock.calls[0][0]).not.toHaveProperty("pass_mark");
    expect(save.mock.calls[0][0]).toMatchObject({ arms: "SPREAD" });
  });

  it("clears a pass mark with null", async () => {
    rules = { ...RULES, pass_mark: 50 };
    await act(async () => root.render(<PromotionSection />));
    await type(passMarkInput(), "");
    await act(async () => button("Save promotion rules")?.click());

    expect(save.mock.calls[0][0]).toMatchObject({ pass_mark: null });
  });

  it("refuses a mark out of range on the screen and saves nothing", async () => {
    await act(async () => root.render(<PromotionSection />));
    await type(passMarkInput(), "120");

    expect(container.textContent).toContain("A pass mark is between 1% and 100%.");
    expect(button("Save promotion rules")?.disabled).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });
});
