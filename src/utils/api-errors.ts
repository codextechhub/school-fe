import { userFacingMessage } from "./user-facing-message";

/**
 * Host-contract module for @xvs/finance, which imports `@/utils/api-errors`.
 *
 * This app also has `api-error.ts` (singular), its own earlier helper. The two
 * overlap on apiErrorMessage deliberately: the package needs apiFieldError,
 * which the singular file does not have, and merging every existing caller is
 * a separate change from making the package installable. Prefer this file in
 * new code.
 */

/**
 * Pull the user-facing explanation from the platform's error envelope.
 *
 * Typed domain failures use the top-level `message` as their complete,
 * actionable explanation and keep machine context under `error.code/detail`.
 * DRF request-validation failures use `REQUEST_ERROR`; their `message` names
 * each failing field in words, so it is read first, and the field-level
 * `error.detail` stands in only when the message is the generic one
 * (requestErrorSentence).
 *
 * Never inspect the whole `error` object for a string: its first string is often
 * the machine code (`POSTING_ERROR`, `PERIOD_CLOSED`, …), which must not be shown
 * to a user as the explanation.
 */
/**
 * Django's own words when `get_object_or_404` misses, e.g.
 * "No TenantRoleTemplate matches the given query."
 *
 * DRF passes it straight through as the response message, so without this it is
 * what the reader sees - naming an internal model class at them, which tells them
 * nothing they can act on and leaks the schema's vocabulary into the product.
 */
const DJANGO_NOT_FOUND = /^No \w+ matches the given query\.?$/i;

const NOT_FOUND_MESSAGE =
  "That record could not be found. It may have been deleted, or the link may be wrong.";

/** The code `core.exceptions.custom_exception_handler` puts on an unhandled 500. */
const SERVER_ERROR_CODE = "SERVER_ERROR";

/** Replace a backend message that is not fit to show with one that is. */
export function humanizeApiMessage(message: string): string {
  const humanized = DJANGO_NOT_FOUND.test(message.trim()) ? NOT_FOUND_MESSAGE : message;
  return userFacingMessage(humanized);
}

/**
 * The HTTP status on an RTK Query error, or null when there isn't one.
 *
 * RTK Query's error union is `FetchBaseQueryError | SerializedError`, and only
 * the first carries `status` - which is why screens kept reaching for
 * `(error as any)?.status`. That cast also silently accepts the fetch-level
 * string statuses ("FETCH_ERROR", "PARSING_ERROR"), so `=== 403` on a network
 * failure is a comparison that can never be true but reads as though it could.
 * This narrows to a real number instead.
 */
export function errorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function apiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const envelope = unwrapErrorEnvelope(error);
  const errorObject = asRecord(envelope?.error);
  const code = typeof errorObject?.code === "string" ? errorObject.code : "";
  const message = typeof envelope?.message === "string" ? envelope.message.trim() : "";
  const detail = extractFirstDetail(errorObject?.detail);

  // An unhandled exception reaches the client as `SERVER_ERROR` / "An unexpected
  // error occurred." - true, and useless. It says nothing about what the reader was
  // trying to do, while the caller's fallback ("That export could not be started")
  // at least names the action. So the generic 500 envelope never wins over it.
  if (code === SERVER_ERROR_CODE) return fallback;

  const chosen = code && code !== "REQUEST_ERROR"
    ? message || detail || fallback
    : requestErrorSentence(message, detail) || fallback;
  return humanizeApiMessage(chosen);
}

/**
 * The server's generic sentence for a request error that carried no message
 * of its own. Only then is the first field detail the better sentence.
 */
const GENERIC_REQUEST_ERROR = "An error occurred. Check the error details for more information.";

/**
 * The sentence for a request-validation refusal (`REQUEST_ERROR`).
 *
 * The server writes `message` from the field errors themselves: one error on
 * its own, several each named in words ("Line 2, gross amount: Enter an amount
 * above zero; Line 3, account: Choose an account"). Reading the first field's
 * detail instead dropped every name and every error after the first, so a
 * bursar fixing a bulk refund saw "Enter an amount above zero." and not which
 * line it was. So `message` wins, and the first detail stands in only for the
 * generic sentence or a body with no message.
 */
function requestErrorSentence(message: string, detail: string | null): string {
  if (message && message !== GENERIC_REQUEST_ERROR) return message;
  return detail || message;
}

export function apiFieldError(error: unknown, field: string): string | null {
  const envelope = unwrapErrorEnvelope(error);
  const errorObject = asRecord(envelope?.error);
  const detail = asRecord(errorObject?.detail);
  const message = extractFirstDetail(detail?.[field]);
  return message ? humanizeApiMessage(message) : null;
}

function unwrapErrorEnvelope(error: unknown): Record<string, unknown> | null {
  const record = asRecord(error);
  const nested = asRecord(record?.data);
  return nested ?? record;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function extractFirstDetail(detail: unknown): string | null {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    for (const item of detail) {
      const found = extractFirstDetail(item);
      if (found) return found;
    }
    return null;
  }
  const record = asRecord(detail);
  if (record) {
    for (const value of Object.values(record)) {
      const found = extractFirstDetail(value);
      if (found) return found;
    }
  }
  return null;
}
