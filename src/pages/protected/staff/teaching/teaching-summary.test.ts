import { describe, expect, it } from "vitest";

import { teachingSummary } from "./teaching-summary";

describe("teaching coverage summary", () => {
  it("keeps the two kinds of gap separate", () => {
    expect(teachingSummary(40, 7, 3)).toEqual({
      total: 40,
      covered: 30,
      noTeacher: 7,
      noMainTeacher: 3,
    });
  });

  it("does not show negative coverage for an inconsistent response", () => {
    expect(teachingSummary(2, 4, 1).covered).toBe(0);
    expect(teachingSummary(-1, -2, -3)).toEqual({
      total: 0,
      covered: 0,
      noTeacher: 0,
      noMainTeacher: 0,
    });
  });
});
