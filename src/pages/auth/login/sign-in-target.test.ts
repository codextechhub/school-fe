import { describe, expect, it } from "vitest";

import { signInTarget } from "./sign-in-target";

describe("where a sign-in lands", () => {
  it("sends a live school to the page it was on, or the dashboard", () => {
    expect(signInTarget("/finance/receivables/invoices", false)).toBe("/finance/receivables/invoices");
    expect(signInTarget(null, false)).toBe("/overview");
  });

  it("returns a school still being set up to any screen open before go-live", () => {
    expect(signInTarget("/onboarding/go-live", true)).toBe("/onboarding/go-live");
    expect(signInTarget("/support/42", true)).toBe("/support/42");
    expect(signInTarget("/academic-structure/classes", true)).toBe("/academic-structure/classes");
  });

  it("sends a school still being set up home when the page is closed to it", () => {
    expect(signInTarget("/finance/receivables/invoices", true)).toBe("/onboarding/welcome");
    expect(signInTarget("/staff/teaching", true)).toBe("/onboarding/welcome");
    expect(signInTarget(undefined, true)).toBe("/onboarding/welcome");
  });
});
