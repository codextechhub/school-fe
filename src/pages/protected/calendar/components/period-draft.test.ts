import { describe, expect, it } from "vitest";

import { blankPeriod, endFromStart, withStartTime } from "./period-draft";

describe("endFromStart", () => {
  it("adds the default length to the start", () => {
    expect(endFromStart("08:00", 40)).toBe("08:40");
    expect(endFromStart("09:35", 45)).toBe("10:20");
  });

  it("says nothing without a default, a whole start, or room before midnight", () => {
    expect(endFromStart("08:00", null)).toBe("");
    expect(endFromStart("", 40)).toBe("");
    expect(endFromStart("23:40", 40)).toBe("");
  });
});

describe("withStartTime", () => {
  const blank = blankPeriod("all");
  const rules = { minutes: 40, endChosen: false, editing: false };

  it("fills the end of a new period from its start", () => {
    expect(withStartTime(blank, "08:00", rules)).toMatchObject({
      start_time: "08:00",
      end_time: "08:40",
    });
  });

  it("keeps following the start while the end is still the suggestion", () => {
    const first = withStartTime(blank, "08:00", rules);
    expect(withStartTime(first, "08:10", rules).end_time).toBe("08:50");
  });

  it("leaves an end the person typed alone", () => {
    const typed = { ...blank, end_time: "09:00" };
    expect(
      withStartTime(typed, "08:00", { ...rules, endChosen: true }).end_time,
    ).toBe("09:00");
  });

  it("never touches the end of a period being edited", () => {
    const saved = { ...blank, start_time: "08:00", end_time: "08:45" };
    expect(
      withStartTime(saved, "08:05", { ...rules, editing: true }).end_time,
    ).toBe("08:45");
  });

  it("leaves the end empty when the school has no default length", () => {
    expect(withStartTime(blank, "08:00", { ...rules, minutes: null }).end_time).toBe("");
  });
});
