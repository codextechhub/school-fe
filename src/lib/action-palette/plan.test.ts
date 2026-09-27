import { describe, expect, it } from "vitest";
import { capabilityForPath } from "./plan";

describe("capabilityForPath", () => {
  it("names the module a screen belongs to", () => {
    expect(capabilityForPath("/students")).toBe("students");
    expect(capabilityForPath("/staff/invitations")).toBe("teachers");
    expect(capabilityForPath("/finance/receivables/receipts?action=new")).toBe("finance");
  });

  it("lets a deeper band win over its module", () => {
    expect(capabilityForPath("/students/promotion")).toBe("students_plus");
    expect(capabilityForPath("/staff/teaching")).toBe("teachers_plus");
    expect(capabilityForPath("/timetables/exams")).toBe("calendar_advanced");
    expect(capabilityForPath("/timetables/rooms")).toBe("calendar_plus");
  });

  it("reads the settings sections' own modules", () => {
    expect(capabilityForPath("/settings/payroll")).toBe("finance_advanced");
    expect(capabilityForPath("/settings/admission-numbers")).toBe("students");
    expect(capabilityForPath("/settings/security")).toBeUndefined();
  });

  it("matches whole segments, never a word that merely starts the same", () => {
    expect(capabilityForPath("/exports-help")).toBeUndefined();
    expect(capabilityForPath("/overview")).toBeUndefined();
  });
});
