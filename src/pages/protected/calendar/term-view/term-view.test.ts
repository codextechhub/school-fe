import { describe, expect, it } from "vitest";

import { monthWindow } from "./month-window";

describe("monthWindow", () => {
  it("includes the neighbouring days needed to complete September 2026", () => {
    // 1 September 2026 is a Tuesday, so the Monday-first grid opens on 31 August.
    expect(monthWindow(2026, 9)).toEqual({
      from: "2026-08-31",
      to: "2026-10-04",
      cells: 35,
    });
  });

  it("expands a month to six weeks when its final week crosses the boundary", () => {
    // 1 August 2026 is a Saturday: five leading days, six weeks in all.
    expect(monthWindow(2026, 8)).toEqual({
      from: "2026-07-27",
      to: "2026-09-06",
      cells: 42,
    });
  });
});
