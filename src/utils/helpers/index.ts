// Shared formatting helpers. Anything no longer referenced anywhere in src/
// gets deleted rather than kept "just in case" - git history has the old
// implementations (currency formatting, duration, Vimeo IDs, …).

import { calendarDayOf, formatRelativeDay, type DisplayPrefs } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";

export function returnInitial(name: string) {
  // Initials from the first two words; a single-word name yields a single
  // letter (a mononym avatar shouldn't look like a two-letter typo, e.g.
  // "John" → "J", not "JO"). Empty segments from stray spaces are ignored.
  const words = (name ?? "").split(" ").filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase();
}

/**
 * "Today", "Yesterday", or the date in the school's style ("3 Sep 2026" by
 * default), judged by the school's calendar rather than the reader's device.
 *
 * The shared finance package's import screens call this through the
 * `@/utils/helpers` path with a single argument, so the signature stays
 * `(dateStr)` and the prefs default to the session's. The wording is
 * `formatRelativeDay` from `@/lib/dates`, so these screens and the school's
 * own read the same. "-" for anything empty or unreadable.
 */
export const formatRelativeDate = (
  dateStr: string | null | undefined,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string =>
  calendarDayOf(dateStr, prefs.timeZone) ? formatRelativeDay(dateStr, prefs) : "-";

/**
 * Generates a URL query string from a given object of parameters.
 *
 * Filters out parameters with `undefined`, `null` or empty-string values. If a
 * parameter value is an array, it generates one key-value pair per element
 * (repeated-key params, e.g. `?status=A&status=B`).
 *
 * Note: `0` and `false` are intentionally kept - numeric/boolean filters of
 * those values are meaningful query params; only `undefined`/`null`/`""` are
 * treated as "unset".
 *
 * @example
 * generateQueryString({ foo: "bar", baz: [1, 2], empty: undefined });
 * // Returns: "?foo=bar&baz=1&baz=2"
 */
type QueryValue = string | number | boolean | (string | number)[];

export function generateQueryString(params: Record<string, QueryValue>): string {
  const query = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
    .map(([key, value]) =>
      Array.isArray(value)
        ? value
            .map(
              (val) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`
            )
            .join("&")
        : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  return query ? `?${query}` : "";
}
