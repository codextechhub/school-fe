import { describe, expect, it } from "vitest";

import type { StaffDetail, StaffLeave, StaffListRow } from "./staff-types";

/**
 * The staff row's field names, pinned against a real payload.
 *
 * These types are hand-written against `vs_staff/serializers.py` in another
 * repository, and a hand-written mirror can drift without anything failing.
 * It did: the row declared `status` and `role` after the server had moved to
 * `account_status`, `employment_status` and a plural `roles`. Nothing caught
 * it, because a lying type type-checks perfectly. The onboarding Invitations
 * panel threw on every row it drew, and the shared approval screens showed a
 * staff directory with a blank role and a blank status beside every name.
 *
 * This fixture is a verbatim `/v1/i/me/staff/` row. It cannot prove the server
 * still sends these names, but it makes the expectation something a reader can
 * see and compare, and it fails the moment a field is renamed on this side
 * only. Update it by pasting a fresh payload, never by editing it to match a
 * type.
 */
const ROW: StaffListRow = {
  id: 12,
  user_id: 240,
  full_name: "Chukwuemeka Eze",
  email: "chukwuemeka.eze@brightfield-lekki.test",
  staff_number: "BFS/STF/0012",
  job_title: "Lead Teacher",
  employment_status: "ACTIVE",
  employment_status_label: "Active",
  on_roll: true,
  display_employment_status: "ON_LEAVE",
  display_employment_status_label: "On Leave",
  employment_type: "FULL_TIME",
  account_status: "LOCKED",
  account_flag: {
    code: "LOCKED",
    label: "Locked",
    note: "Locked out after failed sign-in attempts. Their employment is unaffected.",
  },
  roles: ["Lead Teacher", "Teacher"],
  branch_id: 3,
  posting_branch_ids: [3],
  branch_name: "Lekki Branch",
  posted_school_wide: false,
  teaching_load: 4,
  on_leave_today: true,
  on_leave_until: "2026-10-16",
  hire_date: "2021-09-06",
  can_resend: false,
  invited_at: "2021-08-30T09:12:00Z",
};

describe("the staff row the app reads", () => {
  it("keeps the two statuses apart", () => {
    // The whole reason there are two columns. Mr. Eze mistyped his password
    // three times this morning; he is locked out and he is teaching JSS1 B at
    // nine o'clock. A screen that merged these would tell his school he had
    // been suspended.
    expect(ROW.employment_status).toBe("ACTIVE");
    expect(ROW.account_status).toBe("LOCKED");
    expect(ROW.account_flag?.code).toBe("LOCKED");
  });

  it("carries roles as a list, because one person may hold several", () => {
    expect(Array.isArray(ROW.roles)).toBe(true);
    expect(ROW.roles).toHaveLength(2);
  });

  it("names the fields the onboarding Invitations panel draws a row from", () => {
    for (const field of [
      "full_name", "email", "roles", "account_status", "invited_at", "can_resend",
    ] as const) {
      expect(ROW[field]).toBeDefined();
    }
  });

  it("names the fields the shared approval screens read through the host", () => {
    // `status` on HostPerson gates delegation, so it is the ACCOUNT's: only
    // somebody whose login works may be handed another person's approvals.
    expect(ROW.id).toBeTypeOf("number");
    expect(ROW.full_name).toBeTypeOf("string");
    expect(ROW.email).toBeTypeOf("string");
    expect(ROW.roles[0]).toBeTypeOf("string");
    expect(ROW.account_status).toBeTypeOf("string");
  });
});

/**
 * A verbatim `/v1/i/me/staff/<id>/leave/` body from a school that has set no
 * allowances, in the session covering today.
 *
 * Every leave type is present whether or not the school limits it, and a
 * type with no limit carries null for both `allowance` and `remaining`, which
 * the Leave tab reads as "No limit" rather than as zero days left.
 */
const LEAVE: StaffLeave = {
  leave: [],
  days_taken: [],
  balances: [
    { leave_type: "ANNUAL", label: "Annual", allowance: null, taken: 0, pending: 0, remaining: null },
    { leave_type: "SICK", label: "Sick", allowance: null, taken: 0, pending: 0, remaining: null },
    { leave_type: "MATERNITY", label: "Maternity", allowance: null, taken: 0, pending: 0, remaining: null },
    { leave_type: "PATERNITY", label: "Paternity", allowance: null, taken: 0, pending: 0, remaining: null },
    { leave_type: "STUDY", label: "Study", allowance: null, taken: 0, pending: 0, remaining: null },
    { leave_type: "COMPASSIONATE", label: "Compassionate", allowance: null, taken: 0, pending: 0, remaining: null },
    { leave_type: "OTHER", label: "Other", allowance: null, taken: 0, pending: 0, remaining: null },
  ],
  balance_session: { id: 15, name: "2026/2027", start_date: "2026-08-17", end_date: "2027-07-16" },
  balance_note:
    "Allowances are per academic session, set in Settings, Staff. Taken counts approved leave and pending counts leave waiting for a decision; remaining is the allowance less both. A type with no allowance has no limit.",
};

/** The fields of a verbatim own-record `/v1/i/me/staff/<id>/` body that the school's staff rules add. */
const OWN_RECORD: Pick<StaffDetail, "missing_documents" | "self_editable_fields"> = {
  missing_documents: [],
  self_editable_fields: ["middle_name", "photo", "date_of_birth", "phone"],
};

describe("the staff rules as the record and the leave list carry them", () => {
  it("counts every leave type against one named session", () => {
    expect(LEAVE.balances.map((row) => row.leave_type)).toHaveLength(7);
    expect(LEAVE.balance_session?.name).toBe("2026/2027");
    for (const row of LEAVE.balances) {
      expect(row.allowance === null).toBe(row.remaining === null);
    }
  });

  it("names self-editable details as field names, the photograph as `photo`", () => {
    expect(OWN_RECORD.self_editable_fields).toContain("photo");
    expect(OWN_RECORD.self_editable_fields).not.toContain("photo_url");
    expect(Array.isArray(OWN_RECORD.missing_documents)).toBe(true);
  });
});
