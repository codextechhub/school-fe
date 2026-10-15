import type { CellWrite, Marker, SheetCell, SheetComponent, SheetRow } from "@/redux/services/gradebook/gradebook-types";

/**
 * What a teacher typed into a cell, judged before it is sent.
 *
 * The server checks the same rules and refuses a whole batch for one bad cell,
 * so a cell is only sent once it would be accepted: a whole number from 0 to
 * the column's maximum, or nothing at all (which blanks it). The message is the
 * server's own wording, so a cell reads the same whichever side caught it.
 */
export type TypedCell =
  | { kind: "blank" }
  | { kind: "mark"; mark: number }
  | { kind: "error"; message: string };

export function judgeTyped(text: string, max: number): TypedCell {
  const value = text.trim();
  if (value === "") return { kind: "blank" };
  if (!/^-?\d+(\.\d+)?$/.test(value)) return { kind: "error", message: "Enter a number" };
  const number = Number(value);
  if (!Number.isInteger(number)) return { kind: "error", message: "Whole marks only" };
  if (number < 0) return { kind: "error", message: "Not below 0" };
  if (number > max) return { kind: "error", message: `Max ${max}` };
  return { kind: "mark", mark: number };
}

/** One cell's address on the sheet, as the drafts and errors are keyed. */
export const cellKey = (student: number, component: number) => `${student}:${component}`;

/** The stored cell for a student and column, or a blank one when none is stored. */
export function cellOf(row: SheetRow, component: number): SheetCell {
  return row.cells?.find((cell) => cell.component === component) ?? { component, mark: null, marker: null };
}

/** The text an input shows for a stored cell. A marker shows as a chip, not as text. */
export const cellText = (cell: SheetCell) => (cell.mark === null ? "" : String(cell.mark));

/** Whether what was typed differs from what is stored, so there is something to save. */
export function changed(cell: SheetCell, typed: TypedCell): boolean {
  if (typed.kind === "error") return false;
  if (typed.kind === "blank") return cell.mark !== null || cell.marker !== null;
  return cell.mark !== typed.mark || cell.marker !== null;
}

/** The write that stores what was typed. Only call it for a cell judged clean. */
export function writeFor(
  student: number,
  component: SheetComponent,
  typed: Exclude<TypedCell, { kind: "error" }>,
): CellWrite {
  return {
    student,
    component: component.id,
    mark: typed.kind === "mark" ? typed.mark : null,
    marker: null,
  };
}

/** The write that sets, or with `null` clears, ABS or Excused. */
export function markerWrite(student: number, component: number, marker: Marker | null): CellWrite {
  return { student, component, mark: null, marker };
}

export const MARKER_LABEL: Record<Marker, string> = { ABS: "ABS", EXC: "Exc" };

/** Rows with a blank cell, which is what holds the sheet back from submitting. */
export function rowsWithBlanks(rows: SheetRow[], components: SheetComponent[]): number {
  return rows.filter((row) =>
    components.some((component) => {
      const cell = cellOf(row, component.id);
      return cell.mark === null && cell.marker === null;
    }),
  ).length;
}
