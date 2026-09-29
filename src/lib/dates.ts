/**
 * Dates and times the way a school has asked to read them.
 *
 * A school chooses three things (the tenant's `display` settings): the time
 * zone its day runs in, how a date is written, and whether the clock is 12 or
 * 24 hours. Every function here takes those as an explicit {@link DisplayPrefs}
 * and reads nothing else, so the same call gives the same answer on a laptop
 * in Lagos, a phone in London and a test runner in UTC.
 *
 * Two kinds of value arrive from the API and they are never confused:
 *
 * - **A calendar date**, `YYYY-MM-DD`: a birthday, a term start, a holiday. It
 *   is the same day everywhere, so it is split by hand and never given to
 *   `new Date()`, which reads it as UTC midnight and prints the day before for
 *   any reader west of Greenwich. No time zone touches it.
 * - **An instant**, an ISO timestamp with a time: when something was saved or
 *   sent. It is shown as the wall clock of the school's zone (or its branch's),
 *   not the reader's device, so two colleagues in different places read the
 *   same "8:00 am".
 *
 * A wall time with no date (`HH:MM` or `HH:MM:SS`, a bell or an exam slot) is
 * already the school's local time and is only reworded for the clock.
 *
 * Month and weekday names are English, spelled here rather than asked of
 * `Intl`, so the output does not drift with the reader's browser language.
 * `Intl` is used for one job only, turning an instant into a zone's wall
 * clock, and its formatters are cached per zone because building one is
 * expensive and a long table formats hundreds of cells.
 */

/** How a date is written: 29 Sep 2026, 29/09/2026 or 2026-09-29. */
export type DateFormat = "D_MMM_YYYY" | "DD_MM_YYYY" | "YYYY_MM_DD";

/** A 12-hour clock ("8:00 am") or a 24-hour one ("08:00"). */
export type ClockStyle = "H12" | "H24";

/**
 * The display settings as the login and `/me` payloads carry them on the
 * tenant. Every field is optional: a session issued before the settings
 * existed has none, and the defaults then stand in.
 *
 * `branch_zones` names only the branches that keep a zone of their own,
 * keyed by branch id as a string (JSON object keys).
 */
export interface SchoolDisplay {
  time_zone?: string | null;
  date_format?: DateFormat | string | null;
  clock?: ClockStyle | string | null;
  branch_zones?: Record<string, string> | null;
}

/** The resolved choices every formatter here takes. */
export interface DisplayPrefs {
  timeZone: string;
  dateFormat: DateFormat;
  clock: ClockStyle;
}

export const DEFAULT_TIME_ZONE = "Africa/Lagos";

export const DEFAULT_DISPLAY: DisplayPrefs = Object.freeze({
  timeZone: DEFAULT_TIME_ZONE,
  dateFormat: "D_MMM_YYYY",
  clock: "H12",
});

const DATE_FORMATS: readonly DateFormat[] = ["D_MMM_YYYY", "DD_MM_YYYY", "YYYY_MM_DD"];
const CLOCKS: readonly ClockStyle[] = ["H12", "H24"];

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));
const WEEKDAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const WEEKDAYS_SHORT = WEEKDAYS_LONG.map((d) => d.slice(0, 3));

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WALL_TIME = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

const pad = (n: number) => String(n).padStart(2, "0");

// ── Zones ────────────────────────────────────────────────────────────────────

/** One wall-clock formatter per zone, built on first use. */
const zoneFormatters = new Map<string, Intl.DateTimeFormat | null>();

/**
 * The formatter that reads an instant as `zone`'s wall clock, or null when the
 * runtime does not know the zone. `hourCycle: "h23"` keeps midnight as 00
 * rather than the 24 some engines print with `hour12: false`.
 */
function zoneFormatter(zone: string): Intl.DateTimeFormat | null {
  if (!zoneFormatters.has(zone)) {
    let formatter: Intl.DateTimeFormat | null = null;
    try {
      formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
    } catch {
      formatter = null;
    }
    zoneFormatters.set(zone, formatter);
  }
  return zoneFormatters.get(zone) ?? null;
}

