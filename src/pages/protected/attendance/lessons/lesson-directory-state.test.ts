import { describe, expect, it } from "vitest";

import type { LessonListRow } from "@/redux/services/attendance/attendance-types";

import {
  lessonMatchesFilter,
  lessonMatchesSearch,
  summarizeLessons,
} from "./lesson-directory-state";

function lesson(overrides: Partial<LessonListRow> = {}): LessonListRow {
  return {
    slot_id: 7,
    period_label: "Period 2",
    start_time: "08:40",
    end_time: "09:20",
    school_class: { id: 3, name: "JSS 2A" },
    branch: { id: 1, name: "Main Branch" },
    subject: "English Language",
    teacher_name: "Kunle Adebayo",
    status: "IN_PROGRESS",
    ...overrides,
  };
}

describe("lesson register directory state", () => {
  it("finds lessons by period, class, subject, teacher and branch", () => {
    expect(lessonMatchesSearch(lesson(), "period 2")).toBe(true);
    expect(lessonMatchesSearch(lesson(), "jss 2a")).toBe(true);
    expect(lessonMatchesSearch(lesson(), "english")).toBe(true);
    expect(lessonMatchesSearch(lesson(), "kunle")).toBe(true);
    expect(lessonMatchesSearch(lesson(), "main branch")).toBe(true);
    expect(lessonMatchesSearch(lesson(), "biology")).toBe(false);
  });

  it("keeps submitted and actionable lessons mutually exclusive", () => {
    expect(lessonMatchesFilter(lesson(), "action")).toBe(true);
    expect(lessonMatchesFilter(lesson(), "submitted")).toBe(false);
    expect(lessonMatchesFilter(lesson({ status: "SUBMITTED" }), "submitted")).toBe(true);
    expect(lessonMatchesFilter(lesson({ status: "SUBMITTED" }), "action")).toBe(false);
  });

  it("summarizes ready lessons as in progress and still needing action", () => {
    expect(summarizeLessons([
      lesson({ status: "SUBMITTED" }),
      lesson({ slot_id: 8, status: "IN_PROGRESS" }),
      lesson({ slot_id: 9, status: "READY" }),
      lesson({ slot_id: 10, status: "NOT_STARTED" }),
    ])).toEqual({ submitted: 1, inProgress: 2, notStarted: 1, needsAction: 3 });
  });
});
