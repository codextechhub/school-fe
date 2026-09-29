import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  DEFAULT_DISPLAY,
  bindFormatters,
  calendarDayOf,
  daysBetween,
  formatDate,
  formatDateTime,
  formatDay,
  formatDayMonth,
  formatDayRange,
  formatInstantTime,
  formatMonthYear,
  formatRelativeDay,
  formatTime,
  isValidTimeZone,
  nowIn,
  resolveDisplayPrefs,
  shiftDay,
  todayIn,
  zonedInstant,
  zoneFor,
  type DisplayPrefs,
  zoneLongName,
} from "./dates";

const lagos12: DisplayPrefs = DEFAULT_DISPLAY;
const slash24: DisplayPrefs = { timeZone: "Africa/Lagos", dateFormat: "DD_MM_YYYY", clock: "H24" };
const iso24: DisplayPrefs = { timeZone: "Africa/Lagos", dateFormat: "YYYY_MM_DD", clock: "H24" };
const nairobi12: DisplayPrefs = { ...DEFAULT_DISPLAY, timeZone: "Africa/Nairobi" };

/**
 * 22:30 UTC on 29 September: 23:30 in Lagos (UTC+1) and 01:30 on the 30th in
 * Nairobi (UTC+3), so the two zones disagree about the date.
 */
const BOUNDARY = "2026-09-29T22:30:00Z";

/**
 * The runner's own zone is set far west of Greenwich, where a date-only string
 * parsed by `new Date()` falls on the previous day. Nothing below may shift.
 */
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/Los_Angeles";
});
afterAll(() => {
  process.env.TZ = originalTz;
});

describe("formatDay", () => {
  it("writes a calendar date in each of the three styles", () => {
    expect(formatDay("2026-09-29", lagos12)).toBe("29 Sep 2026");
    expect(formatDay("2026-09-29", slash24)).toBe("29/09/2026");
    expect(formatDay("2026-09-29", iso24)).toBe("2026-09-29");
  });

  it("never shifts a date-only string, whatever the device zone", () => {
    expect(new Date("2026-01-01").getDate()).toBe(31);
    expect(formatDay("2026-01-01", lagos12)).toBe("1 Jan 2026");
    expect(formatDay("2026-01-01", slash24)).toBe("01/01/2026");
    expect(formatDay("2026-01-01", { ...lagos12, timeZone: "Pacific/Kiritimati" })).toBe("1 Jan 2026");
  });

  it("offers a long month, no year, and a weekday", () => {
    expect(formatDay("2026-09-29", lagos12, { month: "long" })).toBe("29 September 2026");
    expect(formatDay("2026-09-29", slash24, { month: "long" })).toBe("29/09/2026");
    expect(formatDay("2026-09-29", lagos12, { year: false })).toBe("29 Sep");
    expect(formatDay("2026-09-29", slash24, { year: false })).toBe("29/09");
    expect(formatDay("2026-09-29", iso24, { year: false })).toBe("09-29");
    expect(formatDay("2026-09-29", lagos12, { weekday: "long", month: "long", year: false }))
      .toBe("Tuesday, 29 September");
    expect(formatDay("2026-09-29", iso24, { weekday: "short" })).toBe("Tue, 2026-09-29");
  });

  it("gives empty for nothing and the input back for something unreadable", () => {
    expect(formatDay("", lagos12)).toBe("");
    expect(formatDay(null, lagos12)).toBe("");
    expect(formatDay("2026-02-30", lagos12)).toBe("2026-02-30");
    expect(formatDay("soon", lagos12)).toBe("soon");
  });
});

describe("calendarDayOf and formatDate", () => {
  it("keeps a calendar date as written", () => {
    expect(calendarDayOf("2012-11-07", "Africa/Nairobi")).toBe("2012-11-07");
    expect(formatDate("2012-11-07", slash24)).toBe("07/11/2012");
  });

  it("dates an instant in the zone, so Lagos and Nairobi can disagree", () => {
    expect(calendarDayOf(BOUNDARY, "Africa/Lagos")).toBe("2026-09-29");
    expect(calendarDayOf(BOUNDARY, "Africa/Nairobi")).toBe("2026-09-30");
    expect(formatDate(BOUNDARY, lagos12)).toBe("29 Sep 2026");
    expect(formatDate(BOUNDARY, nairobi12)).toBe("30 Sep 2026");
  });

  it("accepts a Date and epoch milliseconds", () => {
    const at = new Date(BOUNDARY);
    expect(formatDate(at, nairobi12)).toBe("30 Sep 2026");
    expect(formatDate(at.getTime(), lagos12)).toBe("29 Sep 2026");
  });

  it("returns an unreadable value unchanged", () => {
    expect(formatDate("not-a-date", lagos12)).toBe("not-a-date");
    expect(formatDate(undefined, lagos12)).toBe("");
  });

  it("formats day and month without the year", () => {
    expect(formatDayMonth("2026-12-05", lagos12)).toBe("5 Dec");
    expect(formatDayMonth("2026-12-05", slash24)).toBe("05/12");
  });
});