/** Whether the runtime can place an instant in `zone`. */
export function isValidTimeZone(zone: string | null | undefined): zone is string {
  return !!zone && zoneFormatter(zone) !== null;
}

/** `zone` when the runtime knows it, else the default zone. */
function knownZone(zone: string | null | undefined): string {
  return isValidTimeZone(zone) ? zone : DEFAULT_TIME_ZONE;
}

/** A moment read as the wall clock of one zone. */
interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClockOf(instant: Date, zone: string): WallClock {
  const formatter = zoneFormatter(knownZone(zone)) as Intl.DateTimeFormat;
  const out: Record<string, number> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

// ── Choosing the prefs ───────────────────────────────────────────────────────

/**
 * The zone a thing is shown in: its branch's own zone when that branch keeps
 * one, else the school's, else the default.
 *
 * `branchId` null or absent means the thing is the whole school's (or the
 * screen is the whole-school view), which reads in the school's zone.
 */
export function zoneFor(
  display: SchoolDisplay | null | undefined,
  branchId?: number | string | null,
): string {
  if (branchId != null) {
    const own = display?.branch_zones?.[String(branchId)];
    if (isValidTimeZone(own)) return own;
  }
  return knownZone(display?.time_zone);
}

/** One frozen prefs object per distinct choice, so a hook's memo stays stable. */
const internedPrefs = new Map<string, DisplayPrefs>();

function internPrefs(timeZone: string, dateFormat: DateFormat, clock: ClockStyle) {
  const key = `${timeZone}|${dateFormat}|${clock}`;
  let prefs = internedPrefs.get(key);
  if (!prefs) {
    prefs = Object.freeze({ timeZone, dateFormat, clock });
    internedPrefs.set(key, prefs);
  }
  return prefs;
}

/**
 * The tenant's display settings as the prefs every formatter takes, for one
 * branch or the whole school (see {@link zoneFor}). An absent or unknown value
 * falls back to its default, so a code the backend adds later degrades to the
 * house style rather than to a blank.
 *
 * The same inputs always return the same object.
 */
export function resolveDisplayPrefs(
  display: SchoolDisplay | null | undefined,
  branchId?: number | string | null,
): DisplayPrefs {
  const dateFormat = DATE_FORMATS.includes(display?.date_format as DateFormat)
    ? (display?.date_format as DateFormat)
    : DEFAULT_DISPLAY.dateFormat;
  const clock = CLOCKS.includes(display?.clock as ClockStyle)
    ? (display?.clock as ClockStyle)
    : DEFAULT_DISPLAY.clock;
  return internPrefs(zoneFor(display, branchId), dateFormat, clock);
}

// ── Reading values ───────────────────────────────────────────────────────────

/** A calendar date's three numbers, or null when it is not a real date. */
function dayParts(iso: string): { y: number; m: number; d: number } | null {
  const match = ISO_DAY.exec(iso);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1) return null;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d > lastDay ? null : { y, m, d };
}

/** An instant from an ISO timestamp, epoch ms or a Date, or null. */
function toInstant(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type DateValue = string | number | Date | null | undefined;

/**
 * The calendar date a value falls on, as `YYYY-MM-DD`.
 *
 * A calendar date (or a timestamp's leading date, when the value has no time
 * part) is returned as written. An instant is placed in `zone` first, so a
 * payment saved at 23:30 UTC is dated the next morning in Lagos.
 */
export function calendarDayOf(value: DateValue, zone: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (dayParts(trimmed)) return trimmed;
    if (!/\d[T ]\d/.test(trimmed)) return null;
  }
  const instant = toInstant(value);
  if (!instant) return null;
  const wall = wallClockOf(instant, zone);
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
}

// ── Dates ────────────────────────────────────────────────────────────────────

