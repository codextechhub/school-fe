/**
 * Reading and writing the dates this module deals in.
 *
 * **Everything here is a plain calendar date, never an instant.** The API sends
 * and takes `YYYY-MM-DD`, and a school holiday on 21 November is on 21 November
 * wherever the reader happens to be. `new Date("2025-11-21")` parses as
 * midnight UTC, so a reader west of Greenwich renders it as the 20th - which is
 * how a one-day holiday moves to the wrong day for half the world. Every
 * function below splits the string instead of letting Date parse it.
 */

import { WEEK_STARTS_ON } from "@/lib/week";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT = MONTHS.map((m) => m.slice(0, 3));

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday names in grid order, starting on {@link WEEK_STARTS_ON}. */
export const GRID_WEEKDAYS = [
  ...WEEKDAY_NAMES.slice(WEEK_STARTS_ON),
  ...WEEKDAY_NAMES.slice(0, WEEK_STARTS_ON),
];

/** How many cells come before `date` in its grid week. */
export function leadingDays(date: Date): number {
  return (date.getDay() - WEEK_STARTS_ON + 7) % 7;
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

/** "21 Nov 2025". */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = parts(iso);
  return `${d} ${SHORT[m - 1]} ${y}`;
}

/**
 * "21 Nov 2025", or "27 - 31 Oct 2025", or "19 Dec 2025 - 2 Jan 2026".
 *
 * A one-day event reads as one date rather than as a range of one, because a
 * school writing "1 Oct 2025 - 1 Oct 2025" for Independence Day looks like a
 * form that has been filled in wrong.
 */
export function formatRange(start: string, end: string): string {
  if (!start) return "";
  if (!end || end === start) return formatDate(start);
  const [sy, sm, sd] = parts(start);
  const [ey, em, ed] = parts(end);
  if (sy !== ey) return `${formatDate(start)} - ${formatDate(end)}`;
  if (sm !== em) return `${sd} ${SHORT[sm - 1]} - ${ed} ${SHORT[em - 1]} ${ey}`;
  return `${sd} - ${ed} ${SHORT[em - 1]} ${ey}`;
}

/** "November 2025", for the month grid's heading. */
export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`;
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
