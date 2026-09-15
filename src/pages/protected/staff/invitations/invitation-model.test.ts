import { describe, expect, it } from "vitest";

import type { StaffListRow } from "@/redux/services/staff/staff-types";

import {
  invitationAgeDays,
  invitationPageMetrics,
  waitingLabel,
} from "./invitation-model";

const row = (id: number, invitedAt: string | null) =>
  ({ id, invited_at: invitedAt }) as StaffListRow;

describe("invitation age", () => {
  const today = new Date(2026, 8, 15, 1, 0, 0);

  it("counts calendar days rather than partial 24-hour periods", () => {
    expect(invitationAgeDays("2026-09-06T23:30:00Z", today)).toBe(9);
    expect(invitationAgeDays("2026-09-15T00:30:00Z", today)).toBe(0);
  });

  it("does not turn invalid or future dates into a misleading age", () => {
    expect(invitationAgeDays("2026-02-30", today)).toBeNull();
    expect(invitationAgeDays("not-a-date", today)).toBeNull();
    expect(invitationAgeDays("2026-09-20", today)).toBe(0);
  });

  it("writes singular, plural, same-day, and missing ages naturally", () => {
    expect(waitingLabel(0)).toBe("Sent today");
    expect(waitingLabel(1)).toBe("1 day");
    expect(waitingLabel(9)).toBe("9 days");
    expect(waitingLabel(null)).toBe("Age unavailable");
  });
});

describe("invitation page metrics", () => {
  const today = new Date(2026, 8, 15, 12, 0, 0);

  it("counts invitations at the seven-day follow-up threshold", () => {
    expect(
      invitationPageMetrics(
        [
          row(1, "2026-09-09"),
          row(2, "2026-09-08"),
          row(3, "2026-09-01"),
          row(4, null),
        ],
        today,
      ),
    ).toEqual({ followUp: 2, oldestDays: 14 });
  });

  it("has no oldest age when no row has a usable sent date", () => {
    expect(invitationPageMetrics([row(1, null)], today)).toEqual({
      followUp: 0,
      oldestDays: null,
    });
  });
});