export interface DayOptions {
  /** Month spelling in the D MMM YYYY style. The numeric styles ignore it. */
  month?: "short" | "long";
  /** False drops the year: "29 Sep", "29/09", "09-29". */
  year?: boolean;
  /** Prefix a weekday: "Tuesday, 29 Sep 2026". */
  weekday?: "short" | "long";
}

/**
 * A calendar date in the school's style: "29 Sep 2026", "29/09/2026" or
 * "2026-09-29".
 *
 * Only for `YYYY-MM-DD`. Empty input gives "" and anything unreadable comes
 * back as written, so a bad value is visible rather than silently blank.
 */
export function formatDay(
  iso: string | null | undefined,
  prefs: DisplayPrefs,
  options: DayOptions = {},
): string {
  if (!iso) return "";
  const parts = dayParts(iso.trim());
  if (!parts) return iso;
  const { y, m, d } = parts;
  const withYear = options.year !== false;
  let text: string;
  switch (prefs.dateFormat) {
    case "DD_MM_YYYY":
      text = withYear ? `${pad(d)}/${pad(m)}/${y}` : `${pad(d)}/${pad(m)}`;
      break;
    case "YYYY_MM_DD":
      text = withYear ? `${y}-${pad(m)}-${pad(d)}` : `${pad(m)}-${pad(d)}`;
      break;
    default: {
      const month = (options.month === "long" ? MONTHS_LONG : MONTHS_SHORT)[m - 1];
      text = withYear ? `${d} ${month} ${y}` : `${d} ${month}`;
    }
  }
  if (!options.weekday) return text;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const name = (options.weekday === "long" ? WEEKDAYS_LONG : WEEKDAYS_SHORT)[weekday];
  return `${name}, ${text}`;
}

/**
 * The date of either kind of value in the school's style.
 *
 * A calendar date is shown as written; an instant is dated in the prefs' zone
 * (see {@link calendarDayOf}). The right call when a field may hold either.
 */
export function formatDate(
  value: DateValue,
  prefs: DisplayPrefs,
  options?: DayOptions,
): string {
  if (value == null || value === "") return "";
  const day = calendarDayOf(value, prefs.timeZone);
  return day ? formatDay(day, prefs, options) : String(value);
}

/** Day and month only: "29 Sep", "29/09" or "09-29". */
export function formatDayMonth(value: DateValue, prefs: DisplayPrefs): string {
  return formatDate(value, prefs, { year: false });
}

/**
 * A month and year as a label: "Sep 2026", or "September 2026" with
 * `month: "long"`.
 *
 * Spelled with the month's name in every date style. A month on its own is a
 * heading or a period ("Sep 2026 - Jul 2027"), which a reader scans rather
 * than matches against a record, and "09/2026" reads as a card expiry.
 */
export function formatMonthYear(
  value: DateValue | { year: number; month: number },
  prefs: DisplayPrefs,
  options: { month?: "short" | "long" } = {},
): string {
  let year: number;
  let month: number;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    ({ year, month } = value);
  } else {
    const day = calendarDayOf(value, prefs.timeZone)
      ?? (typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null);
    if (!day) return value == null ? "" : String(value);
    [year, month] = day.split("-").map(Number);
  }
  if (month < 1 || month > 12) return "";
  const name = (options.month === "long" ? MONTHS_LONG : MONTHS_SHORT)[month - 1];
  return `${name} ${year}`;
}

/** A month's English name from its number (1-12): "Sep", or "September". */
export function monthName(month: number, style: "short" | "long" = "short"): string {
  return (style === "long" ? MONTHS_LONG : MONTHS_SHORT)[month - 1] ?? "";
}

/**
 * A span of calendar dates, as short as it can be said without losing a
 * part: "21 Nov 2025", "27 - 31 Oct 2025", "28 Oct - 2 Nov 2025" or
 * "19 Dec 2025 - 2 Jan 2026" in the D MMM YYYY style.
 *
 * The numeric styles always print both dates in full ("27/10/2025 -
 * 31/10/2025"): half a numeric date is a puzzle. A one-day span reads as one
 * date in every style, because "1 Oct 2025 - 1 Oct 2025" looks like a form
 * filled in wrong.
 */
