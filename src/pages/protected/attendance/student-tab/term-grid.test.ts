import { describe, expect, it } from "vitest";

import type { StudentDay } from "@/redux/services/attendance/attendance-types";

import { termGrid } from "./term-grid";

const day = (date: string): StudentDay => ({
  date,
  state: "MARKED",
  class_id: 1,
  mark: "P",
  closed_reason: null,
});

describe("termGrid", () => {
  it("lands the first day under its weekday, counted from Monday", () => {
    // 1 October 2026 is a Thursday: three gaps for Monday to Wednesday.
    const [october] = termGrid([day("2026-10-01"), day("2026-10-02")], 1);
    expect(october.cells.slice(0, 3).every((cell) => cell.blank)).toBe(true);
    expect(october.cells[3]).toMatchObject({ blank: false, key: "2026-10-01" });
  });

  it("counts from the school's own first day of the week", () => {
    const [october] = termGrid([day("2026-10-01")], 0);
    expect(october.cells.filter((cell) => cell.blank)).toHaveLength(4);
  });

  it("leaves a gap for a date the term does not list, so columns stay weekdays", () => {
    // Friday 2 and Monday 5 October: the weekend between them is two gaps.
    const [october] = termGrid([day("2026-10-02"), day("2026-10-05")], 1);
    const keys = october.cells.filter((cell) => !cell.blank).map((cell) => cell.key);
    expect(keys).toEqual(["2026-10-02", "2026-10-05"]);
    expect(october.cells.slice(-3).map((cell) => cell.blank)).toEqual([true, true, false]);
  });

  it("splits the term by month, in order", () => {
    const months = termGrid([day("2026-11-02"), day("2026-10-30")], 1).map((m) => m.month);
    expect(months).toEqual(["2026-10", "2026-11"]);
  });
});
