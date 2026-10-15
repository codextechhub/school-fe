import { describe, expect, it } from "vitest";

import { classRegistersFieldPolicy } from "./class-registers-policy";

describe("class register directory Field Access", () => {
  it("shows every read-only directory field when it is readable", () => {
    expect(classRegistersFieldPolicy({
      countsHidden: false,
      statusHidden: false,
      markHidden: false,
    })).toEqual({
      showCounts: true,
      showStatus: true,
      showStudentMarks: true,
    });
  });

  it("removes hidden fields from summaries, filters and nested previews", () => {
    expect(classRegistersFieldPolicy({
      countsHidden: true,
      statusHidden: true,
      markHidden: true,
    })).toEqual({
      showCounts: false,
      showStatus: false,
      showStudentMarks: false,
    });
  });
});
