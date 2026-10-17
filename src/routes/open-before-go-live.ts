import type { DashboardHandle } from "@/components/layout/dashboard-layout";

type GoLiveHandle = Pick<DashboardHandle, "onboarding" | "pendingSurface">;

/**
 * True when the matched screen is open to a school that has not gone live: an
 * onboarding screen, or one whose route declares `pendingSurface`.
 *
 * The handles merge from the outermost route in, so the deepest one that says
 * wins, which is how the dashboard shell reads them too. The shell uses this to
 * decide whether to draw the page or the closed-school notice, and the request
 * layer uses it to tell a closed screen from a closed background read: on a
 * screen that is open, a read answered `TENANT_NOT_LIVE` was asked by something
 * around the page (the header, the sidebar, a panel), not by the page itself.
 *
 * Read off the handles rather than the address, because open screens live
 * outside `/onboarding` too: Notifications, Support, Account security.
 */
export function isOpenBeforeGoLive(matches: readonly { handle?: unknown }[]): boolean {
  const merged = matches.reduce<GoLiveHandle>(
    (acc, match) => ({ ...acc, ...((match.handle as GoLiveHandle | undefined) ?? {}) }),
    {},
  );
  return !!(merged.onboarding || merged.pendingSurface);
}
