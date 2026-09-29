import { describe, expect, it } from "vitest";

import type { StaffListRow } from "@/redux/services/staff/staff-types";

import { P, type PermissionCode } from "@/permissions";

import {
  invitationActions,
  invitationAgeDays,
  invitationKind,
  invitationPageMetrics,
  sendable,
  waitingLabel,
} from "./invitation-model";

const row = (id: number, invitedAt: string | null) =>
  ({ id, invited_at: invitedAt }) as StaffListRow;

describe("invitation age", () => {
  // 01:00 on 15 September in Lagos; 03:00 in Nairobi.
  const today = new Date("2026-09-15T00:00:00Z");

  it("counts calendar days rather than partial 24-hour periods", () => {
    // 11:30 pm on 6 September, Lagos time.
    expect(invitationAgeDays("2026-09-06T22:30:00Z", today, "Africa/Lagos")).toBe(9);
    expect(invitationAgeDays("2026-09-15T00:30:00Z", today, "Africa/Lagos")).toBe(0);
  });

  it("counts the days on the school's calendar", () => {
    // The same instant is already 7 September in Nairobi.
    expect(invitationAgeDays("2026-09-06T22:30:00Z", today, "Africa/Nairobi")).toBe(8);
  });

  it("does not turn invalid or future dates into a misleading age", () => {
    expect(invitationAgeDays("2026-02-30", today, "Africa/Lagos")).toBeNull();
    expect(invitationAgeDays("not-a-date", today, "Africa/Lagos")).toBeNull();
    expect(invitationAgeDays("2026-09-20", today, "Africa/Lagos")).toBe(0);
  });

  it("writes singular, plural, same-day, and missing ages naturally", () => {
    expect(waitingLabel(0)).toBe("Sent today");
    expect(waitingLabel(1)).toBe("1 day");
    expect(waitingLabel(9)).toBe("9 days");
    expect(waitingLabel(null)).toBe("Age unavailable");
  });
});

describe("invitation page metrics", () => {
  const today = new Date("2026-09-15T11:00:00Z");

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
        "Africa/Lagos",
      ),
    ).toEqual({ followUp: 2, oldestDays: 14 });
  });

  it("has no oldest age when no row has a usable sent date", () => {
    expect(invitationPageMetrics([row(1, null)], today, "Africa/Lagos")).toEqual({
      followUp: 0,
      oldestDays: null,
    });
  });
});

describe("invitation actions", () => {
  const holding =
    (...codes: PermissionCode[]) =>
    (code: PermissionCode) =>
      codes.includes(code);
  const person = (canManage?: boolean) =>
    ({ id: 1, can_resend: true, can_manage: canManage }) as StaffListRow;

  it("offers neither on the directory's view key alone", () => {
    expect(invitationActions(person(), holding(P.BROWSE_TEACHERS))).toEqual({
      resend: false,
      withdraw: false,
    });
  });

  it("offers resend on the invite key and withdraw on the transition key", () => {
    expect(invitationActions(person(), holding(P.INVITE_TEACHER))).toEqual({
      resend: true,
      withdraw: false,
    });
    expect(invitationActions(person(), holding(P.TRANSITION_TEACHER))).toEqual({
      resend: false,
      withdraw: true,
    });
  });

  it("offers neither on a row the reader may not change", () => {
    expect(
      invitationActions(
        person(false),
        holding(P.INVITE_TEACHER, P.TRANSITION_TEACHER),
      ),
    ).toEqual({ resend: false, withdraw: false });
  });
});

describe("invitation kinds", () => {
  // Three people at Lagoon View, none of whom has accepted. Ada was invited
  // last week. Bola was added after the school began approving each hire.
  // Chidi was imported from the spreadsheet while the school was being set up.
  const ada = { employment_status: "INVITED", can_resend: true } as StaffListRow;
  const bola = { employment_status: "PENDING_APPROVAL", can_resend: false } as StaffListRow;
  const chidi = { employment_status: "AWAITING_GO_LIVE", can_resend: false } as StaffListRow;

  it("tells an invitation, a hire and a held invitation apart", () => {
    expect(invitationKind(ada)).toBe("invitation");
    expect(invitationKind(bola)).toBe("hire");
    expect(invitationKind(chidi)).toBe("held");
  });

  it("never sends to a hire awaiting approval", () => {
    expect(sendable(bola, true)).toBe(false);
  });

  it("sends a held invitation only once the school is live", () => {
    // Before go-live the server refuses with INVITATION_HELD_FOR_GO_LIVE; after
    // it, a resend is how one the go-live release left behind goes out. Its
    // `can_resend` stays false either way, so it cannot be what decides.
    expect(sendable(chidi, false)).toBe(false);
    expect(sendable(chidi, true)).toBe(true);
  });

  it("resends an ordinary invitation only while its link is unused", () => {
    expect(sendable(ada, true)).toBe(true);
    expect(sendable({ ...ada, can_resend: false }, true)).toBe(false);
  });
});
