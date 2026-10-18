import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FeeDuePolicy } from "@/redux/services/school-finance/fee-due-policy-api";

/**
 * When Bright Star School's fee bills fall due.
 *
 * Mrs Bello opens Fee due dates. She sees the four rules, each with the date a
 * bill raised today would carry, and the term those dates were worked out
 * against. Why there is one rule for every branch, and what zero days means,
 * wait behind the ⓘ beside the panel and the box. A school with no session yet
 * is told so on the page, because the dates cannot be shown without one. A
 * number of days the server would refuse is named under the box.
 */
const POLICY: FeeDuePolicy = {
  basis: "DAYS_AFTER",
  basis_display: "Days after the bill",
  days_after: 14,
  options: [
    { value: "DAYS_AFTER", label: "A number of days after the bill", due_if_billed_today: "2026-11-01" },
    { value: "TERM_END", label: "The end of the term billed", due_if_billed_today: "2026-12-15" },
  ],
  resolved_against: { session: "2026/2027", term: "First Term" },
} as unknown as FeeDuePolicy;

const mocks = vi.hoisted(() => ({ policy: null as unknown }));

vi.mock("@/pages/protected/settings/use-settings-write", async (importActual) => ({
  ...(await importActual<typeof import("@/pages/protected/settings/use-settings-write")>()),
  useSettingsWrite: () => ({ canSave: true, reason: null }),
}));
vi.mock("@/hooks/use-school-words", () => ({ useSchoolWords: () => ({ term: "term" }) }));
vi.mock("@/redux/services/school-finance/fee-due-policy-api", () => ({
  useGetFeeDuePolicyQuery: () => ({ data: { data: mocks.policy }, isLoading: false, isError: false }),
  useUpdateFeeDuePolicyMutation: () => [vi.fn(), { isLoading: false }],
}));

import FeeDuePolicySettings from "./fee-due-policy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mocks.policy = POLICY;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const render = () => act(async () => root.render(<FeeDuePolicySettings />));
const page = () => document.body.textContent ?? "";
const open = (label: string) =>
  act(async () => container.querySelector<HTMLElement>(`[aria-label="About ${label}"]`)!.click());

describe("fee due dates", () => {
  it("shows each rule's date and the term it was worked out against", async () => {
    await render();
    expect(container.textContent).toContain("Dates worked out against First Term, 2026/2027.");
    expect(container.textContent).toContain("15 December 2026");
  });

  it("keeps why there is one rule behind the panel's ⓘ", async () => {
    await render();
    expect(page()).not.toContain("sibling at another branch");
    await open("Rule");
    expect(page()).toContain("sibling at another branch are due on the same day");
  });

  it("keeps what zero days means behind the box's ⓘ, with the box named by its label", async () => {
    await render();
    const input = container.querySelector<HTMLInputElement>("input[type='number']")!;
    expect(input.labels?.[0]?.textContent).toBe("Days after the bill");
    expect(page()).not.toContain("Zero means due the day it is raised.");
    await open("Days after the bill");
    expect(page()).toContain("Zero means due the day it is raised.");
  });

  it("names a number of days the server would refuse under the box", async () => {
    await render();
    const input = container.querySelector<HTMLInputElement>("input[type='number']")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "400");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector("[role='alert']")?.textContent).toBe("Enter a whole number of days between 0 and 365.");
  });

  it("says on the page when the school has no session to work dates out against", async () => {
    mocks.policy = { ...POLICY, resolved_against: { session: null, term: null } };
    await render();
    expect(container.querySelector("[role='status']")?.textContent).toContain("no active academic session yet");
  });
});
