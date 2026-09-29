import type {
  CalendarRules,
  DayOfWeek,
  TeacherDutyMatch,
} from "@/redux/services/calendar/calendar-types";
import {
  jsWeekStart,
  teachingDaysInOrder,
  type JsWeekday,
} from "@/lib/week";

/**
 * The school's calendar rules with every gap filled, so a screen can read them
 * before they arrive, after a failed read, or from a server that has not
 * learned a field yet.
 *
 * The fallbacks are the server's own defaults: a Monday-first week taught
 * Monday to Friday, a public holiday and a mid-term break closing the school,
 * a room required before publishing, no teaching-duty check and no default
 * period length.
 */
export interface ResolvedCalendarRules {
  /** A `getDay()` weekday, ready for a month grid or a date picker. */
  weekStartsOn: JsWeekday;
  /** ISO weekdays in the school's week order. Never empty. */
  teachingDays: DayOfWeek[];
  closesSchoolByType: Record<string, boolean>;
  roomRequiredToPublish: boolean;
  teacherDutyMatch: TeacherDutyMatch;
  defaultPeriodMinutes: number | null;
}

const DUTY_MATCHES: TeacherDutyMatch[] = ["OFF", "WARN", "REFUSE"];

/** The server's default for which new events close the school. */
export const DEFAULT_CLOSES_SCHOOL: Record<string, boolean> = {
  HOLIDAY: true,
  MIDTERM_BREAK: true,
  EXAM_PERIOD: false,
  SCHOOL_EVENT: false,
  PTA: false,
  SPORTS: false,
};

export function resolveCalendarRules(
  rules?: Partial<CalendarRules> | null,
): ResolvedCalendarRules {
  const weekStartsOn = jsWeekStart(rules?.week_starts_on);
  const minutes = rules?.default_period_minutes;
  return {
    weekStartsOn,
    teachingDays: teachingDaysInOrder(rules?.teaching_days, weekStartsOn),
    closesSchoolByType: rules?.closes_school_by_type ?? DEFAULT_CLOSES_SCHOOL,
    roomRequiredToPublish: rules?.room_required_to_publish ?? true,
    teacherDutyMatch: DUTY_MATCHES.includes(rules?.teacher_duty_match as TeacherDutyMatch)
      ? (rules!.teacher_duty_match as TeacherDutyMatch)
      : "OFF",
    defaultPeriodMinutes:
      typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0
        ? minutes
        : null,
  };
}
