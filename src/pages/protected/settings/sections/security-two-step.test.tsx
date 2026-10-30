import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two-step switch in Sign-in and security.
 *
 * Brightfield's head sees it on by default. Turning it off asks first,
 * because the school's accounts and money are then behind passwords alone,
 * and only then saves. A reader who may not change settings sees the switch
 * and cannot move it.
 */
const save = vi.fn();
const write = vi.hoisted(() => ({ canSave: true }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../use-settings-write", async (importActual) => ({
  ...(await importActual<typeof import("../use-settings-write")>()),
  useSettingsWrite: () => ({ canSave: write.canSave, reason: write.canSave ? null : "permission" }),
}));
vi.mock("../use-settings-branches", () => ({
  useSettingsBranches: () => ({ applies: false, wholeSchool: true, choices: [], isLoading: false }),
}));
vi.mock("@/redux/services/school/school-settings-api", () => ({
  useGetSchoolSecuritySettingsQuery: () => ({ currentData: undefined, isError: false }),
  useUpdateSchoolSecuritySettingsMutation: () => [vi.fn(), { isLoading: false }],
  useGetTwoStepSettingQuery: () => ({ data: { data: { required: true, source: "default" } } }),
  useUpdateTwoStepSettingMutation: () => [save, { isLoading: false }],
}));

import { SecuritySection } from "./security-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("the two-step switch", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    write.canSave = true;
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

  const theSwitch = () =>
    container.querySelector<HTMLButtonElement>('button[role="switch"][aria-label^="Ask administrators"]')!;
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === label)!;

  it("is on by default", async () => {
    await act(async () => root.render(<SecuritySection />));
    expect(theSwitch().getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).toContain("On by default");
  });

  it("asks before turning it off, and saves only when told to", async () => {
    await act(async () => root.render(<SecuritySection />));
    await act(async () => theSwitch().click());

    expect(container.textContent).toContain("Turn off two-step sign-in?");
    expect(save).not.toHaveBeenCalled();

    await act(async () => button("Turn it off").click());
    expect(save).toHaveBeenCalledWith({ required: false });
  });

  it("keeps it on when the head changes their mind", async () => {
    await act(async () => root.render(<SecuritySection />));
    await act(async () => theSwitch().click());
    await act(async () => button("Keep it on").click());

    expect(save).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Turn off two-step sign-in?");
  });

  it("cannot be moved by a reader who may not change settings", async () => {
    write.canSave = false;
    await act(async () => root.render(<SecuritySection />));
    expect(theSwitch().disabled).toBe(true);
  });
});
