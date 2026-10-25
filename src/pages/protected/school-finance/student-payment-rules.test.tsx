import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentPaymentRules } from "@/redux/services/school-finance/student-payment-rules-api";

/**
 * Whether students may pay their own fees, whether families may pay by card,
 * and the smallest card part payment.
 *
 * Corona's bursar switches card on for parents who pay from abroad, then
 * raises the smallest part payment from ₦1,000 to ₦2,500. The box takes whole
 * naira, as a bursar types it, and the server is sent kobo. Turning payments
 * off sends only the switch, so a minimum set by somebody else is not
 * overwritten by a screen that did not change it. A branch-bound bursar reads
 * the card switch but cannot change it, and a refusal from the server is
 * named as a whole-school matter.
 */
let rules: StudentPaymentRules = { enabled: true, min_part_payment: 100_000, family_card_payments: true };
let write: { canSave: boolean; reason: "permission" | "reach" | null } = { canSave: true, reason: null };

const save = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/pages/protected/settings/use-settings-write", async (importActual) => ({
  ...(await importActual<typeof import("@/pages/protected/settings/use-settings-write")>()),
  useSettingsWrite: () => write,
}));
vi.mock("@/redux/services/school-finance/student-payment-rules-api", () => ({
  useGetStudentPaymentRulesQuery: () => ({ data: { data: rules }, isLoading: false }),
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
    rules = { enabled: true, min_part_payment: 100_000, family_card_payments: true };
    write = { canSave: true, reason: null };
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
    expect(input.labels?.[0]?.textContent).toBe("Minimum card part-payment (₦)");
    expect(text()).not.toContain("Students see a Pay button");
    expect(text()).not.toContain("whole balance of an invoice");
    await act(async () => container.querySelector<HTMLElement>('[aria-label="About Students may pay their own fees"]')!.click());
    expect(text()).toContain("On: students see a Pay button on their invoices.");
    expect(text()).toContain("Off: students see their fees but cannot pay them.");
    await act(async () => container.querySelector<HTMLElement>('[aria-label="About Minimum card part-payment (₦)"]')!.click());
    expect(text()).toContain("A payer can always pay the whole balance of an invoice, however small.");
  });

  const cardSwitch = () =>
    container.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Card payments for families"]') ??
    Array.from(container.querySelectorAll<HTMLButtonElement>("[role='switch']"))[1];
  const minimumBox = () => container.querySelector("input[inputmode='numeric']");

  it("reads card as off by default and sends only the switch when it is turned on", async () => {
    rules = { ...rules, family_card_payments: false };
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    expect(cardSwitch().getAttribute("aria-checked")).toBe("false");
    await act(async () => cardSwitch().click());
    await act(async () => saveButton().click());

    expect(save).toHaveBeenCalledWith({ family_card_payments: true });
  });

  it("shows the minimum part-payment only while card is on", async () => {
    rules = { ...rules, family_card_payments: false };
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    expect(minimumBox()).toBeNull();
    await act(async () => cardSwitch().click());
    expect(minimumBox()).not.toBeNull();
    await act(async () => cardSwitch().click());
    expect(minimumBox()).toBeNull();
  });

  it("explains card in plain words behind its ⓘ", async () => {
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    await act(async () => container.querySelector<HTMLElement>('[aria-label="About Card payments for families"]')!.click());
    const text = document.body.textContent ?? "";
    expect(text).toContain("Off: parents and pupils pay fees by bank transfer to each pupil's own account number, inside the app.");
    expect(text).toContain("On: they can also pay by card. Turn it on if many of your parents pay from abroad.");
  });

  it("is read-only for a branch-bound bursar, with one whole-school line and no Save button", async () => {
    write = { canSave: false, reason: "reach" };
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    expect(cardSwitch().getAttribute("aria-checked")).toBe("true");
    expect(cardSwitch().disabled || cardSwitch().getAttribute("aria-disabled") === "true").toBe(true);
    expect((minimumBox() as HTMLInputElement).disabled).toBe(true);
    expect(saveButton()).toBeUndefined();
    const text = container.textContent ?? "";
    expect(text).toContain("a whole-school finance administrator can change them.");
    expect(text).not.toContain("school administrator's to do");
    expect(text.match(/You can read/g)).toHaveLength(1);
  });

  it("tells a reader with no update permission only that the school administrator changes it", async () => {
    write = { canSave: false, reason: "permission" };
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    expect(saveButton()).toBeUndefined();
    const text = container.textContent ?? "";
    expect(text).toContain("Changing them is the school administrator's to do.");
    expect(text).not.toContain("whole-school finance administrator");
    expect(text.match(/You can read/g)).toHaveLength(1);
  });

  it("names a 403 from the server as a whole-school matter", async () => {
    const { toast } = await import("sonner");
    save.mockReturnValue({ unwrap: () => Promise.reject({ status: 403, data: {} }) });
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    await act(async () => cardSwitch().click());
    await act(async () => saveButton().click());

    expect(toast.error).toHaveBeenCalledWith(
      "Only a whole-school finance administrator can change these rules. Nothing was saved.",
    );
  });

  it("sends only the switch when payments are turned off", async () => {
    await act(async () => root.render(<StudentPaymentRulesSettings />));
    const toggle = container.querySelector("[role='switch']") as HTMLButtonElement;
    await act(async () => toggle.click());
    await act(async () => saveButton().click());

    expect(save).toHaveBeenCalledWith({ enabled: false });
  });
});
