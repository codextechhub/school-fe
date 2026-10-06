import { describe, expect, it } from "vitest";
import {
  apiErrorMessage,
  fieldErrors,
  fieldErrorsFor,
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

  it("leaves a server sentence's own units alone", () => {
    // The server words amounts in naira; a receipt's "fifty kobo" must stay kobo.
    const error = rejection(422, "AMOUNT_TOO_SMALL", "The minimum is ₦8.50.");
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
    const error = rejection(400, "REQUEST_ERROR", "Check the details.", {
      email: "Enter a valid email address.",
    });
    expect(fieldErrors(error).email).toBe("Enter a valid email address.");
  });

  // A 403 carries its sentence as `detail`. Read as a field it landed under a
  // key no form renders, and the Grant role button went quiet.
  it("leaves out detail and non_field_errors, which name no input", () => {
    const refused = rejection(
      403,
      "REQUEST_ERROR",
      "You cannot assign a role carrying restricted permissions.",
      { detail: "You cannot assign a role carrying restricted permissions." },
    );
    expect(fieldErrors(refused)).toEqual({});
    const objection = rejection(400, "REQUEST_ERROR", "Dates overlap.", {
      non_field_errors: ["Dates overlap."],
    });
    expect(fieldErrors(objection)).toEqual({});
  });

  it("is empty for a refusal that names no field", () => {
    expect(fieldErrors({ status: "FETCH_ERROR" })).toEqual({});
  });
});

describe("fieldErrorsFor", () => {
  it("keeps only the inputs the form renders", () => {
    const error = rejection(400, "REQUEST_ERROR", "Check the details.", {
      role: ["They already hold this role."],
      user: ["No such person."],
    });
    expect(fieldErrorsFor(error, ["role", "branch"])).toEqual({
      role: "They already hold this role.",
    });
  });

  it("is empty when the server objected to a field the form has no input for", () => {
    const error = rejection(400, "REQUEST_ERROR", "No such person.", {
      user: ["No such person."],
    });
    expect(fieldErrorsFor(error, ["role", "branch"])).toEqual({});
  });
});
