/**
 * auth-errors - turn a backend/RTK-Query error into a clear, user-facing
 * sentence for the /accounts auth pages.
 *
 * The backend (apps/core/response.error_response) returns:
 *   { success: false, message: string, error: {...}, code?: string }
 * where `error` may carry a machine `code` / `error_code` (SCREAMING_SNAKE),
 * a human `detail`, or field errors. RTK-Query wraps HTTP failures as
 * `{ status: number, data: <body> }` and transport failures as
 * `{ status: "FETCH_ERROR" | "TIMEOUT_ERROR" | "PARSING_ERROR", error: string }`.
 *
 * Contract: `humanizeAuthError` NEVER returns a raw SCREAMING_SNAKE code. It
 * maps known codes to copy, lets a backend `detail`/`message` through ONLY when
 * it is a real human sentence (never a code), and otherwise returns `fallback`.
 */

/** Known backend error codes → user-facing copy. */
const CODE_MESSAGES: Record<string, string> = {
  // Login / credentials
  INVALID_CREDENTIALS: "Invalid credentials. Please try again.",
  ACCOUNT_LOCKED:
    "Your account is locked. Please contact your administrator or reset your password.",
  ACCOUNT_SUSPENDED:
    "Your account has been suspended. Please contact your administrator.",
  ACCOUNT_DEACTIVATED:
    "This account has been deactivated. Please contact your administrator.",
  ACCOUNT_NOT_ACTIVATED:
    "Your account is not yet activated. Please check your invitation email or contact your administrator.",
  SCHOOL_CONTEXT_REQUIRED: "Invalid credentials. Please try again.",

  // Two-step sign-in
  TWO_STEP_CODE_INVALID:
    "That code is not right. Check your authenticator app and try again.",
  TWO_STEP_CHALLENGE_INVALID:
    "This sign-in has expired. Enter your email and password again.",
  TWO_STEP_SET_UP_NOT_STARTED: "Scan the QR code before entering a code.",

  // Invitation / activation
  INVITATION_NOT_FOUND:
    "This invite link is invalid or has expired. Please contact your administrator for a new one.",
  INVITATION_ALREADY_USED:
    "This invite link has already been used. Please log in.",
  INVITATION_EXPIRED:
    "This invite link has expired. Please contact your administrator for a new one.",
  // The account behind the link changed after it was sent, e.g. its hire was withdrawn.
  INVITATION_NOT_ACTIONABLE:
    "This invite link can no longer be used. Please contact your administrator.",

  // Password reset
  RESET_KEY_INVALID:
    "This password reset link is invalid or has expired. Please request a new one.",
  PASSWORD_POLICY_VIOLATION:
    "That password doesn't meet the requirements. Please choose a stronger one.",

  // Session / token
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  TOKEN_REVOKED: "This session has been revoked. Please log in again.",
  TOKEN_INVALID: "Invalid session. Please log in again.",

  // Generic server
  SERVER_ERROR: "A server error occurred. Please try again later.",
};

/**
 * Human backend `message`/`detail` sentences that are safe to pass straight
 * through to the UI. We allowlist by exact value so a code can never slip in as
 * a "message". Keep in sync with the auth/password/activation views.
 */
const SAFE_MESSAGES = new Set<string>([
  "Invalid credentials.",
  "Authentication failed.",
  "Your account is locked. Please contact your administrator or reset your password.",
  "Your account has been suspended. Please contact your administrator.",
  "This account has been deactivated. Please contact your administrator.",
  "Your account is not yet activated. Please check your invitation email or contact your administrator.",
  "This invitation link is invalid.",
  "This invitation link has already been used. Please log in.",
  "This invitation link has expired. Please contact your administrator.",
  "This invitation link is no longer valid.",
  "Invalid or expired reset link.",
  "Invalid or expired key. Contact your administrator for assistance.",
  "Reset key has expired. Try again.",
  "Passwords do not match.",
  "User not found.",
]);

/** Looks like a machine code (SCREAMING_SNAKE_CASE) rather than a sentence. */
const isCodeLike = (value: string): boolean =>
  /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(value.trim());

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === "object" ? (value as UnknownRecord) : undefined;

/**
 * Pull the first SCREAMING_SNAKE code we can find in the error payload, from the
 * documented locations (`error.code`, `error.error_code`, top-level `code`).
 */
const extractCode = (err: unknown): string | undefined => {
  const root = asRecord(err);
  const data = asRecord(root?.data) ?? root;
  const errorObj = asRecord(data?.error);

  const candidates = [
    errorObj?.code,
    errorObj?.error_code,
    data?.code,
    data?.error_code,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && isCodeLike(c)) return c;
  }
  return undefined;
};

/** Pull a human `message`/`detail` string from the payload, if present. */
const extractMessage = (err: unknown): string | undefined => {
  const root = asRecord(err);
  const data = asRecord(root?.data) ?? root;
  const errorObj = asRecord(data?.error);

  const candidates = [errorObj?.detail, data?.message, data?.detail];
  for (const m of candidates) {
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return undefined;
};

/** Classify RTK-Query transport-level failures. */
const transportMessage = (err: unknown): string | undefined => {
  const status = asRecord(err)?.status;
  if (status === "FETCH_ERROR")
    return "Could not reach the server. Please check your connection and try again.";
  if (status === "TIMEOUT_ERROR")
    return "The request timed out. Please try again.";
  if (status === "PARSING_ERROR")
    return "Unexpected response from the server. Please try again.";
  return undefined;
};

/**
 * Turn any auth error into a safe, user-facing sentence.
 *
 * @param err       The rejected error (RTK-Query error, thrown value, etc.).
 * @param fallback  Copy returned when the error is unrecognized. NEVER a code.
 */
export function humanizeAuthError(err: unknown, fallback: string): string {
  // 1. Network / timeout / parsing - before touching the (absent) body.
  const transport = transportMessage(err);
  if (transport) return transport;

  const status = asRecord(err)?.status;

  // 2. Throttling.
  if (status === 429)
    return "Too many attempts. Please wait a moment and try again.";

  // 3. Known machine code → mapped copy.
  const code = extractCode(err);
  if (code) return CODE_MESSAGES[code] ?? fallback;

  // 4. Server error with no recognizable code.
  if (typeof status === "number" && status >= 500)
    return CODE_MESSAGES.SERVER_ERROR;

  // 5. Human backend sentence, but only from the safe allowlist and never a
  //    code masquerading as a message.
  const message = extractMessage(err);
  if (message && !isCodeLike(message) && SAFE_MESSAGES.has(message))
    return message;

  // 6. Anything else → the caller's fallback. Never the raw payload.
  return fallback;
}
