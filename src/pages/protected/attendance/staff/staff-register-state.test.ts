import { describe, expect, it } from "vitest";

import type { StaffGroup } from "@/redux/services/attendance/attendance-types";

import { staffGroupProgress, summarizeStaffAttendance } from "./staff-register-state";

function group(overrides: Partial<StaffGroup> = {}): StaffGroup {
  return {
    branch: { id: 1, name: "Main Branch" },
    closed: null,
    status: "IN_PROGRESS",
    counts: { total: 8, present: 5, late: 1, absent: 0, on_leave: 1, unmarked: 1 },
    rows: [],
    ...overrides,
  };
}

describe("staff register directory state", () => {
  it("summarizes every readable branch register", () => {
    expect(summarizeStaffAttendance([
      group(),
      group({
        branch: { id: 2, name: "Annex" },
        counts: { total: 4, present: 3, late: 0, absent: 1, on_leave: 0, unmarked: 0 },
      }),
    ])).toEqual({
      expected: 12,
      present: 8,
      late: 1,
      absent: 1,
      onLeave: 1,
      needsMarking: 1,
    });
  });

  it("does not rebuild hidden totals from roster rows", () => {
    expect(summarizeStaffAttendance([group({ counts: undefined })])).toEqual({
      expected: 0,
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
      needsMarking: 0,
    });
  });

  it("uses the backend total that already excludes approved leave", () => {
    expect(staffGroupProgress(group())).toEqual({ markable: 8, marked: 6, percent: 75 });
  });
});
