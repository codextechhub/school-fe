import { describe, expect, it } from "vitest";

import {
  bindingRequiredFields,
  guardianEmailBinds,
  type EnrolmentRules,
  type GuardianRules,
} from "./students-types";

const enrolment = (extra: Partial<EnrolmentRules>) => extra as EnrolmentRules;
const guardians = (extra: Partial<GuardianRules>) => extra as GuardianRules;

describe("bindingRequiredFields", () => {
  it("is the list that binds the user where the server sends one, empty included", () => {
    expect(
      bindingRequiredFields(
        enrolment({ required_fields: ["address", "phone"], binding_required_fields: ["phone"] }),
      ),
    ).toEqual(["phone"]);
    expect(
      bindingRequiredFields(
        enrolment({ required_fields: ["address"], binding_required_fields: [] }),
      ),
    ).toEqual([]);
  });

  it("falls back to the school's list from a server that sends none", () => {
    expect(bindingRequiredFields(enrolment({ required_fields: ["address"] }))).toEqual(["address"]);
    expect(bindingRequiredFields(undefined)).toEqual([]);
  });
});

describe("guardianEmailBinds", () => {
  it("follows binding_email_required where the server sends it", () => {
    expect(guardianEmailBinds(guardians({ email_required: true, binding_email_required: false }))).toBe(false);
    expect(guardianEmailBinds(guardians({ email_required: false, binding_email_required: true }))).toBe(true);
  });

  it("falls back to email_required from a server that sends no binding value", () => {
    expect(guardianEmailBinds(guardians({ email_required: true }))).toBe(true);
    expect(guardianEmailBinds(undefined)).toBe(false);
  });
});
