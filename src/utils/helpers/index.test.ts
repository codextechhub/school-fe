import { describe, expect, it } from "vitest";

import { todayIn } from "@/lib/dates";
import { formatRelativeDate } from "./index";

describe("formatRelativeDate", () => {
  it("says Today and Yesterday by the school's calendar", () => {
    const today = todayIn("Africa/Lagos");
    expect(formatRelativeDate(`${today}T11:00:00+01:00`)).toBe("Today");
    const [y, m, d] = today.split("-").map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    expect(formatRelativeDate(yesterday)).toBe("Yesterday");
  });

  it("writes an older date in the school's style, not with an ordinal", () => {
    expect(formatRelativeDate("2020-09-03T10:00:00Z")).toBe("3 Sep 2020");
    const prefs = { timeZone: "Africa/Lagos", dateFormat: "DD_MM_YYYY", clock: "H24" } as const;
    expect(formatRelativeDate("2020-09-03T10:00:00Z", prefs)).toBe("03/09/2020");
  });

  it("gives a dash for nothing or junk", () => {
    expect(formatRelativeDate("")).toBe("-");
    expect(formatRelativeDate(null)).toBe("-");
    expect(formatRelativeDate("not a date")).toBe("-");
  });
});
