import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { AsAtContext } from "@/lib/as-at";
import type { GuardianDetail, PortalAccess } from "@/redux/services/students/students-types";

/**
 * The Parent app access panel on a guardian's record.
 *
 * Mrs. Adaeze Nwosu is the mother of Chiamaka and Tobi at Brightfield. The
 * panel says where her own sign-in to the parent app stands and offers the
 * matching action to a role that holds the portal access key. A role whose
 * Field Access hides portal access sees no panel at all; a day in the record's
 * history shows the state with no controls.
 */
const ADAEZE = {
  id: 31,
  first_name: "Adaeze",
  full_name: "Adaeze Nwosu",
  email: "adaeze.nwosu@example.ng",
  wards: [],
} as unknown as GuardianDetail;

let block: PortalAccess = {};
let fieldAccess: FieldAccessMap = {};
let holdsKey = true;
const give = vi.fn();
const resend = vi.fn();
const takeAway = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => holdsKey,
    hasAnyPermission: () => holdsKey,
    hasAllPermissions: () => holdsKey,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-capabilities", () => ({
  useCapabilities: () => ({ hasCapability: () => true }),
}));
vi.mock("@/redux/services/students/portal-access-api", () => ({
  useGetGuardianPortalAccessQuery: () => ({ data: { data: block }, isLoading: false }),
  useGiveGuardianPortalAccessMutation: () => [give, { isLoading: false }],
  useResendGuardianPortalInvitationMutation: () => [resend, { isLoading: false }],
  useTakeAwayGuardianPortalAccessMutation: () => [takeAway, { isLoading: false }],
}));

import { ParentAppAccessPanel } from "./parent-app-access-panel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const button = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;

const lastButton = (text: string) =>
  Array.from(document.body.querySelectorAll("button"))
    .filter((b) => b.textContent?.trim() === text)
    .pop() as HTMLButtonElement | undefined;

describe("ParentAppAccessPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    for (const fn of [give, resend, takeAway]) {
      fn.mockReset();
      fn.mockReturnValue({ unwrap: () => Promise.resolve({ message: "Done." }) });
    }
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    block = {};
    fieldAccess = {};
    holdsKey = true;
  });

  const render = (asAt?: string) =>
    act(async () =>
      root.render(
        <AsAtContext.Provider value={asAt}>
          <ParentAppAccessPanel guardian={ADAEZE} />
        </AsAtContext.Provider>,
      ),
    );

  it("offers the parent app to a guardian who has none, and gives it after the confirm", async () => {
    block = { status: "none", has_access: false, sign_in_identifiers: { email: "adaeze.nwosu@example.ng" } };
    await render();

    expect(container.textContent).toContain("Adaeze Nwosu has no sign-in for the parent app.");
    expect(container.textContent).toContain("adaeze.nwosu@example.ng");
    await act(async () => button("Give parent app access")?.click());
    await act(async () => button("Give access")?.click());
    expect(give).toHaveBeenCalledWith(31);
  });

  it("offers a resend and a take-away to an invited guardian", async () => {
    block = { status: "invited", has_access: true, invitation_expires_at: "2026-10-23T09:00:00Z" };
    await render();

    await act(async () => button("Resend invitation")?.click());
    expect(resend).toHaveBeenCalledWith(31);
    await act(async () => button("Take away access")?.click());
    await act(async () => lastButton("Take away access")?.click());
    expect(takeAway).toHaveBeenCalledWith(31);
  });

  it("says access was taken away and offers it again", async () => {
    block = { status: "revoked", has_access: false };
    await render();

    expect(container.textContent).toContain("Adaeze Nwosu's access to the parent app was taken away.");
    expect(button("Give access again")).toBeDefined();
  });

  it("shows no panel to a role whose Field Access hides portal access", async () => {
    block = { status: "active", has_access: true };
    fieldAccess = { [FIELD_RESOURCE.GUARDIANS]: { hidden: ["portal_access"], read_only: [] } };
    await render();

    expect(container.textContent).toBe("");
  });

  it("shows the state but no controls to a role without the portal access key", async () => {
    block = { status: "none", has_access: false };
    holdsKey = false;
    await render();

    expect(container.textContent).toContain("Parent app access");
    expect(button("Give parent app access")).toBeUndefined();
  });

  it("shows no controls on a day in the record's history", async () => {
    block = { status: "none", has_access: false };
    await render("2026-09-01");

    expect(container.textContent).toContain("Parent app access");
    expect(button("Give parent app access")).toBeUndefined();
  });
});