describe("formatMonthYear", () => {
  it("names the month in every style", () => {
    expect(formatMonthYear("2026-09-01", lagos12)).toBe("Sep 2026");
    expect(formatMonthYear("2026-09-01", slash24)).toBe("Sep 2026");
    expect(formatMonthYear({ year: 2025, month: 11 }, iso24, { month: "long" })).toBe("November 2025");
    expect(formatMonthYear("2026-09", lagos12)).toBe("Sep 2026");
  });

  it("places an instant in the zone first", () => {
    expect(formatMonthYear("2026-09-30T22:30:00Z", lagos12)).toBe("Sep 2026");
    expect(formatMonthYear("2026-09-30T22:30:00Z", nairobi12)).toBe("Oct 2026");
  });
});

describe("formatDayRange", () => {
  it("says a span as briefly as the D MMM YYYY style allows", () => {
    expect(formatDayRange("2025-11-21", "2025-11-21", lagos12)).toBe("21 Nov 2025");
    expect(formatDayRange("2025-10-27", "2025-10-31", lagos12)).toBe("27 - 31 Oct 2025");
    expect(formatDayRange("2025-10-28", "2025-11-02", lagos12)).toBe("28 Oct - 2 Nov 2025");
    expect(formatDayRange("2025-12-19", "2026-01-02", lagos12)).toBe("19 Dec 2025 - 2 Jan 2026");
  });

  it("prints both ends in full in the numeric styles", () => {
    expect(formatDayRange("2025-10-27", "2025-10-31", slash24)).toBe("27/10/2025 - 31/10/2025");
    expect(formatDayRange("2025-10-27", "2025-10-31", iso24)).toBe("2025-10-27 - 2025-10-31");
    expect(formatDayRange("2025-10-27", "", slash24)).toBe("27/10/2025");
  });
});

describe("formatTime", () => {
  it("rewords a wall time for either clock", () => {
    expect(formatTime("08:00", lagos12)).toBe("8:00 am");
    expect(formatTime("08:00:00", slash24)).toBe("08:00");
    expect(formatTime("00:05", lagos12)).toBe("12:05 am");
    expect(formatTime("12:00", lagos12)).toBe("12:00 pm");
    expect(formatTime("13:45:00", lagos12)).toBe("1:45 pm");
    expect(formatTime("13:45:00", slash24)).toBe("13:45");
    expect(formatTime("7:30", slash24)).toBe("07:30");
  });

  it("ignores the zone: a bell time is already local", () => {
    expect(formatTime("08:00", nairobi12)).toBe("8:00 am");
  });

  it("returns anything it cannot read unchanged", () => {
    expect(formatTime("", lagos12)).toBe("");
    expect(formatTime("25:00", lagos12)).toBe("25:00");
    expect(formatTime("noon", lagos12)).toBe("noon");
  });
});

describe("formatInstantTime and formatDateTime", () => {
  it("reads the instant on the zone's wall clock", () => {
    expect(formatInstantTime(BOUNDARY, lagos12)).toBe("11:30 pm");
    expect(formatInstantTime(BOUNDARY, nairobi12)).toBe("1:30 am");
    expect(formatInstantTime(BOUNDARY, { ...nairobi12, clock: "H24" })).toBe("01:30");
  });

  it("joins date and time in each style", () => {
    expect(formatDateTime(BOUNDARY, lagos12)).toBe("29 Sep 2026, 11:30 pm");
    expect(formatDateTime(BOUNDARY, nairobi12)).toBe("30 Sep 2026, 1:30 am");
    expect(formatDateTime(BOUNDARY, slash24)).toBe("29/09/2026, 23:30");
    expect(formatDateTime(BOUNDARY, iso24)).toBe("2026-09-29, 23:30");
  });

  it("keeps midnight as 00, not 24", () => {
    expect(formatDateTime("2026-09-29T23:00:00Z", slash24)).toBe("30/09/2026, 00:00");
  });

  it("prints a bare date as a date, without a made-up midnight", () => {
    expect(formatDateTime("2026-09-29", lagos12)).toBe("29 Sep 2026");
  });

  it("returns an unreadable value unchanged", () => {
    expect(formatDateTime("garbage", lagos12)).toBe("garbage");
    expect(formatInstantTime(null, lagos12)).toBe("");
  });
});

