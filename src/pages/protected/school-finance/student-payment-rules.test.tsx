import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentPaymentRules } from "@/redux/services/school-finance/student-payment-rules-api";

/**
 * Whether students may pay their own fees, and the smallest part payment.
 *
 * Corona's bursar raises the smallest part payment from ₦1,000 to ₦2,500. The
 * box takes whole naira, as a bursar types it, and the server is sent kobo.
 * Turning payments off sends only the switch, so a minimum set by somebody
 * else is not overwritten by a screen that did not change it.
 */
const RULES: StudentPaymentRules = { enabled: true, min_part_payment: 100_000 };

const save = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/pages/protected/settings/use-settings-write", async (importActual) => ({
  ...(await importActual<typeof import("@/pages/protected/settings/use-settings-write")>()),
  useSettingsWrite: () => ({ canSave: true, reason: null }),
}));
vi.mock("@/redux/services/school-finance/student-payment-rules-api", () => ({
  useGetStudentPaymentRulesQuery: () => ({ data: { data: RULES }, isLoading: false }),
  useUpdateStudentPaymentRulesMutation: () => [save, { isLoading: false }],
}));

import StudentPaymentRulesSettings from "./student-payment-rules";
import { readWholeNaira } from "./whole-naira";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("readWholeNaira", () => {
  it("reads a typed amount with commas as kobo", () => {
    expect(readWholeNaira("2,500")).toEqual({ kobo: 250_000, problem: "" });
  });

  it("refuses a blank, a fraction and a negative amount", () => {
    expect(readWholeNaira(" ").kobo).toBeNull();
    expect(readWholeNaira("1000.50").problem).toBe("Enter a whole number of naira, such as 1,000.");
    expect(readWholeNaira("-5").problem).toBe("Enter a whole number of naira, such as 1,000.");
  });
});

describe("the student payment rules panel", () => {
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
  });

  const saveButton = () =>
    Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    ) as HTMLButtonElement;

  it("shows the minimum in naira and saves a new one as kobo", async () => {
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    const input = container.querySelector("input[inputmode='numeric']") as HTMLInputElement;
    expect(input.value).toBe("1,000");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "2,500");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => saveButton().click());

    expect(save).toHaveBeenCalledWith({ min_part_payment: 250_000 });
  });

  it("keeps both explanations behind their ⓘ, with the box named by its label", async () => {
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    const text = () => document.body.textContent ?? "";
    const input = container.querySelector("input[inputmode='numeric']") as HTMLInputElement;
    expect(input.labels?.[0]?.textContent).toBe("Smallest part payment (₦)");
    expect(text()).not.toContain("Students see a Pay button");
    expect(text()).not.toContain("whole balance of an invoice");
    await act(async () => container.querySelector<HTMLElement>('[aria-label="About Students may pay their own fees"]')!.click());
    expect(text()).toContain("On: students see a Pay button on their invoices.");
    expect(text()).toContain("Off: students see their fees but cannot pay them.");
    await act(async () => container.querySelector<HTMLElement>('[aria-label="About Smallest part payment (₦)"]')!.click());
    expect(text()).toContain("A student can always pay the whole balance of an invoice, however small.");
  });

  it("sends only the switch when payments are turned off", async () => {
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    const toggle = container.querySelector("[role='switch']") as HTMLButtonElement;
    await act(async () => toggle.click());
    await act(async () => saveButton().click());

    expect(save).toHaveBeenCalledWith({ enabled: false });
  });
});
