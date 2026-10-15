import { describe, expect, it } from "vitest";

import type { SheetCell, SheetComponent } from "@/redux/services/gradebook/gradebook-types";

import { correctionCells, draftsFrom } from "./correction";

/**
 * Tunde Bello's Mathematics was published as CA1 7, CA2 7, Examination 26.
 * His teacher finds the examination was added up wrongly: it should be 36.
 */
const components: SheetComponent[] = [
  { id: 1, name: "1st CA", short_name: "CA1", max_score: 20, is_exam: false },
  { id: 2, name: "2nd CA", short_name: "CA2", max_score: 20, is_exam: false },
  { id: 3, name: "Examination", short_name: "EXAM", max_score: 60, is_exam: true },
];
const published: SheetCell[] = [
  { component: 1, mark: 7, marker: null },
  { component: 2, mark: 7, marker: null },
  { component: 3, mark: 26, marker: null },
];

describe("a correction's cells", () => {
  it("starts from the published marks and sends nothing until one changes", () => {
    const drafts = draftsFrom(components, published);
    expect(drafts[3]).toEqual({ text: "26", marker: null });
    expect(correctionCells(components, published, drafts)).toEqual({ cells: [], errors: {} });
  });

  it("sends only the column that changed", () => {
    const drafts = { ...draftsFrom(components, published), 3: { text: "36", marker: null } };
    expect(correctionCells(components, published, drafts).cells).toEqual([{ component: 3, mark: 36, marker: null }]);
  });

  it("sends a marker in place of a mark", () => {
    const drafts = { ...draftsFrom(components, published), 2: { text: "7", marker: "ABS" as const } };
    expect(correctionCells(components, published, drafts).cells).toEqual([{ component: 2, mark: null, marker: "ABS" }]);
  });

  it("refuses a blank, a mark over the column's maximum and a fraction, as the server would", () => {
    const drafts = {
      1: { text: "", marker: null },
      2: { text: "21", marker: null },
      3: { text: "30.5", marker: null },
    };
    const { cells, errors } = correctionCells(components, published, drafts);
    expect(cells).toEqual([]);
    expect(errors).toEqual({ 1: "Enter a mark, or ABS or Exc", 2: "Max 20", 3: "Whole marks only" });
  });
});
