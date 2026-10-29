import { getCsrfToken } from "./csrf";
import { timeoutSignal } from "./request-timeout";

const baseUrl = import.meta.env.VITE_BACKEND_URL;

/** The app at `path` (`/student/`, `/parent/`) that an account's sign-in belongs in, as the API names it. */
export type DeviceApp = { path: string } | null | undefined;

const STUDENT_APP_PATH = "/student/";

/** `/parent/` from `/parent/anything`, with a leading and a trailing slash. */
function appBase(path: string | undefined): string {
  const segment = (path || STUDENT_APP_PATH).split("/").filter(Boolean)[0];
  return `/${segment || "student"}/`;
}

/**
 * Where this page leaves the account it hands to a device app.
 *
 * Each app is served on this same origin under its own path (`/student/`,
 * `/parent/`), so sessionStorage carries the value across the page change in
 * the same tab. The key is named for the app's first path segment, so the
 * student app reads `xvs.student.handover` and the parent app reads
 * `xvs.parent.handover`. Each app reads its own key; the names must agree.
 */
export function handoverKey(path: string | undefined): string {
  return `xvs.${appBase(path).replaceAll("/", "")}.handover`;
}

/** The student app's key, kept as a constant for the code that names it directly. */
export const STUDENT_APP_HANDOVER_KEY = handoverKey(STUDENT_APP_PATH);

/**
 * Moves a fresh browser sign-in to the device app the account belongs to and
 * opens it.
 *
 * A pupil or a parent who signs in here, or who has just activated their
 * account here, belongs in their own app, which keeps them signed in for weeks
 * (and on a shared phone lets the student app hold several pupils). The API
 * revokes the browser session, clears its cookie and sets the app's cookie in
 * one step, and names the app in its answer, so nothing of the sign-in is left
 * with this app. Only the opaque device account travels: the credential is the
 * httpOnly cookie, and the app gets its own access token from it.
 *
 * `app` is the address the sign-in answered with; it is used only when the
 * hand-over answer names none. Resolves false when the hand-over is refused
 * (the browser session has already ended, say); the caller then sends the
 * person to the app's own sign-in instead.
 */
export async function handOverToDeviceApp(app?: DeviceApp): Promise<boolean> {
  const csrf = await getCsrfToken();
  try {
    const response = await fetch(`${baseUrl}/user/auth/device/hand-over/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: "{}",
      signal: timeoutSignal(),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { data?: { account?: string; app_path?: string } };
    const account = body.data?.account;
    if (!account) return false;
    const path = appBase(body.data?.app_path || app?.path);
    sessionStorage.setItem(handoverKey(path), account);
    window.location.assign(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * The device app's own sign-in, for an account whose hand-over could not
 * happen or who has just activated or reset their password.
 *
 * The student app is opened as "add a pupil", so on a phone where a brother or
 * sister is already signed in the pupil gets a sign-in form rather than the
 * other child's home; with nobody signed in it is the plain sign-in. The
 * parent app has one account per browser and takes no such flag.
 */
export function openDeviceAppSignIn(app: DeviceApp): void {
  const base = appBase(app?.path);
  const add = base === STUDENT_APP_PATH ? "?add=1" : "";
  window.location.assign(`${base}sign-in${add}`);
}