describe("todayIn, nowIn and shiftDay", () => {
  const at = new Date(BOUNDARY);

  it("answers today in the zone, not on the device", () => {
    expect(todayIn("Africa/Lagos", at)).toBe("2026-09-29");
    expect(todayIn("Africa/Nairobi", at)).toBe("2026-09-30");
  });

  it("gives the zone's wall clock", () => {
    expect(nowIn("Africa/Nairobi", at)).toEqual({
      date: "2026-09-30",
      time: "01:30",
      hour: 1,
      minute: 30,
    });
  });

  it("falls back to Lagos for a zone the runtime does not know", () => {
    expect(todayIn("Mars/Olympus", at)).toBe("2026-09-29");
  });

  it("counts whole calendar days between two dates", () => {
    expect(daysBetween("2026-09-06", "2026-09-15")).toBe(9);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-09-15", "2026-09-06")).toBe(-9);
    expect(daysBetween("2026-02-30", "2026-03-01")).toBeNull();
  });

  it("moves across month and year ends", () => {
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDay("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("zonedInstant", () => {
  it("names the instant a wall-clock moment is in the zone", () => {
    expect(zonedInstant("2026-09-30", "23:59:59", "Africa/Lagos")).toBe("2026-09-30T22:59:59.000Z");
    expect(zonedInstant("2026-09-30", "23:59:59", "Africa/Nairobi")).toBe("2026-09-30T20:59:59.000Z");
  });

  it("lands on the right hour across a daylight-saving change", () => {
    expect(zonedInstant("2026-03-29", "12:00", "Europe/London")).toBe("2026-03-29T11:00:00.000Z");
    expect(zonedInstant("2026-03-28", "12:00", "Europe/London")).toBe("2026-03-28T12:00:00.000Z");
  });

  it("is null for an unreadable date or time", () => {
    expect(zonedInstant("2026-02-30", "12:00", "Africa/Lagos")).toBeNull();
    expect(zonedInstant("2026-02-10", "noon", "Africa/Lagos")).toBeNull();
  });
});

describe("formatRelativeDay", () => {
  const at = new Date("2026-09-29T10:00:00Z");

  it("says Today and Yesterday by the school's calendar", () => {
    expect(formatRelativeDay("2026-09-29T08:00:00Z", lagos12, at)).toBe("Today");
    expect(formatRelativeDay("2026-09-28", lagos12, at)).toBe("Yesterday");
    expect(formatRelativeDay("2026-09-20", slash24, at)).toBe("20/09/2026");
  });

  it("judges the day in the zone", () => {
    // 23:30 UTC on the 28th is already the 29th in Nairobi.
    expect(formatRelativeDay("2026-09-28T23:30:00Z", nairobi12, at)).toBe("Today");
    expect(formatRelativeDay("2026-09-28T23:30:00Z", lagos12, at)).toBe("Today");
    expect(formatRelativeDay("2026-09-28T22:30:00Z", lagos12, at)).toBe("Yesterday");
  });
});

describe("zoneFor and resolveDisplayPrefs", () => {
  const display = {
    time_zone: "Africa/Accra",
    date_format: "DD_MM_YYYY",
    clock: "H24",
    branch_zones: { "12": "Africa/Nairobi", "13": "Not/AZone" },
  };

  it("uses the branch's own zone, else the school's", () => {
    expect(zoneFor(display, 12)).toBe("Africa/Nairobi");
    expect(zoneFor(display, "12")).toBe("Africa/Nairobi");
    expect(zoneFor(display, 99)).toBe("Africa/Accra");
    expect(zoneFor(display, null)).toBe("Africa/Accra");
    expect(zoneFor(display)).toBe("Africa/Accra");
  });

  it("ignores a zone the runtime cannot place", () => {
    expect(zoneFor(display, 13)).toBe("Africa/Accra");
    expect(zoneFor({ time_zone: "Nowhere/Special" })).toBe("Africa/Lagos");
    expect(isValidTimeZone("Nowhere/Special")).toBe(false);
  });

  it("defaults every absent or unknown value", () => {
    expect(resolveDisplayPrefs(undefined)).toEqual(DEFAULT_DISPLAY);
    expect(resolveDisplayPrefs({ date_format: "MM_DD_YYYY", clock: "H36" })).toEqual(DEFAULT_DISPLAY);
    expect(resolveDisplayPrefs(display, 12)).toEqual({
      timeZone: "Africa/Nairobi",
      dateFormat: "DD_MM_YYYY",
      clock: "H24",
    });
  });

  it("hands back the same object, and the same bound set, for the same choice", () => {
    const a = resolveDisplayPrefs(display, 12);
    const b = resolveDisplayPrefs({ ...display }, "12");
    expect(a).toBe(b);
    expect(bindFormatters(a)).toBe(bindFormatters(b));
    expect(bindFormatters(a).formatDateTime(BOUNDARY)).toBe("30/09/2026, 01:30");
  });
});

describe("zoneLongName", () => {
  it("names a zone as people say it", () => {
    expect(zoneLongName("Africa/Lagos", new Date("2026-09-29T12:00:00Z"))).toMatch(/West Africa/);
    expect(zoneLongName("Africa/Nairobi", new Date("2026-09-29T12:00:00Z"))).toMatch(/East Africa/);
  });

  it("falls back to the zone's own name when it is not a zone", () => {
    expect(zoneLongName("Not/AZone")).toBe("Not/AZone");
  });
});
