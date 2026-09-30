/**
 * The time box's pure helpers: reading what a person typed, writing a stored
 * time back out on the school's clock, and stepping a time with the arrow keys.
 *
 * Split out of the component so a module that exports both a component and
 * functions does not break Fast Refresh for every screen importing the box,
 * the same reason `date-picker-input.utils.ts` sits beside the date picker.
 *
 * Every stored time is `HH:MM` on a 24-hour clock, which is what the API keeps.
 * Only the text on screen follows the school's clock.
 */
import type { ClockStyle } from "@/lib/dates";

export type Meridiem = "am" | "pm";

/** A typed time, read: the stored value and the half of the day it falls in. */
export interface ReadTime {
  /** `HH:MM`, 24-hour. */
  value: string;
  meridiem: Meridiem;
}

/** The bounds and grid a time must sit on, as the native input names them. */
export interface TimeRules {
  /** `HH:MM`, inclusive. */
  min?: string;
  /** `HH:MM`, inclusive. */
  max?: string;
  /** Minutes; a time must be a whole number of steps from `min` (or midnight). */
  step?: number;
}

const DAY_MINUTES = 24 * 60;
const pad = (n: number) => String(n).padStart(2, "0");

/** "pm", "p", "p.m.", "PM" and the like at the end of the text. */
const SUFFIX = /\s*([ap])\.?\s*(?:m\.?)?$/i;
/** "8:30", "8.30", "8 30", "8:" and "08:30:00" (seconds dropped). */
const SEPARATED = /^(\d{1,2})(?:\s*[:.]\s*|\s+)(?:(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?)?$/;
/** "8", "08", "830", "0830". */
const RUN = /^\d{1,4}$/;
const STORED = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

const toValue = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Minutes since midnight for a stored `HH:MM` (or `HH:MM:SS`), else null. */
export function minutesOf(value: string | null | undefined): number | null {
  const match = STORED.exec((value ?? "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * What a person typed, as a stored time, or null when it is not a time.
 *
 * Accepts the fast forms as well as the written ones: "8", "830", "0830",
 * "8:5" (08:05), "8:30 pm", "830p". A lone one or two digits is an hour, three
 * digits are H MM and four are HH MM.
 *
 * Which half of the day:
 * - a typed am/pm wins, and then the hour must be 1 to 12;
 * - otherwise on a 24-hour clock the hour is read as written (0 to 23);
 * - otherwise on a 12-hour clock, 0 or 13 to 23 can only be a 24-hour time,
 *   so it is read as one: a person on a 12-hour school who types 14:00 means
 *   2 pm;
 * - otherwise an hour of 1 to 12 takes `meridiem` when one is given (the half
 *   the person picked on the box's toggle);
 * - otherwise it is guessed by school hours (see {@link guessMeridiem}).
 */
export function readTime(
  text: string,
  clock: ClockStyle,
  meridiem: Meridiem | null = null,
): ReadTime | null {
  let rest = text.trim();
  if (!rest) return null;

  let typed: Meridiem | null = null;
  const suffix = SUFFIX.exec(rest);
  if (suffix) {
    typed = suffix[1].toLowerCase() === "p" ? "pm" : "am";
    rest = rest.slice(0, suffix.index).trim();
  }

  let hour: number;
  let minute: number;
  const separated = SEPARATED.exec(rest);
  if (separated) {
    hour = Number(separated[1]);
    minute = Number(separated[2] ?? 0);
    if (separated[3] !== undefined && Number(separated[3]) > 59) return null;
  } else if (RUN.test(rest)) {
    const cut = rest.length <= 2 ? rest.length : rest.length - 2;
    hour = Number(rest.slice(0, cut));
    minute = Number(rest.slice(cut) || 0);
  } else {
    return null;
  }
  if (minute > 59) return null;

  let hour24: number;
  if (typed) {
    if (hour < 1 || hour > 12) return null;
    hour24 = (hour % 12) + (typed === "pm" ? 12 : 0);
  } else if (clock === "H24" || hour === 0 || hour > 12) {
    if (hour > 23) return null;
    hour24 = hour;
  } else {
    const half = meridiem ?? guessMeridiem(hour);
    hour24 = (hour % 12) + (half === "pm" ? 12 : 0);
  }

  return { value: toValue(hour24 * 60 + minute), meridiem: hour24 >= 12 ? "pm" : "am" };
}

/**
 * The half of the day a bare 12-hour hour most likely means at a school: 7 to
 * 11 are the morning, 12 is noon and 1 to 6 are the afternoon or early
 * evening. A school day runs from about 7 am to 6 pm, so "2" for an exam or
 * "6:30" for a parents' evening means pm, and "7" for assembly means am. The
 * box's toggle shows the guess, so an early or late exception is one tap.
 */
export function guessMeridiem(hour: number): Meridiem {
  return hour >= 7 && hour <= 11 ? "am" : "pm";
}

/**
 * A stored time as the box shows it: "08:30" on a 24-hour clock, "8:30" on a
 * 12-hour one (the am/pm sits in the toggle beside it). Empty for anything
 * that is not a stored time.
 */
export function timeText(value: string | null | undefined, clock: ClockStyle): string {
  const minutes = minutesOf(value);
  if (minutes === null) return "";
  const hour = Math.floor(minutes / 60);
  const minute = pad(minutes % 60);
  return clock === "H24" ? `${pad(hour)}:${minute}` : `${hour % 12 || 12}:${minute}`;
}

/** The half of the day a stored time falls in; null when there is no time. */
export function meridiemOf(value: string | null | undefined): Meridiem | null {
  const minutes = minutesOf(value);
  if (minutes === null) return null;
  return minutes >= 12 * 60 ? "pm" : "am";
}

/** True when a stored time sits inside `min`/`max` and on the `step` grid. */
export function fitsRules(value: string, rules: TimeRules = {}): boolean {
  const minutes = minutesOf(value);
  if (minutes === null) return false;
  const low = minutesOf(rules.min);
  const high = minutesOf(rules.max);
  if (low !== null && minutes < low) return false;
  if (high !== null && minutes > high) return false;
  if (rules.step && rules.step > 1 && (minutes - (low ?? 0)) % rules.step !== 0) {
    return false;
  }
  return true;
}

/**
 * The time one arrow press away: the next (or previous) line on a grid of
 * `by` minutes, so 08:07 goes up to 08:10 and down to 08:05 on a 5-minute
 * grid. Held inside `min`/`max` and the day; it never wraps past midnight.
 */
export function stepTime(
  value: string,
  direction: 1 | -1,
  by: number,
  rules: TimeRules = {},
): string {
  const minutes = minutesOf(value) ?? 0;
  const grid = Math.max(1, Math.round(by));
  const next =
    direction === 1
      ? (Math.floor(minutes / grid) + 1) * grid
      : (Math.ceil(minutes / grid) - 1) * grid;
  const low = Math.max(0, minutesOf(rules.min) ?? 0);
  const high = Math.min(DAY_MINUTES - 1, minutesOf(rules.max) ?? DAY_MINUTES - 1);
  return toValue(Math.min(high, Math.max(low, next)));
}
