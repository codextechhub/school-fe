import { getCsrfToken } from "./csrf";

const baseUrl = import.meta.env.VITE_BACKEND_URL;

/**
 * Where this page leaves the account it hands to the student app.
 *
 * The student app (`student-fe`) is served at `/student/` on this same origin,
 * so sessionStorage carries the value across the page change in the same tab.
 * Only the opaque device account travels: the pupil's credential is the
 * httpOnly cookie the API sets during the hand-over, and the student app gets
 * its own access token from it. student-fe reads this key; the two must agree.
 */
export const STUDENT_APP_HANDOVER_KEY = "xvs.student.handover";

/** The student app's address, as a sign-in or a link preview names it for a pupil. */
export type DeviceApp = { path: string } | null | undefined;

/**
 * Moves a pupil's fresh browser sign-in to the student app and opens it.
 *
 * A pupil who signs in here, or who has just activated their account here,
 * belongs in the student app, which keeps them signed in for weeks and lets a
 * shared phone hold several pupils. The API revokes the browser session,
 * clears its cookie and sets the student app's cookie in one step, so nothing
 * of the pupil's sign-in is left with this app.
 *
 * Resolves false when the hand-over is refused (the browser session has
 * already ended, say); the caller then sends the pupil to the student app's
 * own sign-in instead.
 */
export async function handOverToStudentApp(): Promise<boolean> {
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
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { data?: { account?: string; app_path?: string } };
    const account = body.data?.account;
    if (!account) return false;
    sessionStorage.setItem(STUDENT_APP_HANDOVER_KEY, account);
    window.location.assign(body.data?.app_path || "/student/");
    return true;
  } catch {
    return false;
  }
}

/**
 * The student app's own sign-in, for a pupil whose hand-over could not happen
 * or who has just reset their password.
 *
 * Opened as "add a pupil", so on a phone where a brother or sister is already
 * signed in the pupil gets a sign-in form rather than the other child's home.
 * With nobody signed in it is the plain sign-in.
 */
export function openStudentAppSignIn(app: DeviceApp): void {
  const base = (app?.path || "/student/").replace(/\/?$/, "/");
  window.location.assign(`${base}sign-in?add=1`);
}
