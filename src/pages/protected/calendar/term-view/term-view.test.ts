import { describe, expect, it } from "vitest";

import { monthWindow } from "./month-window";
import { gridWeekdays, leadingDays } from "../components/dates";

describe("monthWindow", () => {
  it("includes the neighbouring days needed to complete September 2026", () => {
    // 1 September 2026 is a Tuesday, so the Monday-first grid opens on 31 August.
    expect(monthWindow(2026, 9, 1)).toEqual({
      from: "2026-08-31",
      to: "2026-10-04",
      cells: 35,
    });
  });

  it("expands a month to six weeks when its final week crosses the boundary", () => {
    // 1 August 2026 is a Saturday: five leading days, six weeks in all.
    expect(monthWindow(2026, 8, 1)).toEqual({
      from: "2026-07-27",
      to: "2026-09-06",
      cells: 42,
    });
  });

  it("opens a Sunday-first month on the Sunday before the 1st", () => {
    // Tuesday 1 September 2026 sits third in a Sunday-first week.
    expect(monthWindow(2026, 9, 0)).toEqual({
      from: "2026-08-30",
      to: "2026-10-03",
      cells: 35,
    });
  });

  it("needs no leading days when the month starts on the week's first day", () => {
    // 1 November 2026 is a Sunday.
    expect(monthWindow(2026, 11, 0).from).toBe("2026-11-01");
    expect(monthWindow(2026, 11, 1).from).toBe("2026-10-26");
  });
});

describe("week-start helpers", () => {
  it("heads the grid with the school's first day", () => {
    expect(gridWeekdays(1)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(gridWeekdays(0)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("counts the cells before a date in its week", () => {
    const sunday = new Date(2026, 10, 1);
    const saturday = new Date(2026, 7, 1);
    expect(leadingDays(sunday, 1)).toBe(6);
    expect(leadingDays(sunday, 0)).toBe(0);
    expect(leadingDays(saturday, 1)).toBe(5);
    expect(leadingDays(saturday, 0)).toBe(6);
  });
});
