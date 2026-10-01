import { describe, expect, it } from "vitest";
import type { StaffLeaveRequest } from "@/redux/services/staff/staff-types";

import { balanceHint, countingNote, leaveChanges, overAllowanceMessage } from "./leave-copy";

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

describe("balanceHint", () => {
  const annual = {
    leave_type: "ANNUAL" as const, label: "Annual", allowance: 20, taken: 10, pending: 2, remaining: 8,
  };

  it("says what is left, counting pending requests", () => {
    expect(balanceHint(annual, "2025/2026")).toBe(
      "8 of 20 days left in 2025/2026, counting pending requests.",
    );
  });

  it("says how far past the allowance an approver has already gone", () => {
    expect(balanceHint({ ...annual, taken: 22, pending: 0, remaining: -2 }, "2025/2026")).toContain(
      "Already 2 days past the 20-day allowance",
    );
  });

  it("says a type with no allowance has no limit", () => {
    expect(
      balanceHint({ ...annual, label: "Sick", allowance: null, remaining: null, taken: 3 }, "2025/2026"),
    ).toBe("No limit on sick leave. 3 days taken in 2025/2026.");
  });

  it("says nothing without a balance", () => {
    expect(balanceHint(undefined, "this session")).toBe("");
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