export function formatDayRange(
  start: string | null | undefined,
  end: string | null | undefined,
  prefs: DisplayPrefs,
): string {
  if (!start) return "";
  if (!end || end === start) return formatDay(start, prefs);
  const a = dayParts(start);
  const b = dayParts(end);
  if (!a || !b || prefs.dateFormat !== "D_MMM_YYYY" || a.y !== b.y) {
    return `${formatDay(start, prefs)} - ${formatDay(end, prefs)}`;
  }
  if (a.m !== b.m) {
    return `${a.d} ${MONTHS_SHORT[a.m - 1]} - ${b.d} ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
  }
  return `${a.d} - ${b.d} ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
}

// ── Times ────────────────────────────────────────────────────────────────────

function clockText(hour: number, minute: number, clock: ClockStyle): string {
  if (clock === "H24") return `${pad(hour)}:${pad(minute)}`;
  return `${hour % 12 || 12}:${pad(minute)} ${hour >= 12 ? "pm" : "am"}`;
}

/**
 * A wall time (`HH:MM` or `HH:MM:SS`) on the school's clock: "8:00 am" or
 * "08:00". It is already local time, so no zone applies. Seconds are dropped;
 * nothing a school reads is timed to the second.
 */
export function formatTime(value: string | null | undefined, prefs: DisplayPrefs): string {
  if (!value) return "";
  const match = WALL_TIME.exec(value.trim());
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return value;
  return clockText(hour, minute, prefs.clock);
}

/** The time of an instant, on the school's clock and in its zone. */
export function formatInstantTime(value: DateValue, prefs: DisplayPrefs): string {
  if (value == null || value === "") return "";
  const instant = toInstant(value);
  if (!instant) return String(value);
  const wall = wallClockOf(instant, prefs.timeZone);
  return clockText(wall.hour, wall.minute, prefs.clock);
}

/**
 * An instant as date and time: "29 Sep 2026, 8:00 am", "29/09/2026, 08:00".
 *
 * A bare calendar date has no time to show and is printed as a date, so a
 * field that is sometimes one and sometimes the other never gains a made-up
 * midnight.
 */
export function formatDateTime(
  value: DateValue,
  prefs: DisplayPrefs,
  options?: DayOptions,
): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" && dayParts(value.trim())) {
    return formatDay(value.trim(), prefs, options);
  }
  const instant = toInstant(value);
  if (!instant) return String(value);
  const wall = wallClockOf(instant, prefs.timeZone);
  const day = `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
  return `${formatDay(day, prefs, options)}, ${clockText(wall.hour, wall.minute, prefs.clock)}`;
}

// ── Now ──────────────────────────────────────────────────────────────────────

/** Today's calendar date in `zone`, as `YYYY-MM-DD`. */
export function todayIn(zone: string, now: Date = new Date()): string {
  const wall = wallClockOf(now, zone);
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
}

/** The present moment as `zone`'s wall clock. */
export interface ZoneNow {
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM`, 24-hour, comparable with a bell time. */
  time: string;
  hour: number;
  minute: number;
}

export function nowIn(zone: string, now: Date = new Date()): ZoneNow {
  const wall = wallClockOf(now, zone);
  return {
    date: `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`,
    time: `${pad(wall.hour)}:${pad(wall.minute)}`,
    hour: wall.hour,
    minute: wall.minute,
  };
}

/**
 * The instant a wall-clock moment in `zone` names, as an ISO string: the
 * "23:59:59 on 30 Sep in Lagos" a date field means when it sets an expiry.
 *
 * The zone's offset is read at the guessed instant and read again at the
 * answer, so a moment beside a daylight-saving change still lands on the
 * right hour. Null when the date or time is not readable.
 */
