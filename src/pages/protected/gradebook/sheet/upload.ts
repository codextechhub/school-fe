import type { ImportCell, ImportPreview, ImportRow } from "@/redux/services/gradebook/gradebook-types";

/** A row can be saved when it names a pupil and has no issue. */
export const rowIsReady = (row: ImportRow) => row.student !== null && row.issues.length === 0;

/**
 * The rows a checked upload starts with ticked: every ready row that would
 * change something. A row whose every cell is SAME or BLANK changes nothing,
 * so it is left unticked rather than written for nothing.
 */
export function defaultChosen(preview: ImportPreview): number[] {
  return preview.rows
    .filter((row) => rowIsReady(row) && row.cells.some((cell) => cell.outcome === "NEW" || cell.outcome === "REPLACES"))
    .map((row) => row.row_number);
}

const shown = (value: ImportCell["value"]) =>
  value === null || value === undefined || value === "" ? "" : value === "EXC" ? "Exc" : String(value);

/** What one uploaded cell would do, in words, for the preview table. */
export function cellVerdict(cell: ImportCell | undefined, issue: string | undefined): { text: string; tone: "new" | "same" | "replaces" | "blank" | "issue" } {
  if (issue) return { text: issue, tone: "issue" };
  if (!cell) return { text: "", tone: "blank" };
  switch (cell.outcome) {
    case "NEW":
      return { text: shown(cell.value), tone: "new" };
    case "REPLACES":
      return { text: `${shown(cell.value)} (was ${shown(cell.existing) || "blank"})`, tone: "replaces" };
    case "SAME":
      return { text: shown(cell.value), tone: "same" };
    case "BLANK":
      return { text: "left as is", tone: "blank" };
    default:
      return { text: shown(cell.value), tone: "issue" };
  }
}
