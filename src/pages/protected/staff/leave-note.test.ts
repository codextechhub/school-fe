import { describe, expect, it } from "vitest";

import { leaveNote } from "./leave-note";

/**
 * Mrs Okafor reads On Leave in the directory. A role that may not read leave
 * dates still sees the status, because it follows her employment, but the
 * directory has no end date to quote.
 */
describe("leaveNote", () => {
  it("quotes the day the leave ends", () => {
    expect(leaveNote({ display_employment_status: "ON_LEAVE", on_leave_until: "2026-11-06" })).toContain(
      "Approved leave to",
    );
  });

  it("says nothing when the end date is absent or null, rather than guessing one", () => {
    expect(leaveNote({ display_employment_status: "ON_LEAVE" })).toBeUndefined();
    expect(leaveNote({ display_employment_status: "ON_LEAVE", on_leave_until: null })).toBeUndefined();
  });

  it("says nothing for somebody who is not on leave", () => {
    expect(leaveNote({ display_employment_status: "ACTIVE", on_leave_until: "2026-11-06" })).toBeUndefined();
  });
});
