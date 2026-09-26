import { userFacingMessage } from "./user-facing-message";

/**
 * api-error - read the platform's error envelope off an RTK Query rejection.
 *
 * Every backend refusal arrives as
 *   { success: false, message: string, error: { code: string, detail: object } }
 * and RTK Query wraps it as `{ status, data }` for an HTTP failure or
 * `{ status: "FETCH_ERROR" | ..., error }` for a transport one.
 *
 * Screens that render a refusal INLINE (rather than letting the base query's
 * global toast handle it) need three things from that shape: the machine code,
 * so they can branch; the sentence, so they can show it; and sometimes the
 * detail, which is where the two refusals that carry one put it. Reading it by
 * hand at each call site is how a page ends up printing "TASK_CONDITION_NOT_MET"
 * at a school admin, so it is read here instead.
 */

/** The parsed refusal. Every field may be absent - transport failures have none. */
export interface ApiError {
  /** HTTP status, or the transport failure kind ("FETCH_ERROR", …). */
  status: number | string | undefined;
  /** Machine code, e.g. "TASK_CONDITION_NOT_MET". Empty when the body had none. */
  code: string;
  /** The server's human sentence, already phrased for the reader. */
  message: string;
  /** `error.detail` - the payload the two refusals that need one carry. */
  detail: Record<string, unknown>;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** Parse any RTK Query error (or anything else) into the envelope's parts. */
export function parseApiError(error: unknown): ApiError {
  const outer = asRecord(error);
  const body = asRecord(outer.data);
  const inner = asRecord(body.error);
  return {
    status: outer.status as number | string | undefined,
    // `code` sits inside `error` for domain refusals and at the top level for
    // `error_response(code=…)`. Both spellings are in the backend today.
    code: asString(inner.code) || asString(body.code),
    message: userFacingMessage(asString(body.message)),
    detail: asRecord(inner.detail),
  };
}

/** True when the rejection carries exactly this machine code. */
export function isApiCode(error: unknown, code: string): boolean {
  return parseApiError(error).code === code;
}

/**
 * The sentence to show a person, never a machine code.
 *
 * A SCREAMING_SNAKE `message` is a backend slip, not copy; it falls back rather
 * than being printed.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const { message } = parseApiError(error);
  if (!message) return fallback;
  if (/^[A-Z][A-Z0-9_]{3,}$/.test(message.trim())) return fallback;
  return message;
}

/**
 * The most specific sentence the server gave, for a screen with no field to
 * put it under.
 *
 * The server builds `message` from a serializer's field errors, but when
 * several fields fail it prefixes each with its field name ("branch: …;
 * class: …"). Reading the first field detail instead gives the one plain
 * sentence that says what to do: "This school has more than one branch, so
 * say which one."
 *
 * So: a field detail wins, then the server's message, then the fallback.
 */
export function apiDetailMessage(error: unknown, fallback: string): string {
  const first = Object.values(fieldErrors(error))[0];
  if (first) return first;
  return apiErrorMessage(error, fallback);
}

/**
 * The sentence for a WRITE that failed, which has two cases the read path does
 * not care about.
 *
 * **An expired session is not a rejected edit.** A 401 on a save produced
 * "We could not save that." - which reads as "the server refused your change"
 * and sends somebody retyping a correction that was never the problem. It
 * happened for real: a guardian edit failed with that message while the PATCH
 * and the refetch behind it were both answering 401 because the token had
 * aged out.
 *
 * **A 403 is not a fault either.** It means this account may not do this, and
 * saying so beats a generic failure the reader will retry.
 *
 * Everything else falls through to the field detail, the server's own message,
 * and then the caller's fallback, exactly as before.
 */
export function writeErrorMessage(error: unknown, fallback: string): string {
  const { status } = parseApiError(error);
  if (status === 401) {
    return "Your session has expired. Sign in again, then retry - nothing was saved.";
  }
  if (status === 403) {
    return "You do not have permission to make that change.";
  }
  return apiDetailMessage(error, fallback);
}

/**
 * Keys DRF puts in `detail` that name no input.
 *
 * `detail` wraps every refusal raised as an exception rather than by a
 * serializer (a 403, a 404, a throttle), and `non_field_errors` holds a
 * serializer's whole-object objection. Read as fields, both land under a key
 * no form renders, and the form shows nothing at all.
 */
const NOT_A_FIELD = new Set(["detail", "non_field_errors"]);

/**
 * DRF's per-field validation errors, flattened to one sentence per field.
 *
 * A 400 from a serializer arrives as `detail: { email: ["…"], role: ["…"] }`.
 * Every form in the app needs the same thing from it - the message that belongs
 * under each input - and reading it by hand at each call site is how a form ends
 * up showing "that address already has an account" as a page-level toast with
 * no indication of which field to change.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  const { detail } = parseApiError(error);
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(detail)) {
    if (NOT_A_FIELD.has(field)) continue;
    const text = Array.isArray(value)
      ? value.map(asString).filter(Boolean).join(" ")
      : asString(value);
    if (text) out[field] = userFacingMessage(text);
  }
  return out;
}

/**
 * The field errors a form can put under one of its own inputs, and nothing
 * else.
 *
 * A form that stores every field error and returns shows nothing when the
 * server objects to a field it has no input for - `user` or `tenant` on a
 * drawer that only asks for a role. Passing the inputs it renders keeps those
 * out, so an empty result means "say it in a toast instead".
 */
export function fieldErrorsFor(
  error: unknown,
  fields: readonly string[],
): Record<string, string> {
  const all = fieldErrors(error);
  const out: Record<string, string> = {};
  for (const field of fields) if (all[field]) out[field] = all[field];
  return out;
}
