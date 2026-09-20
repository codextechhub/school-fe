import { describe, expect, it } from "vitest";
import {
  apiErrorMessage,
  fieldErrors,
  isApiCode,
  parseApiError,
} from "./api-error";

// The shape RTK Query hands back for an HTTP failure carrying the platform
// envelope: { status, data: { success, message, error: { code, detail } } }.
const rejection = (
  status: number,
  code: string,
  message: string,
  detail: Record<string, unknown> = {},
) => ({
  status,
  data: { success: false, message, error: { code, detail } },
});

describe("parseApiError", () => {
  it("reads the code, the sentence and the detail off a domain refusal", () => {
    const parsed = parseApiError(
      rejection(422, "ONBOARDING_NOT_READY", "The school is not ready to go live.", {
        outstanding_required_tasks: ["SET_OF_BOOKS"],
      }),
    );
    expect(parsed.status).toBe(422);
    expect(parsed.code).toBe("ONBOARDING_NOT_READY");
    expect(parsed.message).toBe("The school is not ready to go live.");
    expect(parsed.detail).toEqual({
      outstanding_required_tasks: ["SET_OF_BOOKS"],
    });
  });

  it("also finds a top-level code, which error_response(code=…) emits", () => {
    expect(
      parseApiError({ status: 400, data: { code: "DUPLICATE", message: "" } }).code,
    ).toBe("DUPLICATE");
  });

  it("returns empty fields for a transport failure rather than throwing", () => {
    const parsed = parseApiError({ status: "FETCH_ERROR", error: "offline" });
    expect(parsed.status).toBe("FETCH_ERROR");
    expect(parsed.code).toBe("");
    expect(parsed.message).toBe("");
    expect(parsed.detail).toEqual({});
  });

  it("survives being handed nothing at all", () => {
    expect(parseApiError(undefined).code).toBe("");
    expect(parseApiError(null).message).toBe("");
  });
});

describe("isApiCode", () => {
  it("matches only the exact code", () => {
    const error = rejection(404, "ONBOARDING_NOT_PROVISIONED", "Not set up.");
    expect(isApiCode(error, "ONBOARDING_NOT_PROVISIONED")).toBe(true);
    expect(isApiCode(error, "ONBOARDING_NOT_READY")).toBe(false);
  });
});

describe("apiErrorMessage", () => {
  it("passes the server's sentence through", () => {
    const error = rejection(
      422,
      "TASK_CONDITION_NOT_MET",
      "The school administrator role carries no permissions yet.",
    );
    expect(apiErrorMessage(error, "fallback")).toBe(
      "The school administrator role carries no permissions yet.",
    );
  });

  it("converts minor-unit amounts before returning the sentence", () => {
    const error = rejection(422, "AMOUNT_TOO_SMALL", "The minimum is 850 kobo.");
    expect(apiErrorMessage(error, "fallback")).toBe("The minimum is ₦8.50.");
  });

  it("never prints a machine code at a person", () => {
    // A backend slip that puts the code in `message` must not reach the screen.
    const error = rejection(422, "TASK_CONDITION_NOT_MET", "TASK_CONDITION_NOT_MET");
    expect(apiErrorMessage(error, "That step is not done yet.")).toBe(
      "That step is not done yet.",
    );
  });

  it("falls back when there is no message", () => {
    expect(apiErrorMessage({ status: "TIMEOUT_ERROR" }, "Try again.")).toBe(
      "Try again.",
    );
  });
});

describe("fieldErrors", () => {
  it("flattens DRF's per-field lists to one sentence each", () => {
    const error = rejection(400, "REQUEST_ERROR", "Check the details.", {
      email: ["A user with this email already exists."],
      role: ["This field is required."],
    });
    expect(fieldErrors(error)).toEqual({
      email: "A user with this email already exists.",
      role: "This field is required.",
    });
  });

  it("joins a field that failed more than one rule", () => {
    const error = rejection(400, "REQUEST_ERROR", "Check the details.", {
      password: ["This is too short.", "This is too common."],
    });
    expect(fieldErrors(error).password).toBe(
      "This is too short. This is too common.",
    );
  });

  it("takes a bare string as readily as a list", () => {
    const error = rejection(404, "REQUEST_ERROR", "Not found.", {
      detail: "No such person at this school.",
    });
    expect(fieldErrors(error).detail).toBe("No such person at this school.");
  });

  it("is empty for a refusal that names no field", () => {
    expect(fieldErrors({ status: "FETCH_ERROR" })).toEqual({});
  });
});
