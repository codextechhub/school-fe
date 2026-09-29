/**
 * How this module writes dates and enum codes on screen.
 *
 * Both exist because the API answers in machine terms and the screen must not.
 * A date arrives as "2012-11-07" and a gender as "FEMALE", and printing either
 * verbatim reads as a database row rather than a child's record.
 */

import {
  formatDate as formatSchoolDate,
  formatDateTime as formatSchoolDateTime,
  type DisplayPrefs,
} from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";

/**
 * A date in the school's style: "7 Nov 2012", "07/11/2012" or "2012-11-07".
 *
 * A calendar date ("2012-11-07") is split by hand and never shifted, because
 * `new Date()` reads it as UTC midnight and a birthday west of Greenwich would
 * come out a day early - a wrong date on a legal record, not a formatting
 * quibble. A timestamp is dated in the school's zone. `prefs` defaults to the
 * session's settings; a component that knows the record's branch passes that
 * branch's from `useSchoolDisplay`.
 */
export function formatDate(
  iso: string | null | undefined,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  if (!iso) return "-";
  return formatSchoolDate(iso, prefs);
}

/** A timestamp for the History tab: "7 Nov 2012, 2:32 pm" or "07/11/2012, 14:32". */
export function formatDateTime(
  iso: string | null | undefined,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  if (!iso) return "-";
  return formatSchoolDateTime(iso, prefs);
}

/**
 * "FEMALE" becomes "Female".
 *
 * Only for the handful of enums the API sends without a `*_label` beside them -
 * gender is the one on these screens. Where a label IS served, render that
 * instead: the backend owns the wording, and deriving it here would let two
 * screens disagree the moment the backend rewords one.
 */
export function titleCaseCode(code: string | null | undefined): string {
  if (!code) return "";
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The line under a guardian in a search result: their phone number, then how
 * many students they already stand for.
 *
 * The phone is a Field Access field, absent when the viewer may not read it,
 * and the line then carries the ward count alone rather than a blank.
 */
export function guardianMatchLine(g: { phone?: string; ward_count: number }): string {
  const wards =
    g.ward_count > 0
      ? `already guardian of ${g.ward_count} ${g.ward_count === 1 ? "student" : "students"}`
      : "no students yet";
  return g.phone ? `${g.phone} · ${wards}` : wards;
}
