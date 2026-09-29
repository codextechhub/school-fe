/**
 * Reading and writing the dates this module deals in.
 *
 * **Everything here is a plain calendar date, never an instant.** The API sends
 * and takes `YYYY-MM-DD`, and a school holiday on 21 November is on 21 November
 * wherever the reader happens to be. `new Date("2025-11-21")` parses as
 * midnight UTC, so a reader west of Greenwich renders it as the 20th - which is
 * how a one-day holiday moves to the wrong day for half the world. Every
 * function below splits the string instead of letting Date parse it.
 *
 * The formatters write the school's chosen date style (`@/lib/dates`). Their
 * `prefs` default to the session's settings, so a plain call is right.
 */

import {
  formatDay,
  formatDayRange,
  formatMonthYear,
  type DisplayPrefs,
} from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import type { JsWeekday } from "@/lib/week";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Weekday names in grid order for a week starting on `weekStartsOn`.
 *
 * The week start is the school's (see `useSchoolWeek`), passed in rather than
 * read here so these stay plain functions a test can call with either day.
 */
export function gridWeekdays(weekStartsOn: JsWeekday): string[] {
  return [
    ...WEEKDAY_NAMES.slice(weekStartsOn),
    ...WEEKDAY_NAMES.slice(0, weekStartsOn),
  ];
}

/** How many cells come before `date` in its grid week. */
export function leadingDays(date: Date, weekStartsOn: JsWeekday): number {
  return (date.getDay() - weekStartsOn + 7) % 7;
}

/** `YYYY-MM-DD` to its three numbers, with no timezone anywhere near it. */
export function parts(iso: string): [year: number, month: number, day: number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

/** A local-midnight Date, safe for arithmetic. Never for display. */
export function localDate(iso: string): Date {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d);
}

export function toIso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "21 Nov 2025", or "21/11/2025", in the school's style. */
export function formatDate(iso: string, prefs: DisplayPrefs = activeDisplayPrefs()): string {
  return formatDay(iso, prefs);
}

/**
 * "21 Nov 2025", or "27 - 31 Oct 2025", or "19 Dec 2025 - 2 Jan 2026".
 *
 * A one-day event reads as one date rather than as a range of one, because a
 * school writing "1 Oct 2025 - 1 Oct 2025" for Independence Day looks like a
 * form that has been filled in wrong. The numeric styles print both ends in
 * full (see `formatDayRange`).
 */
export function formatRange(
  start: string,
  end: string,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  return formatDayRange(start, end, prefs);
}

/** "November 2025", for the month grid's heading. */
export function monthLabel(
  year: number,
  month: number,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  return formatMonthYear({ year, month }, prefs, { month: "long" });
}

/** Whole days from a to b. Both are calendar dates, so this cannot be fractional. */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (localDate(b).getTime() - localDate(a).getTime()) / 86_400_000,
  );
}

/**
 * How "in 12 days" is said, and why it is not always said that way.
 *
 * The server sends `days_away`, which goes negative for something already
 * running. A school reading "-2 days" on a mid-term break that started on
 * Monday learns nothing; "Started 2 days ago" is the same fact in words it can
 * act on.
 */
export function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Started yesterday";
  if (days > 1) return `In ${days} days`;
  return `Started ${Math.abs(days)} days ago`;
}
