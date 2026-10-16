import { describe, expect, it } from "vitest";

import type { Report } from "@/redux/services/attendance/attendance-types";

import { summarizeAttendanceReport } from "./report-state";

const report = (overrides: Partial<Report> = {}): Report => ({
  term: null,
  terms: [],
  range: { start: null, end: null },
  by_class: [],
  threshold: 85,
  branch_dimension: true,
  ...overrides,
});

describe("summarizeAttendanceReport", () => {
  it("weights the school rate from the readable class tallies", () => {
    const summary = summarizeAttendanceReport(report({
      by_class: [
        {
          class_id: 1,
          class_name: "JSS1 A",
          level_name: "JSS1",
          branch: null,
          counts: { present: 80, late: 10, absent: 10, excused: 10, rate: 80, not_taken: 0, roster_size: 20 },
        },
        {
          class_id: 2,
          class_name: "Primary 5",
          level_name: "Primary 5",
          branch: null,
          counts: { present: 10, late: 2, absent: 0, excused: 0, rate: 100, not_taken: 1, roster_size: 10 },
        },
      ],
    }));

    expect(summary.attendanceRate).toBe(81.8);
    expect(summary.late).toBe(12);
  });

  it("does not rebuild summaries whose protected blocks are absent", () => {
    expect(summarizeAttendanceReport(report({
      by_class: [{ class_id: 1, class_name: "JSS1 A", level_name: "JSS1", branch: null }],
    }))).toEqual({
      attendanceRate: null,
      late: null,
      atRisk: null,
      registerGaps: null,
      lessonsMissed: null,
    });
  });

  it("counts only the report blocks supplied by the backend", () => {
    expect(summarizeAttendanceReport(report({
      chronic: [
        { student: { id: 1, name: "Amina Yusuf", student_number: "HC-001" }, class_name: "JSS2 B", rate: 74, absent: 8, excused: 1, not_taken: 2 },
      ],
      not_taken: [
        { date: "2026-10-15", class_id: 2, class_name: "Primary 5", level_name: "Primary 5", class_teacher_name: null, branch: null },
      ],
      lessons_missed: [
        { subject: "Mathematics", class_name: "JSS2 B", teacher_name: null, missed: 3, students: ["Amina Yusuf"] },
      ],
    }))).toMatchObject({ atRisk: 1, registerGaps: 1, lessonsMissed: 3 });
  });
});
