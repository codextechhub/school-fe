import { describe, expect, it } from "vitest";
import type { StaffLeaveRequest } from "@/redux/services/staff/staff-types";

import {
  backOn,
  countingNote,
  dayCount,
  isLimited,
  leaveChanges,
  leaveStanding,
  leftAfterRequest,
  noLimitNote,
  overAllowanceMessage,
  pastAllowanceNote,
} from "./leave-copy";

describe("leaveChanges", () => {
  it("keeps unchanged dates out of a note correction so stored days are not recounted", () => {
    const request = {
      leave_type: "ANNUAL", start_date: "2026-10-05", end_date: "2026-10-08", note: "Old note",
    } as StaffLeaveRequest;
    expect(leaveChanges(request, { ...request, note: "Corrected note" })).toEqual({ note: "Corrected note" });
  });
});

/**
 * What the leave drawer says about counting, balances and going over.
 *
 * Mrs Okafor teaches at Lagoon View, which allows 20 days of annual leave a
 * session and counts Monday to Friday, leaving out the days its calendar
 * closes the school.
 */
describe("countingNote", () => {
  it("names the school's working days and whether closures count", () => {
    expect(
      countingNote({ allowances: {}, leave_types: [], groups: [], overrides: [], branch_options: [], working_days: [5, 1, 2, 3, 4], exclude_closures: true }),
    ).toBe("Days are counted Monday to Friday, leaving out days the school is closed on its calendar.");
    expect(
      countingNote({ allowances: {}, leave_types: [], groups: [], overrides: [], branch_options: [], working_days: [1, 2, 3, 4, 5, 6], exclude_closures: false }),
    ).toBe(
      "Days are counted Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, including days the school is closed.",
    );
  });

  it("never implies calendar days when the rules cannot be read", () => {
    expect(countingNote(undefined)).toContain("not every calendar day");
  });
});

describe("dayCount", () => {
  it("says day for one and days for every other number", () => {
    expect(dayCount(1)).toBe("1 day");
    expect(dayCount(0)).toBe("0 days");
    expect(dayCount(5)).toBe("5 days");
  });
});

describe("leaveStanding", () => {
  const annual = {
    leave_type: "ANNUAL" as const, label: "Annual", allowance: 20, taken: 10, pending: 2, remaining: 8,
  };

  it("reads the balance row when there is no preview", () => {
    expect(leaveStanding(annual, undefined)).toEqual({ allowance: 20, taken: 10, pending: 2, remaining: 8 });
  });

  it("prefers a preview that carries every figure, so an edited request is not counted against itself", () => {
    expect(
      leaveStanding(annual, { allowance: 20, taken: 10, pending: 0, remaining: 10 }),
    ).toEqual({ allowance: 20, taken: 10, pending: 0, remaining: 10 });
  });

  it("keeps the balance row when the preview is missing a figure", () => {
    expect(leaveStanding(annual, { allowance: 20, taken: 10 })).toEqual({
      allowance: 20, taken: 10, pending: 2, remaining: 8,
    });
  });

  it("keeps the balance row when the preview sends null for taken and pending", () => {
    expect(
      leaveStanding(annual, { allowance: null, taken: null, pending: null, remaining: null }),
    ).toEqual({ allowance: 20, taken: 10, pending: 2, remaining: 8 });
  });

  it("says nothing when the preview has null figures and there is no row", () => {
    expect(
      leaveStanding(undefined, { allowance: null, taken: null, pending: null, remaining: null }),
    ).toBeUndefined();
  });

  it("says nothing without a row or a full preview, never zero", () => {
    expect(leaveStanding(undefined, undefined)).toBeUndefined();
    expect(leaveStanding(undefined, { days: 3 })).toBeUndefined();
  });
});

describe("standing notes", () => {
  it("says a type with no allowance has no limit, with what was taken", () => {
    const standing = { allowance: null, taken: 3, pending: 0, remaining: null };
    expect(isLimited(standing)).toBe(false);
    expect(noLimitNote(standing, "2025/2026")).toBe("3 days taken in 2025/2026.");
    expect(noLimitNote({ ...standing, taken: 1, pending: 2 }, "2025/2026")).toBe(
      "1 day taken in 2025/2026, 2 pending.",
    );
  });

  it("says nothing extra while the person is within the allowance, or exactly at it", () => {
    expect(pastAllowanceNote({ allowance: 20, taken: 10, pending: 2, remaining: 8 })).toBe("");
    expect(pastAllowanceNote({ allowance: 20, taken: 20, pending: 0, remaining: 0 })).toBe("");
    expect(isLimited({ allowance: 20, taken: 20, pending: 0, remaining: 0 })).toBe(true);
  });

  it("says how far past the allowance an approver has already gone", () => {
    expect(pastAllowanceNote({ allowance: 20, taken: 22, pending: 0, remaining: -2 })).toBe(
      "Already 2 days past the 20-day allowance, counting pending requests.",
    );
    expect(pastAllowanceNote({ allowance: 20, taken: 21, pending: 0, remaining: -1 })).toContain("Already 1 day past");
  });

  it("says nothing past the allowance for a type with no limit", () => {
    expect(pastAllowanceNote({ allowance: null, taken: 30, pending: 0, remaining: null })).toBe("");
  });
});

describe("leftAfterRequest", () => {
  it("says what is left after the request", () => {
    expect(leftAfterRequest({ remaining_after: 9 })).toEqual({ over: false, text: "9 days" });
    expect(leftAfterRequest({ remaining_after: 1 })).toEqual({ over: false, text: "1 day" });
    expect(leftAfterRequest({ remaining_after: 0 })).toEqual({ over: false, text: "0 days" });
  });

  it("reads a negative figure as days over the allowance, not as a minus sign", () => {
    expect(leftAfterRequest({ remaining_after: -5 })).toEqual({ over: true, text: "5 days over the allowance" });
    expect(leftAfterRequest({ remaining_after: -1 })).toEqual({ over: true, text: "1 day over the allowance" });
  });

  it("says nothing for a type with no limit, or when the figure is hidden", () => {
    expect(leftAfterRequest({ remaining_after: null, over_allowance_by: 0 })).toBeNull();
    expect(leftAfterRequest({})).toBeNull();
  });

  it("falls back to days over when only that figure is sent", () => {
    expect(leftAfterRequest({ over_allowance_by: 2 })).toEqual({ over: true, text: "2 days over the allowance" });
    expect(leftAfterRequest({ over_allowance_by: 0 })).toBeNull();
  });
});

describe("backOn", () => {
  it("puts the return date in a sentence", () => {
    expect(backOn("Monday, 3 Nov 2026")).toBe("Back on Monday, 3 Nov 2026");
  });
});

describe("overAllowanceMessage", () => {
  const warning = { code: "OVER_ALLOWANCE" as const, message: "server", over_allowance_by: 2 };

  it("tells whoever filed it that it went over and still goes to the approver", () => {
    expect(
      overAllowanceMessage(warning, { isSelf: false, personName: "Mrs Okafor", typeLabel: "Annual" }),
    ).toBe("This takes Mrs Okafor 2 days past the annual leave allowance. It still goes to the approver, who decides.");
    expect(
      overAllowanceMessage({ ...warning, over_allowance_by: 1 }, { isSelf: true, personName: "", typeLabel: "Annual" }),
    ).toBe("This takes you 1 day past your annual leave allowance. It still goes to the approver, who decides.");
  });
});
