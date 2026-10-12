import type { DateFormatters } from "@/lib/dates";

/**
 * When something happened to a register, said against the register's own day.
 *
 * A register submitted on its day reads as a time ("8:07 am"). One submitted
 * later reads with its date ("12 Oct 2026, 8:42 am"), because "Submitted
 * 8:42 am" under Friday's register says it went in on Friday when it went in
 * on Monday, and whether a register was taken on time is exactly what a
 * reader of it is checking. The same holds for the email a submit sends.
 */
export function timeOnDay(fmt: DateFormatters, instant: string, day: string): string {
  return fmt.formatDate(instant) === fmt.formatDay(day)
    ? fmt.formatInstantTime(instant)
    : fmt.formatDateTime(instant);
}
