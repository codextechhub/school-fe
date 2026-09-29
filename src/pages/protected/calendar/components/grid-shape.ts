import { formatTime, type DisplayPrefs } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import type {
  ClashWarning,
  GridCell,
  GridDay,
} from "@/redux/services/calendar/calendar-types";

// Reshaping the grid payload, and reading the clashes off it. Split from the
// component so both can be unit-tested without rendering, and so the drawing
// file exports components only.

export interface GridRow {
  period: number;
  label: string;
  time: string;
  kind: string;
  /**
   * The days this row runs, and ONLY when another row shares its label.
   *
   * A school with a short Friday ends up with two rows both called "Period 1",
   * told apart by their times alone - which is how somebody schedules a lesson
   * into the wrong one. Naming the days resolves it.
   *
   * Empty everywhere else, deliberately. Labelling every row that is not run by
   * every day tags the eight everyday rows with "Monday, Tuesday, Wednesday,
   * Thursday only" the moment one Friday differs, which buries the two rows
   * that actually needed telling apart.
   */
  runsOn: string[];
  cells: (GridCell | null)[];
}

/**
 * Turn the server's day-major payload into the row-major one a table needs.
 *
 * The API answers per day because that is how the rules are computed; a grid is
 * drawn per period. A day that does not run a given period contributes null,
 * which renders as "does not run" rather than as an empty slot. Row times are
 * written on the school's clock (`prefs`).
 */
export function toRows(
  days: GridDay[],
  prefs: DisplayPrefs = activeDisplayPrefs(),
): GridRow[] {
  const seen = new Map<number, GridRow>();
  const order: number[] = [];
  for (const day of days) {
    for (const cell of day.cells) {
      if (!seen.has(cell.period)) {
        seen.set(cell.period, {
          period: cell.period,
          label: cell.period_label,
          // Empty on a teacher's grid, which sends no times. The row then
          // shows its label alone rather than a bare " - ".
          time:
            cell.start_time && cell.end_time
              ? `${formatTime(cell.start_time, prefs)} - ${formatTime(cell.end_time, prefs)}`
              : "",
          kind: cell.kind,
          runsOn: [],
          cells: days.map(() => null),
        });
        order.push(cell.period);
      }
    }
  }
  days.forEach((day, dayIndex) => {
    for (const cell of day.cells) {
      const row = seen.get(cell.period);
      if (row) row.cells[dayIndex] = cell;
    }
  });
  const rows = order.map((p) => seen.get(p)!);
  const labelCounts = new Map<string, number>();
  for (const row of rows) {
    labelCounts.set(row.label, (labelCounts.get(row.label) ?? 0) + 1);
  }
  for (const row of rows) {
    if ((labelCounts.get(row.label) ?? 0) < 2) continue;
    row.runsOn = days
      .filter((_, i) => row.cells[i] !== null)
      .map((d) => d.day_label);
  }
  return rows;
}

/** Which slot ids are involved in at least one clash. */
export function clashedSlotIds(warnings: ClashWarning[] = []): Set<number> {
  const out = new Set<number>();
  for (const w of warnings) for (const id of w.slot_ids ?? []) out.add(id);
  return out;
}

/**
 * Every clash on a teacher's grid, gathered off the cells.
 *
 * A class's grid reports its clashes once, at the top. A teacher's hangs them
 * on each cell, and the same clash appears on both cells of the pair - so this
 * deduplicates by code and sentence, or the panel would list "Ngozi Eze is
 * double-booked" twice for one double-booking.
 */
export function warningsFromDays(days: GridDay[]): ClashWarning[] {
  const byKey = new Map<string, ClashWarning>();
  for (const day of days) {
    for (const cell of day.cells) {
      for (const w of cell.warnings ?? []) {
        byKey.set(`${w.code}:${w.detail}`, w);
      }
    }
  }
  return [...byKey.values()];
}

/**
 * The days on a grid that the school no longer teaches.
 *
 * The server draws such a day only while it still holds a lesson, so the
 * lesson can be seen and cleared: it still counts in clashes and at the
 * publish gate. Absent `is_teaching_day` reads as a teaching day.
 */
export function offDays(days: GridDay[]): GridDay[] {
  return days.filter((day) => day.is_teaching_day === false);
}

/** "Saturday", "Saturday and Sunday", "Friday, Saturday and Sunday". */
export function dayList(days: GridDay[]): string {
  const names = days.map((day) => day.day_label);
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
