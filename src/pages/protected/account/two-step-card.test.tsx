import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MyTwoStep } from "@/redux/services/auth/auth-types";

/**
 * The two-step card on Account security.
 *
 * The bursar has it on with three backup codes left, and makes ten new ones
 * with a code from her app. A teacher, who does not need it, sees no card.
 */
const state = vi.hoisted(() => ({ mine: null as MyTwoStep | null }));
const renew = vi.fn();

vi.mock("@/redux/services/auth/auth-api", () => ({
  useGetMyTwoStepQuery: () => ({ data: state.mine ? { data: state.mine } : undefined }),
  useRenewMyBackupCodesMutation: () => [renew, { isLoading: false }],
}));

import { TwoStepCard } from "./two-step-card";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("the two-step card", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    renew.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === label)!;

  it("is not shown to someone whose role does not need it and who never set it up", async () => {
    state.mine = { set_up: false, required: false, recovery_codes_left: 0 };
    await act(async () => root.render(<TwoStepCard />));
    expect(container.textContent).toBe("");
  });

  it("tells someone who needs it that they set it up at their next sign-in", async () => {
    state.mine = { set_up: false, required: true, recovery_codes_left: 0 };
    await act(async () => root.render(<TwoStepCard />));
    expect(container.textContent).toContain("the next time you sign in");
  });

  it("says how many backup codes are left, and makes new ones for a code", async () => {
    state.mine = { set_up: true, required: true, recovery_codes_left: 3 };
    renew.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { recovery_codes: ["aaaaa-11111", "bbbbb-22222"] } }),
    });
    await act(async () => root.render(<TwoStepCard />));
    expect(container.textContent).toContain("3 backup codes left.");

    await act(async () => button("Make new backup codes").click());
    const field = container.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "246810");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(renew).toHaveBeenCalledWith({ code: "246810" });
    expect(container.textContent).toContain("aaaaa-11111");
  });
});
