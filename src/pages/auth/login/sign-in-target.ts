import { pathOpensBeforeGoLive } from "@/lib/action-palette/registry";
import { routesPath } from "@/routes/routesPath";

/**
 * Where a successful sign-in lands.
 *
 * A captured deep link (the page somebody was on when their session ended) is
 * honoured when the school may open it. A school that has not gone live
 * reaches only the screens open before go-live, so its home is onboarding
 * rather than the dashboard, and a deep link elsewhere falls back to that
 * home. `pathOpensBeforeGoLive` is the app's one answer to which screens those
 * are, and its own tests check it against every route handle.
 */
export function signInTarget(returnTo: string | null | undefined, isPending: boolean): string {
  const home = isPending
    ? routesPath.PROTECTED.ONBOARDING.WELCOME
    : routesPath.PROTECTED.OVERVIEW.INDEX;
  if (!returnTo) return home;
  return !isPending || pathOpensBeforeGoLive(returnTo) ? returnTo : home;
}
