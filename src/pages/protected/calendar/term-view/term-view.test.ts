import { describe, expect, it } from "vitest";

import { monthWindow } from "./month-window";

describe("monthWindow", () => {
  it("includes the neighbouring days needed to complete September 2026", () => {
    expect(monthWindow(2026, 9)).toEqual({
      from: "2026-08-30",
      to: "2026-10-03",
      cells: 35,
    });
  });

  it("expands a month to six weeks when its final week crosses the boundary", () => {
    expect(monthWindow(2026, 8)).toEqual({
      from: "2026-07-26",
      to: "2026-09-05",
      cells: 42,
    });
  });
});
