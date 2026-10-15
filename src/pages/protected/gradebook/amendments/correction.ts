import type { Marker, SheetCell, SheetComponent } from "@/redux/services/gradebook/gradebook-types";

import { judgeTyped } from "../sheet/cells";

/** One column of a correction as being edited: typed text, or a marker in its place. */
export interface Draft {
  text: string;
  marker: Marker | null;
}

/** The drafts a correction starts from: the published cells. */
export function draftsFrom(components: SheetComponent[], cells: SheetCell[]): Record<number, Draft> {
  return Object.fromEntries(
    components.map((component) => {
      const cell = cells.find((item) => item.component === component.id);
      return [component.id, { text: cell?.mark === null || cell?.mark === undefined ? "" : String(cell.mark), marker: cell?.marker ?? null }];
    }),
  );
}

export type Judged =
  | { ok: true; cell: SheetCell }
  | { ok: false; message: string };

/**
 * A draft judged as the server will judge it. A published result has a value
 * in every column, so a blank is refused, as the server refuses it
 * (`BLANK_CELL`).
 */
export function judgeDraft(component: SheetComponent, draft: Draft): Judged {
  if (draft.marker) return { ok: true, cell: { component: component.id, mark: null, marker: draft.marker } };
  const typed = judgeTyped(draft.text, component.max_score);
  if (typed.kind === "error") return { ok: false, message: typed.message };
  if (typed.kind === "blank") return { ok: false, message: "Enter a mark, or ABS or Exc" };
  return { ok: true, cell: { component: component.id, mark: typed.mark, marker: null } };
}

const same = (a: SheetCell | undefined, b: SheetCell) => a?.mark === b.mark && (a?.marker ?? null) === b.marker;

/**
 * The cells a correction sends: only the columns that differ from what was
 * published, each judged. `errors` holds a message per column that would be
 * refused, and nothing is sent while any remains.
 */
export function correctionCells(
  components: SheetComponent[],
  published: SheetCell[],
  drafts: Record<number, Draft>,
): { cells: SheetCell[]; errors: Record<number, string> } {
  const cells: SheetCell[] = [];
  const errors: Record<number, string> = {};
  for (const component of components) {
    const judged = judgeDraft(component, drafts[component.id] ?? { text: "", marker: null });
    if (!judged.ok) {
      errors[component.id] = judged.message;
      continue;
    }
    if (!same(published.find((cell) => cell.component === component.id), judged.cell)) cells.push(judged.cell);
  }
  return { cells, errors };
}
