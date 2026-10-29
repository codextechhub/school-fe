import { describe, expect, it } from "vitest";
import { humanizeAuthError } from "./auth-errors";

const FALLBACK = "Something went wrong. Please try again.";

describe("humanizeAuthError", () => {
  it("maps a known code from error.code to friendly copy", () => {
    const err = { status: 401, data: { message: "Invalid credentials.", error: { code: "INVALID_CREDENTIALS" } } };
    expect(humanizeAuthError(err, FALLBACK)).toBe(
      "Invalid credentials. Please try again.",
    );
  });

  it("maps a known code from error.error_code (reset/activate flows)", () => {
    const err = { status: 400, data: { message: "This invitation link is invalid.", error: { error_code: "INVITATION_NOT_FOUND" } } };
    expect(humanizeAuthError(err, FALLBACK)).toBe(
      "This invite link is invalid or has expired. Please contact your administrator for a new one.",
    );
  });

  it("says a link whose account changed since it was sent can no longer be used", () => {
    const err = { status: 400, data: { message: "This invitation link is no longer valid.", error: { error_code: "INVITATION_NOT_ACTIONABLE" } } };
    expect(humanizeAuthError(err, "Activation failed. Please try again.")).toBe(
      "This invite link can no longer be used. Please contact your administrator.",
    );
  });

  it("maps password policy violations", () => {
    const err = { status: 400, data: { error: { error_code: "PASSWORD_POLICY_VIOLATION" } } };
    expect(humanizeAuthError(err, FALLBACK)).toBe(
      "That password doesn't meet the requirements. Please choose a stronger one.",
    );
  });

  it("NEVER returns a raw SCREAMING_SNAKE code - unknown codes fall back", () => {
    const err = { status: 400, data: { error: { code: "SOME_UNMAPPED_BACKEND_CODE" } } };
    const out = humanizeAuthError(err, FALLBACK);
    expect(out).toBe(FALLBACK);
    expect(out).not.toMatch(/^[A-Z0-9_]+$/);
  });

  it("blocks a code masquerading as a message", () => {
    const err = { status: 400, data: { message: "INVITATION_NOT_FOUND" } };
    // message is code-shaped → not allowlisted → fallback, never leaked.
    expect(humanizeAuthError(err, FALLBACK)).toBe(FALLBACK);
  });

  it("passes through an allowlisted human sentence", () => {
    const err = { status: 400, data: { message: "Passwords do not match." } };
    expect(humanizeAuthError(err, FALLBACK)).toBe("Passwords do not match.");
  });

  it("does NOT pass through a non-allowlisted human sentence", () => {
    const err = { status: 400, data: { message: "Some internal detail leaked out." } };
    expect(humanizeAuthError(err, FALLBACK)).toBe(FALLBACK);
  });

  it("handles transport failures before touching the body", () => {
    expect(humanizeAuthError({ status: "FETCH_ERROR" }, FALLBACK)).toBe(
      "Could not reach the server. Please check your connection and try again.",
    );
    expect(humanizeAuthError({ status: "TIMEOUT_ERROR" }, FALLBACK)).toBe(
      "The request timed out. Please try again.",
    );
  });

  it("maps 429 throttling and 5xx server errors", () => {
    expect(humanizeAuthError({ status: 429 }, FALLBACK)).toBe(
      "Too many attempts. Please wait a moment and try again.",
    );
    expect(humanizeAuthError({ status: 503, data: {} }, FALLBACK)).toBe(
      "A server error occurred. Please try again later.",
    );
  });

  it("returns fallback for an empty/unknown error", () => {
    expect(humanizeAuthError({}, FALLBACK)).toBe(FALLBACK);
    expect(humanizeAuthError(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
