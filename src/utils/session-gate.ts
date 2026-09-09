/**
 * Pure session-liveness check, shared by the route guards (Authenticated bounces
 * a dead session to /login; Guest bounces a live session away from /login). Kept
 * in one place so the two can never disagree. The opaque refresh cookie is
 * checked asynchronously by the route guards because JavaScript cannot and
 * must not inspect it. Live expiry is handled by useSessionTimeout and the 401
 * interceptor.
 */
import { IDLE_MS, WARNING_MS } from "@/hooks/use-session-timeout";
import { getLastActivity } from "@/utils/session-activity";
import { getAccessToken } from "@/utils/access-token";

// Same constants as the live idle-warning hook, imported so the on-reload check
// can never drift from the in-app behaviour.
const STALE_AFTER_MS = IDLE_MS + WARNING_MS;

export function evaluateGate() {
  const hasAccess = !!getAccessToken();

  // Idle gap longer than the in-app warning window → treat as expired. Skip when
  // no activity has ever been recorded (e.g. a brand-new login on this device)
  // so first-time users aren't immediately bounced.
  const lastActivity = getLastActivity();
  const idleTooLong =
    lastActivity !== null && Date.now() - lastActivity >= STALE_AFTER_MS;

  return {
    shouldRedirect: !hasAccess || idleTooLong,
    refreshExpired: false,
    idleTooLong,
  };
}

/** True when there is a usable, non-expired session right now - the exact
 * inverse of the Authenticated gate's redirect decision. */
export function hasLiveSession(): boolean {
  return !evaluateGate().shouldRedirect;
}
