/**
 * Sending somebody to the app their account belongs in, when it is not this one.
 *
 * A sign-in, an activation or a password reset answers `home_app` with that
 * app's address on this same origin (`/parent/` for a parent with no staff
 * role). The parent app keeps its own session from the ordinary refresh cookie
 * the API sets at sign-in, so a parent who signs in here arrives there signed
 * in; this app writes no session for them. After an activation or a reset,
 * which sign nobody in, they are sent to that app's own sign-in.
 */
export type HomeApp = { path: string } | null | undefined;

function base(app: NonNullable<HomeApp>): string {
  return (app.path || "/").replace(/\/?$/, "/");
}

/** Opens the app *app* names, signed in. */
export function openHomeApp(app: NonNullable<HomeApp>): void {
  window.location.assign(base(app));
}

/** Opens the sign-in page of the app *app* names. */
export function openHomeAppSignIn(app: NonNullable<HomeApp>): void {
  window.location.assign(`${base(app)}sign-in`);
}
