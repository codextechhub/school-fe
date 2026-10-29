/**
 * How long a request may take before the app gives up on it.
 *
 * A stalled connection can leave a request open without ever failing it, and
 * a request that never ends leaves a spinner that never ends. Past this the
 * request is abandoned as TIMEOUT_ERROR, which the interceptor already reports
 * as the server not answering.
 *
 * console-fe keeps the same file; keep the two in step.
 */
// Longer than the API's own 30-second limit on a request, so the app never
// gives up on a save the server is still making.
export const REQUEST_TIMEOUT_MS = 45_000;

/** An upload: imports take files up to 50 MB, which on a slow connection really can take this long. */
export const UPLOAD_TIMEOUT_MS = 300_000;

/** A signal that aborts after `ms`, or none where the browser cannot make one. */
export function timeoutSignal(ms = REQUEST_TIMEOUT_MS): AbortSignal | undefined {
  return typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(ms) : undefined;
}
