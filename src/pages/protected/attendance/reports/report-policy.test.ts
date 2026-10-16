import { describe, expect, it } from "vitest";

import { attendanceReportFieldPolicy } from "./report-policy";

describe("attendanceReportFieldPolicy", () => {
  it("shows report blocks when their canonical fields are readable", () => {
    expect(attendanceReportFieldPolicy({
      registerCountsHidden: false,
      registerStatusHidden: false,
      lessonMarkHidden: false,
      lessonCountsHidden: false,
    })).toEqual({ showCounts: true, showStatus: true, showLessons: true });
  });

  it("removes count and status summaries independently", () => {
    expect(attendanceReportFieldPolicy({
      registerCountsHidden: true,
      registerStatusHidden: false,
      lessonMarkHidden: false,
      lessonCountsHidden: false,
    })).toEqual({ showCounts: false, showStatus: true, showLessons: true });
  });

  it("requires both lesson marks and lesson counts for missed-lesson figures", () => {
    expect(attendanceReportFieldPolicy({
      registerCountsHidden: false,
      registerStatusHidden: false,
      lessonMarkHidden: true,
      lessonCountsHidden: false,
    }).showLessons).toBe(false);

    expect(attendanceReportFieldPolicy({
      registerCountsHidden: false,
      registerStatusHidden: false,
      lessonMarkHidden: false,
      lessonCountsHidden: true,
    }).showLessons).toBe(false);
  });
});
