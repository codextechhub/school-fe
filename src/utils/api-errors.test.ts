/**
 * A refused save toasts the server's sentence. Mrs Bello's bulk refund fails
 * on two lines, and the toast names both lines in words, as the server wrote
 * them, rather than the first line's error with no line named.
 */
import { describe, expect, it } from "vitest";

import { apiErrorMessage } from "./api-errors";

describe("apiErrorMessage for a request error", () => {
  it("shows the server's sentence for several field errors, each field named in words", () => {
    expect(apiErrorMessage({
      status: 400,
      data: {
        message: "Line 2, gross amount: Enter an amount above zero.; Line 3, account: Choose an account.",
        error: {
          code: "REQUEST_ERROR",
          detail: { lines: [{}, { gross_amount: ["Enter an amount above zero."] }, { account: ["Choose an account."] }] },
        },
      },
    })).toBe("Line 2, gross amount: Enter an amount above zero.; Line 3, account: Choose an account.");
  });

  it("shows a single field's error as the server wrote it", () => {
    expect(apiErrorMessage({
      message: "Enter a valid date.",
      error: { code: "REQUEST_ERROR", detail: { invoice_date: ["Enter a valid date."] } },
    })).toBe("Enter a valid date.");
  });

  it("reads the first field detail when the server's sentence is the generic one", () => {
    expect(apiErrorMessage({
      message: "An error occurred. Check the error details for more information.",
      error: { code: "REQUEST_ERROR", detail: { invoice_date: ["Enter a valid date."] } },
    })).toBe("Enter a valid date.");
  });

  it("keeps a typed refusal's own message", () => {
    expect(apiErrorMessage({
      message: "Ikeja Branch has closed September 2026, so nothing more can be posted into it.",
      error: { code: "PERIOD_CLOSED", detail: { status: "CLOSED" } },
    })).toBe("Ikeja Branch has closed September 2026, so nothing more can be posted into it.");
  });
});
