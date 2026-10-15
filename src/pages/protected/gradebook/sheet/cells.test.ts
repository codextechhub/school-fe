import { describe, expect, it } from "vitest";

import { changed, judgeTyped, rowsWithBlanks, writeFor } from "./cells";

const exam = { id: 10, name: "Examination", short_name: "EXAM", max_score: 60, is_exam: true };

describe("judgeTyped", () => {
  it("reads nothing typed as a blank, not a zero", () => {
    expect(judgeTyped("", 20)).toEqual({ kind: "blank" });
    expect(judgeTyped("   ", 20)).toEqual({ kind: "blank" });
  });

  it("accepts a whole mark from 0 to the maximum", () => {
    expect(judgeTyped("0", 20)).toEqual({ kind: "mark", mark: 0 });
    expect(judgeTyped(" 20 ", 20)).toEqual({ kind: "mark", mark: 20 });
  });

  it("refuses what the server would refuse, before sending it", () => {
    expect(judgeTyped("21", 20)).toEqual({ kind: "error", message: "Max 20" });
    expect(judgeTyped("12.5", 20)).toEqual({ kind: "error", message: "Whole marks only" });
    expect(judgeTyped("-1", 20)).toEqual({ kind: "error", message: "Not below 0" });
    expect(judgeTyped("abs", 20)).toEqual({ kind: "error", message: "Enter a number" });
  });

  it("accepts a decimal that is a whole number, as the server does", () => {
    expect(judgeTyped("12.0", 20)).toEqual({ kind: "mark", mark: 12 });
  });
});

describe("changed", () => {
  const blank = { component: 10, mark: null, marker: null };
  const forty = { component: 10, mark: 40, marker: null };
  const absent = { component: 10, mark: null, marker: "ABS" as const };

  it("saves nothing when the value is what is stored", () => {
    expect(changed(forty, { kind: "mark", mark: 40 })).toBe(false);
    expect(changed(blank, { kind: "blank" })).toBe(false);
  });

  it("saves a new mark, and a blank over a stored mark or marker", () => {
    expect(changed(forty, { kind: "mark", mark: 41 })).toBe(true);
    expect(changed(forty, { kind: "blank" })).toBe(true);
    expect(changed(absent, { kind: "blank" })).toBe(true);
  });

  it("saves a mark typed over ABS, which replaces the marker", () => {
    expect(changed(absent, { kind: "mark", mark: 0 })).toBe(true);
  });

  it("never saves a cell that failed its check", () => {
    expect(changed(forty, { kind: "error", message: "Max 60" })).toBe(false);
  });
});

describe("writeFor", () => {
  it("sends a mark with no marker, and a blank as two nulls", () => {
    expect(writeFor(7, exam, { kind: "mark", mark: 51 })).toEqual({ student: 7, component: 10, mark: 51, marker: null });
    expect(writeFor(7, exam, { kind: "blank" })).toEqual({ student: 7, component: 10, mark: null, marker: null });
  });
});

describe("rowsWithBlanks", () => {
  it("counts students with any blank cell, where ABS and Excused are not blank", () => {
    const rows = [
      { student: { id: 1, name: "A", admission_number: "" }, cells: [{ component: 10, mark: 40, marker: null }] },
      { student: { id: 2, name: "B", admission_number: "" }, cells: [{ component: 10, mark: null, marker: "EXC" as const }] },
      { student: { id: 3, name: "C", admission_number: "" }, cells: [{ component: 10, mark: null, marker: null }] },
      { student: { id: 4, name: "D", admission_number: "" }, cells: [] },
    ];
    expect(rowsWithBlanks(rows, [exam])).toBe(2);
  });
});
