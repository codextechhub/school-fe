import { format, isValid, parseISO } from "date-fns";

import { formatDate, formatDateTime, type DisplayPrefs } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";

/**
 * Dates the way the school has asked for them ("17 Aug 2026" by default),
 * never an ISO string. Written once here because the control room, the
 * go-live panel and the request history all print the same timestamps and
 * must not disagree.
 *
 * A null or unparseable value returns an empty string, so a caller can render
 * `humanDate(x) || "-"` rather than guarding first. `prefs` defaults to the
 * session's settings.
 */
const readable = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return isValid(parseISO(value)) ? value : null;
};

/** "17 Aug 2026" */
export function humanDate(
  value: string | null | undefined,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  const at = readable(value);
  return at ? formatDate(at, prefs) : "";
}

/** "17 Aug 2026, 11:40 am" */
export function humanDateTime(
  value: string | null | undefined,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  const at = readable(value);
  return at ? formatDateTime(at, prefs) : "";
}

/** "2026-08-17" - the value shape a native date input wants. */
export function dateInputValue(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

/**
 * A `<input type="date">` value as the ISO datetime the API expects.
 *
 * The field carries a day and the endpoint takes a datetime, so the day is
 * anchored at midday rather than midnight: a preferred date that lands on the
 * previous evening once a timezone is applied is the kind of off-by-one nobody
 * spots until a school asks why it went live a day early.
 */
export function dateInputToIso(value: string): string {
  const parsed = parseISO(`${value}T12:00:00`);
  return isValid(parsed) ? parsed.toISOString() : "";
}

/** Up to two uppercase initials, for the school avatar block. */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
