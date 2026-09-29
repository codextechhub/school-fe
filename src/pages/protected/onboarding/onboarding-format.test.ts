import { describe, expect, it } from "vitest";
import {
  dateInputToIso,
  humanDate,
  humanDateTime,
  initialsOf,
} from "./onboarding-format";

describe("humanDate / humanDateTime", () => {
  it("renders the human format the contract asks for, never an ISO string", () => {
    expect(humanDate("2026-08-17T11:40:00Z")).toBe("17 Aug 2026");
  });

  it("adds the clock time for a 'last checked' stamp, in the school's zone", () => {
    // 10:40 UTC is 11:40 in Lagos, the default zone, whatever the runner's zone.
    expect(humanDateTime("2026-08-17T10:40:00Z")).toBe("17 Aug 2026, 11:40 am");
  });

  it("follows the school's date style, clock and zone", () => {
    const prefs = { timeZone: "Africa/Nairobi", dateFormat: "DD_MM_YYYY", clock: "H24" } as const;
    expect(humanDate("2026-08-17T22:30:00Z", prefs)).toBe("18/08/2026");
    expect(humanDateTime("2026-08-17T22:30:00Z", prefs)).toBe("18/08/2026, 01:30");
  });

  it("returns an empty string for null and for junk", () => {
    expect(humanDate(null)).toBe("");
    expect(humanDate(undefined)).toBe("");
    expect(humanDate("not a date")).toBe("");
    expect(humanDateTime("")).toBe("");
  });
});

describe("dateInputToIso", () => {
  it("anchors the picked day at midday so a timezone cannot shift it", () => {
    // Midnight would land on the previous evening once a negative offset is
    // applied, which is how a school goes live a day early.
    const iso = dateInputToIso("2026-09-01");
    expect(new Date(iso).getDate()).toBe(1);
    expect(new Date(iso).getMonth()).toBe(8);
  });

  it("returns an empty string for an unset field", () => {
    expect(dateInputToIso("")).toBe("");
  });
});

describe("initialsOf", () => {
  it("takes the first and last initial", () => {
    expect(initialsOf("Brightfield Schools")).toBe("BS");
    expect(initialsOf("St. Monica's Academy Enugu")).toBe("SE");
  });

  it("copes with one word and with nothing", () => {
    expect(initialsOf("Brightfield")).toBe("B");
    expect(initialsOf("")).toBe("");
    expect(initialsOf(null)).toBe("");
  });
});
