import { describe, expect, it } from "vitest";

import { bindFormatters, resolveDisplayPrefs } from "@/lib/dates";

import { timeOnDay } from "./time-on-day";

const fmt = bindFormatters(resolveDisplayPrefs(null, null));

describe("timeOnDay", () => {
  it("gives the time alone for something done on the register's own day", () => {
    // 07:07 UTC is 8:07 am in Lagos, on the 9th.
    expect(timeOnDay(fmt, "2026-10-09T07:07:00Z", "2026-10-09")).toBe(fmt.formatInstantTime("2026-10-09T07:07:00Z"));
  });

  it("adds the date for something done on a later day", () => {
    const later = timeOnDay(fmt, "2026-10-12T07:42:00Z", "2026-10-09");
    expect(later).toBe(fmt.formatDateTime("2026-10-12T07:42:00Z"));
    expect(later).toContain("12 Oct 2026");
  });

  it("reads the day in the school's zone, not UTC", () => {
    // 23:45 UTC on the 11th is 12:45 am on the 12th in Lagos.
    expect(timeOnDay(fmt, "2026-10-11T23:45:00Z", "2026-10-12")).toBe(fmt.formatInstantTime("2026-10-11T23:45:00Z"));
  });
});