export function zonedInstant(date: string, time: string, zone: string): string | null {
  const day = dayParts(date);
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!day || !clock) return null;
  const guess = Date.UTC(
    day.y, day.m - 1, day.d, Number(clock[1]), Number(clock[2]), Number(clock[3] ?? 0),
  );
  const offsetAt = (at: number) => {
    const wall = wallClockOf(new Date(at), zone);
    return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second) - at;
  };
  const first = guess - offsetAt(guess);
  const settled = guess - offsetAt(first);
  return new Date(settled).toISOString();
}

/**
 * Whole calendar days from one `YYYY-MM-DD` to another, negative when `to` is
 * earlier; null when either is not a real date. Counted on the calendar, so a
 * daylight-saving night or the reader's zone cannot make it fractional.
 */
export function daysBetween(from: string, to: string): number | null {
  const a = dayParts(from);
  const b = dayParts(to);
  if (!a || !b) return null;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** The calendar day `days` after (or before) `iso`, still as `YYYY-MM-DD`. */
export function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d + days));
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
}

/**
 * "Today", "Yesterday", or the date in the school's style, judged by the
 * school's calendar rather than the reader's.
 */
export function formatRelativeDay(
  value: DateValue,
  prefs: DisplayPrefs,
  now: Date = new Date(),
): string {
  const day = calendarDayOf(value, prefs.timeZone);
  if (!day) return value == null || value === "" ? "" : String(value);
  const today = todayIn(prefs.timeZone, now);
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  return formatDay(day, prefs);
}

// ── Bound set ────────────────────────────────────────────────────────────────

/** Every formatter above with the prefs already applied. */
export interface DateFormatters {
  prefs: DisplayPrefs;
  formatDay: (iso: string | null | undefined, options?: DayOptions) => string;
  formatDate: (value: DateValue, options?: DayOptions) => string;
  formatDayMonth: (value: DateValue) => string;
  formatMonthYear: (
    value: DateValue | { year: number; month: number },
    options?: { month?: "short" | "long" },
  ) => string;
  formatDayRange: (start: string | null | undefined, end: string | null | undefined) => string;
  formatTime: (value: string | null | undefined) => string;
  formatInstantTime: (value: DateValue) => string;
  formatDateTime: (value: DateValue, options?: DayOptions) => string;
  formatRelativeDay: (value: DateValue, now?: Date) => string;
  /** Today in the prefs' zone, `YYYY-MM-DD`, read at call time. */
  today: () => string;
  /** The present moment in the prefs' zone, read at call time. */
  now: () => ZoneNow;
}

const boundSets = new WeakMap<DisplayPrefs, DateFormatters>();

/**
 * The formatters bound to one set of prefs. Cached per prefs object, and
 * {@link resolveDisplayPrefs} interns those, so the same choice hands back
 * the same functions.
 */
export function bindFormatters(prefs: DisplayPrefs): DateFormatters {
  const cached = boundSets.get(prefs);
  if (cached) return cached;
  const set: DateFormatters = {
    prefs,
    formatDay: (iso, options) => formatDay(iso, prefs, options),
    formatDate: (value, options) => formatDate(value, prefs, options),
    formatDayMonth: (value) => formatDayMonth(value, prefs),
    formatMonthYear: (value, options) => formatMonthYear(value, prefs, options),
    formatDayRange: (start, end) => formatDayRange(start, end, prefs),
    formatTime: (value) => formatTime(value, prefs),
    formatInstantTime: (value) => formatInstantTime(value, prefs),
    formatDateTime: (value, options) => formatDateTime(value, prefs, options),
    formatRelativeDay: (value, now) => formatRelativeDay(value, prefs, now),
    today: () => todayIn(prefs.timeZone),
    now: () => nowIn(prefs.timeZone),
  };
  boundSets.set(prefs, set);
  return set;
}

/**
 * A time zone as people say it ("West Africa Standard Time", "East Africa
 * Time"), or the zone's own name when the runtime has no long name for it.
 */
export function zoneLongName(zone: string, now: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "long" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName");
    return part?.value || zone;
  } catch {
    return zone;
  }
}

