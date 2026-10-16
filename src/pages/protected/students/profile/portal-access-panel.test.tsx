import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { PortalAccess, StudentDetail } from "@/redux/services/students/students-types";

/**
 * The Portal access panel on a pupil's profile.
 *
 * Chiamaka Nwosu (BFS/2025/0142) is on the roll at Brightfield. The panel says
 * where her own sign-in stands and offers the matching action to a role that
 * holds the portal access key. A role whose Field Access hides portal access
 * sees no panel at all, and one that may not read the student number sees the
 * panel without it.
 */
const CHIAMAKA = {
  id: 7,
  first_name: "Chiamaka",
  full_name: "Chiamaka Nwosu",
  status: "ACTIVE",
  email: "chiamaka.n@example.ng",
  branch: 1,
} as unknown as StudentDetail;

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
vi.mock("@/hooks/use-school-display", () => ({
  useSchoolDisplay: () => ({ prefs: undefined }),
}));
vi.mock("@/redux/services/students/portal-access-api", () => ({
  useGetPortalAccessQuery: () => ({ data: { data: block }, isLoading: false }),
  useGivePortalAccessMutation: () => [give, { isLoading: false }],
  useResendPortalInvitationMutation: () => [resend, { isLoading: false }],
  useTakeAwayPortalAccessMutation: () => [takeAway, { isLoading: false }],
}));

import { PortalAccessPanel } from "./portal-access-panel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const button = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;

/** The last button with this label: the confirm dialog's, when the panel shares it. */
const lastButton = (text: string) =>
  Array.from(document.body.querySelectorAll("button"))
    .filter((b) => b.textContent?.trim() === text)
    .pop() as HTMLButtonElement | undefined;

describe("PortalAccessPanel", () => {
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

  const render = (student: StudentDetail = CHIAMAKA) =>
    act(async () => root.render(<PortalAccessPanel student={student} />));

  it("offers access to a pupil who has none, and gives it after the confirm", async () => {
    block = {
      status: "none",
      has_access: false,
      sign_in_identifiers: { admission_number: "BFS/2025/0142", email: "" },
    };
    await render();

    expect(container.textContent).toContain("Chiamaka has no sign-in for the student portal.");
    await act(async () => button("Give portal access")?.click());
    await act(async () => button("Give access")?.click());
    expect(give).toHaveBeenCalledWith(7);
  });

  it("offers a resend and a take-away to an invited pupil", async () => {
    block = { status: "invited", has_access: true, invitation_expires_at: "2026-10-23T09:00:00Z" };
    await render();

    await act(async () => button("Resend invitation")?.click());
    expect(resend).toHaveBeenCalledWith(7);
    await act(async () => button("Take away access")?.click());
    await act(async () => lastButton("Take away access")?.click());
    expect(takeAway).toHaveBeenCalled();
  });

  it("lists the admission number and email the pupil signs in with", async () => {
    block = {
      status: "active",
      has_access: true,
      sign_in_identifiers: { admission_number: "BFS/2025/0142", email: "chiamaka.n@example.ng" },
    };
    await render();

    expect(container.textContent).toContain("BFS/2025/0142");
    expect(container.textContent).toContain("chiamaka.n@example.ng");
  });

  it("shows no panel to a role whose Field Access hides portal access", async () => {
    block = { status: "active", has_access: true };
    fieldAccess = { [FIELD_RESOURCE.STUDENTS]: { hidden: ["portal_access"], read_only: [] } };
    await render();

    expect(container.textContent).toBe("");
  });

  it("shows no panel when the server sends an empty block", async () => {
    block = {};
    await render();

    expect(container.textContent).toBe("");
  });

  it("shows the state but no controls to a role without the portal access key", async () => {
    block = { status: "none", has_access: false };
    holdsKey = false;
    await render();

    expect(container.textContent).toContain("Portal access");
    expect(button("Give portal access")).toBeUndefined();
  });

  it("offers no grant to a pupil off the roll", async () => {
    block = { status: "none", has_access: false };
    await render({ ...CHIAMAKA, status: "WITHDRAWN" } as StudentDetail);

    expect(button("Give portal access")).toBeUndefined();
    expect(container.textContent).toContain("Only a student on the roll can be given portal access.");
  });
});
