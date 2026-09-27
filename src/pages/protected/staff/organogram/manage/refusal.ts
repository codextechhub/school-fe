import { apiDetailMessage, parseApiError } from "@/utils/api-error";

/**
 * The sentence to show when an organogram write is refused.
 *
 * A 403 here is usually the branch rule speaking ("You work in one branch, so
 * you cannot create something that applies to the whole school"), which tells
 * the reader what to do, so the server's own words are kept rather than
 * replaced with a generic permission sentence. An expired session is the one
 * refusal that is not about the change at all, and says so.
 */
export function refusalMessage(error: unknown, fallback: string): string {
  if (parseApiError(error).status === 401) {
    return "Your session has expired. Sign in again, then retry. Nothing was saved.";
  }
  return apiDetailMessage(error, fallback);
}
