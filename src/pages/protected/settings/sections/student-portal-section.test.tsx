import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentPortalRules } from "@/redux/services/students/students-types";

/**
 * The student portal rules screen.
 *
 * Brightfield shortens how long students stay signed in to the student app
 * from 30 days to 7. Saving sends only the rule that changed, so a photo rule
 * set elsewhere is not overwritten, and a number of days outside 1 to 90 is
 * refused on the screen.
 */
const RULES: StudentPortalRules = { photo_self_edit: true, session_days: 30 };
const save = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../use-settings-write", async (importActual) => ({
  ...(await importActual<typeof import("../use-settings-write")>()),
  useSettingsWrite: () => ({ canSave: true, reason: null }),
}));
vi.mock("@/redux/services/students/students-api", () => ({
  useGetStudentPortalRulesQuery: () => ({ data: { data: RULES }, isLoading: false }),
  useUpdateStudentPortalRulesMutation: () => [save, { isLoading: false }],
}));

import { readSessionDays } from "./session-days";
import { StudentPortalSection } from "./student-portal-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("readSessionDays", () => {
  it("reads whole days from 1 to 90 and refuses the rest", () => {
    expect(readSessionDays("7")).toEqual({ days: 7, problem: "" });
    for (const typed of ["0", "91", "7.5", ""]) {
      expect(readSessionDays(typed).problem).toBe("Enter a whole number of days, from 1 to 90.");
    }
  });
});

describe("the student portal rules screen", () => {
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

  it("saves only the days when only the days changed", async () => {
    await act(async () => root.render(<StudentPortalSection />));
    const input = container.querySelector("input[inputmode='numeric']") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "7");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const button = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save student portal rules",
    ) as HTMLButtonElement;
    await act(async () => button.click());

    expect(save).toHaveBeenCalledWith({ session_days: 7 });
  });
});
