import { PASSWORD_MIN_LENGTH } from "@/schema/auth";
import { fieldErrors } from "@/utils/api-error";
import { userFacingMessage } from "@/utils/user-facing-message";

/**
 * The pieces every "choose a password" form shares: activating an account,
 * resetting a forgotten password, and changing a password you still know.
 *
 * All three ask for the same thing under the same server policy
 * (`vs_user/password_policy.py`), so they state the rules the same way and put
 * a refusal in the same place. A person who activated last term and resets
 * today should not meet a form that has stopped telling them what it wants.
 */

/**
 * The password rules, stated before they are needed.
 *
 * The rules are the server's, and finding them out by being refused is the
 * slowest way to learn them - especially from a link somebody was sent and
 * uses once. `resetPasswordSchema` checks the same four rules on the client.
 */
export function PasswordRules() {
  return (
    <p className="-mt-2 text-xs text-gray-01 font-mont">
      At least {PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a
      lowercase letter, a number and a special character.
    </p>
  );
}

export interface PasswordFieldErrors {
  current_password?: string;
  password?: string;
  confirm_password?: string;
}

const PASSWORD_FIELDS = ["current_password", "password", "confirm_password"] as const;

/** One sentence from a DRF field value, which is a string or a list of them. */
function sentence(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").join(" ");
  }
  return "";
}

/**
 * The refusal that belongs under the password boxes, or an empty object when
 * the server objected to something else.
 *
 * The auth views send field errors in two shapes. Activation's policy refusal
 * nests them under `error.detail`, the shape `fieldErrors` reads. The reset
 * confirmation, activation's own "Passwords do not match" and every refusal
 * of a password change put them straight on `error`. Both are read here, so
 * "at least 12 characters" lands under the box on any form rather than falling
 * through to a sentence that names no rule.
 *
 * A policy refusal raised past the serializer arrives as `error.messages`,
 * naming no field; it can only be about the new password, so it goes there.
 */
export function passwordFieldErrors(error: unknown): PasswordFieldErrors {
  const nested = fieldErrors(error);
  const body = (error as { data?: { error?: unknown } } | null)?.data;
  const flat =
    body && typeof body.error === "object" && body.error !== null
      ? (body.error as Record<string, unknown>)
      : {};
  const out: PasswordFieldErrors = {};
  for (const field of PASSWORD_FIELDS) {
    const text = nested[field] || userFacingMessage(sentence(flat[field]));
    if (text) out[field] = text;
  }
  if (!out.password) {
    const policy = userFacingMessage(sentence(flat.messages));
    if (policy) out.password = policy;
  }
  return out;
}
