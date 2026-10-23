import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RoleHolder } from "@/redux/services/roles/roles-types";

/**
 * Removing people from a role, from the role's own People tab.
 *
 * Lagoon View runs Ikeja (1) and Lekki (2). Mr Obi, the school-wide
 * administrator, opens Teacher, which Ada (Ikeja), Tunde (Lekki) and Mr Obi
 * himself hold. He ticks Ada and Tunde and removes both with one reason: each
 * grant is withdrawn with that reason and one message says so. His own row has no
 * box, so "Select all" can never take away the access he is using. Mrs Bello
 * works at Lekki only, so she sees a box beside Tunde and not beside Ada.
 */
const revoke = vi.fn();
vi.mock("@/redux/services/roles/roles-api", () => ({
  useRevokeRoleAssignmentMutation: () => [revoke],
}));
const toast = { success: vi.fn(), info: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast }));
vi.mock("@/redux/store", () => ({ useAppSelector: () => ({ id: 66 }) }));
vi.mock("@/redux/features/auth/auth-slice", () => ({ selectUser: () => null }));

const WHOLE_SCHOOL = { covers: (_ids: number[]) => true };
const LEKKI_ONLY = { covers: (ids: number[]) => ids.length > 0 && ids.every((id) => id === 2) };
let reader: typeof WHOLE_SCHOOL = WHOLE_SCHOOL;
vi.mock("@/hooks/use-reader-reach", () => ({ useReaderReach: () => reader }));

const { RoleHolders } = await import("./role-holders");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const holder = (id: number, userId: string, name: string, branch: number | null): RoleHolder => ({
  id,
  user_id: userId,
  user_name: name,
  user_email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  branch,
  assignment_status: "ACTIVE",
  assigned_at: "2026-10-01T09:00:00Z",
  assigned_by_name: "Emeka Obi",
});
const ADA = holder(1, "70", "Ada Okafor", 1);
const TUNDE = holder(2, "71", "Tunde Bello", 2);
const OBI = holder(3, "66", "Emeka Obi", null);

describe("RoleHolders", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = (roleKey = "teacher", canRemove = true) =>
    act(async () =>
      root.render(
        <RoleHolders
          roleKey={roleKey}
          roleName="Teacher"
          roleBranchIds={[]}
          holders={[ADA, TUNDE, OBI]}
          canRemove={canRemove}
          branchName={(id) => (id === 1 ? "Ikeja" : "Lekki")}
          reachLabel="School-wide"
        />,
      ),
    );
  const box = (name: string) => document.querySelector<HTMLButtonElement>(`[aria-label="Select ${name}"]`);
  const button = (label: string) =>
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((element) => element.textContent?.trim() === label);
  const confirm = () =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].find((element) => element.textContent?.trim() === "Remove");
  const typeReason = (value: string) =>
    act(async () => {
      const area = document.querySelector("textarea")!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(area, value);
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });

  beforeEach(() => {
    reader = WHOLE_SCHOOL;
    revoke.mockReset();
    Object.values(toast).forEach((spy) => spy.mockReset());
    revoke.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("never offers the reader's own grant, so Select all leaves it alone", async () => {
    await render();
    expect(box("Emeka Obi")?.disabled).toBe(true);
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Select everybody who can be removed"]')!.click());
    expect(container.textContent).toContain("2 selected");
  });

  it("removes everybody ticked with one reason, and says so once", async () => {
    await render();
    await act(async () => box("Ada Okafor")!.click());
    await act(async () => box("Tunde Bello")!.click());
    await act(async () => button("Remove from role")!.click());
    expect(confirm()!.disabled).toBe(true);

    await typeReason("Moved to the bursary");
    await act(async () => confirm()!.click());

    expect(revoke.mock.calls.map(([body]) => body)).toEqual([
      { id: 1, reason_note: "Moved to the bursary" },
      { id: 2, reason_note: "Moved to the bursary" },
    ]);
    expect(toast.success).toHaveBeenCalledWith("2 people removed from Teacher. The record stays on their history.");
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(container.textContent).toContain("Select all");
  });

  it("names whoever the server refused, after removing the rest", async () => {
    revoke
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({}) })
      .mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { message: "Tunde works beyond your branches." } }) });
    await render();
    await act(async () => box("Ada Okafor")!.click());
    await act(async () => box("Tunde Bello")!.click());
    await act(async () => button("Remove from role")!.click());
    await typeReason("Moved");
    await act(async () => confirm()!.click());

    expect(toast.info.mock.calls[0][0]).toMatch(/^Ada Okafor removed from Teacher\. Not removed: Tunde Bello \(/);
  });

  it("stays put and says why when nobody could be removed", async () => {
    revoke.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: "Refused." } }) });
    await render();
    await act(async () => button("Remove")!.click());
    await typeReason("Moved");
    await act(async () => confirm()!.click());

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("We could not remove Ada Okafor"));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it("offers a branch reader only the grants inside her branches", async () => {
    reader = LEKKI_ONLY;
    await render();
    expect(box("Ada Okafor")?.disabled).toBe(true);
    expect(box("Tunde Bello")?.disabled).toBe(false);
  });

  it("offers no removal without the grant key, or on Super Admin", async () => {
    await render("teacher", false);
    expect(box("Ada Okafor")).toBeNull();
    expect(button("Remove")).toBeUndefined();

    await render("xvs_super_admin");
    expect(box("Ada Okafor")).toBeNull();
    expect(container.textContent).toContain("Super Admin is handed over to somebody else, never withdrawn.");
  });
});
