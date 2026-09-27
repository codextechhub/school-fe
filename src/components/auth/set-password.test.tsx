import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PasswordRules, passwordFieldErrors } from "./set-password";

/** An RTK Query rejection carrying this `error` body. */
const refusal = (error: unknown) => ({
  status: 400,
  data: { success: false, message: "Invalid request.", error },
});

describe("passwordFieldErrors", () => {
  it("reads the reset confirmation's flat field errors", () => {
    // Amaka resets her password to "Password12" from the emailed link. The
    // server lists what it misses directly on `error`, and she needs to see
    // that under the box rather than "Couldn't reset your password".
    expect(
      passwordFieldErrors(
        refusal({
          password: [
            "This password must contain at least 12 characters.",
            "This password must contain at least one special character.",
          ],
        }),
      ),
    ).toEqual({
      password:
        "This password must contain at least 12 characters. This password must contain at least one special character.",
    });
  });

  it("reads activation's nested field errors", () => {
    expect(
      passwordFieldErrors(
        refusal({
          code: "PASSWORD_POLICY_VIOLATION",
          detail: { password: ["This password is too common."] },
        }),
      ),
    ).toEqual({ password: "This password is too common." });
  });

  it("reads a flat mismatch on the confirmation box", () => {
    expect(
      passwordFieldErrors(refusal({ confirm_password: "Passwords do not match." })),
    ).toEqual({ confirm_password: "Passwords do not match." });
  });

  it("returns nothing for a refusal with no password field", () => {
    // An expired link has no box to sit under, so the page shows it as a
    // banner instead.
    expect(
      passwordFieldErrors(
        refusal({ error_code: "RESET_KEY_INVALID", message: "Invalid or expired reset link." }),
      ),
    ).toEqual({});
    expect(passwordFieldErrors({ status: "FETCH_ERROR", error: "offline" })).toEqual({});
    expect(passwordFieldErrors(undefined)).toEqual({});
  });
});

describe("PasswordRules", () => {
  it("names every rule the server enforces", () => {
    const html = renderToStaticMarkup(<PasswordRules />);
    expect(html).toContain("At least 12 characters");
    for (const rule of ["uppercase", "lowercase", "number", "special character"]) {
      expect(html).toContain(rule);
    }
  });
});
