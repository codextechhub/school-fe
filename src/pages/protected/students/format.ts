/**
 * How this module writes dates and enum codes on screen.
 *
 * Both exist because the API answers in machine terms and the screen must not.
 * A date arrives as "2012-11-07" and a gender as "FEMALE", and printing either
 * verbatim reads as a database row rather than a child's record.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "2012-11-07" becomes "7 Nov 2012".
 *
 * Parsed by hand rather than through `new Date(iso)`. That constructor reads a
 * bare date as UTC midnight and then prints it in the reader's zone, so a
 * birthday west of Greenwich comes out a day early - which is a wrong date on a
 * legal record, not a formatting quibble.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return String(iso);
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return String(iso);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** A timestamp for the History tab: "7 Nov 2012, 14:32". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return String(iso);
  const time = at.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(iso)}, ${time}`;
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
