import { describe, expect, it } from "vitest";

import type { StaffListRow } from "./staff-types";

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
  employment_type: "FULL_TIME",
  account_status: "LOCKED",
  account_flag: {
    code: "LOCKED",
    label: "Locked",
    note: "Locked out after failed sign-in attempts. Their employment is unaffected.",
  },
  roles: ["Lead Teacher", "Teacher"],
  branch_id: 3,
  branch_name: "Lekki Branch",
  posted_school_wide: false,
  teaching_load: 4,
  on_leave_today: false,
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
