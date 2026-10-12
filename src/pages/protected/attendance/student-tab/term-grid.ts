import type { StudentDay } from "@/redux/services/attendance/attendance-types";

/** One square of a month: a day the term lists, or a gap before the first. */
export type GridCell = { blank: true; key: string } | { blank: false; key: string; day: StudentDay };

export interface GridMonth {
  /** `YYYY-MM` */
  month: string;
  cells: GridCell[];
}

/**
 * The term's days laid out as month calendars, a column per weekday.
 *
 * The server lists the weekdays and teaching days of the term; a date it does
 * not list (a weekend at a school that does not teach on one) is a gap, so the
 * columns stay true weekdays. Each month opens with as many gaps as it takes
 * for its first listed day to land under its weekday, counted from the
 * school's own first day of the week (0 is Sunday, as `Date#getUTCDay`).
 */
export function termGrid(days: StudentDay[], weekStartsOn: number): GridMonth[] {
  const byMonth = new Map<string, Map<string, StudentDay>>();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    byMonth.get(month)!.set(day.date, day);
  }

  return [...byMonth.keys()].sort().map((month) => {
    const listed = byMonth.get(month)!;
    const dates = [...listed.keys()].sort();
    const first = new Date(`${dates[0]}T00:00:00Z`);
    const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
    const lead = (first.getUTCDay() - weekStartsOn + 7) % 7;

    const cells: GridCell[] = [];
    for (let i = 0; i < lead; i++) cells.push({ blank: true, key: `${month}-lead-${i}` });
    for (const at = new Date(first); at <= last; at.setUTCDate(at.getUTCDate() + 1)) {
      const iso = at.toISOString().slice(0, 10);
      const day = listed.get(iso);
      cells.push(day ? { blank: false, key: iso, day } : { blank: true, key: iso });
    }
    return { month, cells };
  });
}
