import { describe, expect, it } from "vitest";

import type { Register } from "@/redux/services/attendance/attendance-types";

import {
  registerMatchesFilter,
  registerProgress,
  summarizeRegisters,
} from "./class-registers-state";

function register(status: Register["status"], options: Partial<Register> = {}): Register {
  return {
    school_class: { id: 1, name: "JSS 2A", class_teacher_name: "Bisi Olanrewaju", branch: null },
    date: "2026-10-15",
    date_label: "15 October 2026",
    closed: null,
    status,
    roster_empty: false,
    edit_window_open: null,
    rows: [],
    history: [],
    ...options,
  };
}

describe("class register directory state", () => {
  it("summarizes each actionable state without counting closed or empty registers", () => {
    expect(summarizeRegisters([
      register("SUBMITTED"),
      register("READY"),
      register("IN_PROGRESS"),
      register("NOT_STARTED"),
      register("NOT_STARTED", { roster_empty: true }),
      register("CLOSED_DAY", { closed: { code: "HOLIDAY", reason: "Holiday" } }),
    ])).toEqual({ submitted: 1, inProgress: 2, notStarted: 1 });
  });

  it("keeps submitted and needs-action filters mutually exclusive", () => {
    expect(registerMatchesFilter(register("SUBMITTED"), "submitted")).toBe(true);
    expect(registerMatchesFilter(register("SUBMITTED"), "action")).toBe(false);
    expect(registerMatchesFilter(register("READY"), "action")).toBe(true);
    expect(registerMatchesFilter(register("NOT_STARTED"), "submitted")).toBe(false);
  });

  it("computes progress from markable students and excludes locked rows", () => {
    expect(registerProgress({
      total: 32,
      present: 20,
      late: 2,
      absent: 1,
      excused: 1,
      unmarked: 4,
      locked: 4,
    })).toEqual({ marked: 24, markable: 28, percent: 86 });
  });
});
