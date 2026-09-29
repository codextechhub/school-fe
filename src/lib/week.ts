import type { DayOfWeek } from "@/redux/services/calendar/calendar-types";

/**
 * The school's week: the day it starts on and the days it teaches.
 *
 * Two numberings meet here and are kept apart on purpose. The API speaks ISO
 * weekdays (1 is Monday, 7 is Sunday), because that is what the server stores.
 * JavaScript's `Date.getDay()` and react-day-picker speak 0 to 6 with Sunday
 * as 0. A week start is converted once, by {@link jsWeekStart}, and every grid
 * helper takes the converted value, so a Sunday-first school never lands on
 * the ISO 7 that no JavaScript API recognises.
 */

/** A `Date.getDay()` weekday: 0 is Sunday. */
export type JsWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The week start used until the school's own rule arrives, and whenever it
 * cannot be read: Monday, so a date sits in the same column wherever it is
 * drawn and the timetables' Monday-first order matches the calendar's.
 */
export const WEEK_STARTS_ON: JsWeekday = 1;

/** The teaching week used until the school's own rule arrives. */
export const DEFAULT_TEACHING_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5];

/** Every ISO weekday with its names, Monday first. */
export const ISO_WEEKDAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 7, label: "Sunday", short: "Sun" },
];

/**
 * An ISO week start as a `getDay()` weekday. Seven and zero both mean Sunday;
 * anything unreadable falls back to Monday.
 */
export function jsWeekStart(iso: number | null | undefined): JsWeekday {
  if (typeof iso !== "number" || !Number.isInteger(iso) || iso < 0 || iso > 7) {
    return WEEK_STARTS_ON;
  }
  return (iso % 7) as JsWeekday;
}

/** Where an ISO weekday falls in a week that starts on `weekStartsOn`, from 0. */
export function weekPosition(day: DayOfWeek, weekStartsOn: JsWeekday): number {
  return (((day % 7) - weekStartsOn) + 7) % 7;
}

/**
 * The school's teaching days, valid and in its week's order.
 *
 * A Sunday-to-Thursday school reads Sunday first; a Monday-first school with
 * Saturday classes reads Saturday last. Unknown numbers are dropped, and an
 * empty or missing list means the Monday-to-Friday default rather than a week
 * with no days in it.
 */
export function teachingDaysInOrder(
  days: readonly number[] | null | undefined,
  weekStartsOn: JsWeekday,
): DayOfWeek[] {
  const valid = [...new Set(days ?? [])].filter(
    (d): d is DayOfWeek => Number.isInteger(d) && d >= 1 && d <= 7,
  );
  const list = valid.length ? valid : DEFAULT_TEACHING_DAYS;
  return [...list].sort(
    (a, b) => weekPosition(a, weekStartsOn) - weekPosition(b, weekStartsOn),
  );
}

/**
 * The weekdays a form offers: the teaching days, plus any day a row already
 * sits on.
 *
 * A school that stops teaching Saturday still has last term's Saturday period
 * on file, and editing it must not quietly move it to a day it can see.
 */
export function weekdayChoices(
  teachingDays: readonly DayOfWeek[],
  weekStartsOn: JsWeekday,
  keep: readonly (DayOfWeek | null | undefined)[] = [],
): { value: DayOfWeek; label: string; short: string }[] {
  const wanted = new Set<number>(teachingDays);
  for (const day of keep) if (day) wanted.add(day);
  return ISO_WEEKDAYS.filter((d) => wanted.has(d.value)).sort(
    (a, b) => weekPosition(a.value, weekStartsOn) - weekPosition(b.value, weekStartsOn),
  );
}
