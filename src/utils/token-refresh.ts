import { clearAccessToken, setAccessToken } from "./access-token";
import { getCsrfToken } from "./csrf";

const baseUrl = import.meta.env.VITE_BACKEND_URL;

export type RefreshOutcome =
  | { ok: true; access: string; sessionId?: number }
  | { ok: false; reason: "no_token" | "token_invalid" | "network_error" | "server_error" };

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * Once a session is torn down, a refresh already in flight must not restore an
 * access credential. A fresh login re-enables refresh in the same tab.
 */
let sessionInvalidated = false;
const RESTORE_BLOCKED_KEY = "_auth_restore_blocked";

export const isSessionRestoreBlocked = (): boolean =>
  localStorage.getItem(RESTORE_BLOCKED_KEY) === "1";

export const blockSessionRestore = (): void => {
  localStorage.setItem(RESTORE_BLOCKED_KEY, "1");
};

export const markSessionInvalidated = (): void => {
  sessionInvalidated = true;
  inFlight = null;
  clearAccessToken();
};

export const resetSessionInvalidation = (): void => {
  sessionInvalidated = false;
  localStorage.removeItem(RESTORE_BLOCKED_KEY);
};

const doRefresh = async (): Promise<RefreshOutcome> => {
  const csrfToken = await getCsrfToken();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/user/auth/token/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: "{}",
    });
  } catch {
    return { ok: false, reason: "network_error" };
  }

  // Only 401 means the refresh token is definitively bad - force re-auth.
  if (response.status === 401) return { ok: false, reason: "token_invalid" };
  // 5xx (and anything else non-ok) is transient: caller should keep the user signed in.
  if (!response.ok) return { ok: false, reason: "server_error" };

  let data: { data?: { access?: string; session_id?: number } };
  try {
    data = await response.json();
  } catch {
    return { ok: false, reason: "server_error" };
  }

  const access = data?.data?.access;
  if (!access) return { ok: false, reason: "server_error" };
  // The session was torn down while this refresh was in flight. Discard the
  // result rather than restoring access for a session the user has left.
  if (sessionInvalidated) return { ok: false, reason: "token_invalid" };

  setAccessToken(access);
  return { ok: true, access, sessionId: data?.data?.session_id };
};

/**
 * Shared single-flight refresh. All concurrent callers in the tab - RTK Query
 * 401 retries, the proactive route-change hook, and the idle "Continue" button
 * - wait on the same in-flight request, so the backend only sees one rotation
 * per window of concurrent activity.
 *
 * The browser sends the HttpOnly refresh cookie and applies its rotation. This
 * module can only see the returned short-lived access credential.
 */
export const refreshTokenSingleFlight = (): Promise<RefreshOutcome> => {
  if (sessionInvalidated || isSessionRestoreBlocked()) {
    return Promise.resolve({ ok: false, reason: "no_token" });
  }
  if (inFlight) return inFlight;

  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
};
