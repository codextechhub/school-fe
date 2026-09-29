import { describe, expect, it } from "vitest";

import {
  jsWeekStart,
  teachingDaysInOrder,
  weekdayChoices,
} from "./week";
import { resolveCalendarRules } from "./calendar-rules";

describe("jsWeekStart", () => {
  it("reads ISO Monday and ISO Sunday", () => {
    expect(jsWeekStart(1)).toBe(1);
    expect(jsWeekStart(7)).toBe(0);
    expect(jsWeekStart(0)).toBe(0);
  });

  it("falls back to Monday for anything it cannot read", () => {
    expect(jsWeekStart(undefined)).toBe(1);
    expect(jsWeekStart(null)).toBe(1);
    expect(jsWeekStart(9)).toBe(1);
    expect(jsWeekStart(1.5)).toBe(1);
  });
});

describe("teachingDaysInOrder", () => {
  it("keeps a Saturday school's Saturday, last in a Monday-first week", () => {
    expect(teachingDaysInOrder([6, 1, 2, 3, 4, 5], 1)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("puts Sunday first for a Sunday-first school", () => {
    expect(teachingDaysInOrder([1, 2, 3, 4, 7], 0)).toEqual([7, 1, 2, 3, 4]);
  });

  it("means Monday to Friday when the list is empty, missing or junk", () => {
    expect(teachingDaysInOrder([], 1)).toEqual([1, 2, 3, 4, 5]);
    expect(teachingDaysInOrder(undefined, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(teachingDaysInOrder([0, 8], 1)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("weekdayChoices", () => {
  it("offers Saturday when the school teaches it", () => {
    const labels = weekdayChoices([1, 2, 3, 4, 5, 6], 1).map((d) => d.label);
    expect(labels).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ]);
  });

  it("keeps a day a row already sits on, even when it is no longer taught", () => {
    const values = weekdayChoices([1, 2, 3, 4, 5], 1, [6, null]).map((d) => d.value);
    expect(values).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("resolveCalendarRules", () => {
  it("answers as a Monday-to-Friday school before the rules arrive", () => {
    expect(resolveCalendarRules(undefined)).toEqual({
      weekStartsOn: 1,
      teachingDays: [1, 2, 3, 4, 5],
      closesSchoolByType: {
        HOLIDAY: true,
        MIDTERM_BREAK: true,
        EXAM_PERIOD: false,
        SCHOOL_EVENT: false,
        PTA: false,
        SPORTS: false,
      },
      roomRequiredToPublish: true,
      teacherDutyMatch: "OFF",
      defaultPeriodMinutes: null,
    });
  });

  it("reads a Sunday-first school's rules", () => {
    const rules = resolveCalendarRules({
      week_starts_on: 7,
      teaching_days: [7, 1, 2, 3, 4],
      room_required_to_publish: false,
      teacher_duty_match: "REFUSE",
      default_period_minutes: 40,
    });
    expect(rules.weekStartsOn).toBe(0);
    expect(rules.teachingDays).toEqual([7, 1, 2, 3, 4]);
    expect(rules.roomRequiredToPublish).toBe(false);
    expect(rules.teacherDutyMatch).toBe("REFUSE");
    expect(rules.defaultPeriodMinutes).toBe(40);
  });
});
