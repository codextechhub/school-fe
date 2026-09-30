import { describe, expect, it } from "vitest";

import type { UserFieldAccessOverride } from "@/redux/services/roles/roles-types";

import { fieldExceptionEffect, personBranchIds } from "./field-access-overrides";

const row = (overrides: Partial<UserFieldAccessOverride> = {}): UserFieldAccessOverride => ({
  id: 1,
  user_id: "7",
  field: "school.students.phone",
  field_key: "school.students.phone",
  field_label: "Phone",
  access: "READ",
  mode: "ALLOW",
  reason: "Covering the front office.",
  expires_at: null,
  is_expired: false,
  role_state: { read: false, write: false },
  created_by_id: "2",
  created_by_name: "Ada Obi",
  created_at: "2026-09-20T09:00:00Z",
  updated_at: "2026-09-20T09:00:00Z",
  ...overrides,
});

describe("fieldExceptionEffect", () => {
  it("compares the exception with the role on the live record", () => {
    expect(fieldExceptionEffect(row())).toBe(
      "The role does not allow Read. Read is allowed for this person.",
    );
  });

  it("makes no role comparison on a past view, where role switches keep no history", () => {
    expect(fieldExceptionEffect(row({ role_state: null }))).toBe(
      "Read is allowed for this person.",
    );
    expect(fieldExceptionEffect(row({ role_state: null, mode: "DENY", access: "WRITE" }))).toBe(
      "Write is denied for this person.",
    );
  });
});

/**
 * Lagoon View runs Ikeja (1) and Lekki (2). Mrs Bello administers Lekki only,
 * so she may set exceptions on a person whose postings and roles stay at Lekki.
 */
describe("personBranchIds", () => {
  const lekkiReach = { school_wide: false, branches: [{ id: 2 }] };

  it("is the person's postings and their roles' branches together", () => {
    expect(personBranchIds([2], lekkiReach)).toEqual([2]);
    expect(personBranchIds([2], { school_wide: false, branches: [{ id: 1 }] })).toEqual([2, 1]);
  });

  it("is the whole school for somebody posted school-wide or holding a school-wide role", () => {
    expect(personBranchIds([], lekkiReach)).toEqual([]);
    expect(personBranchIds([2], { school_wide: true, branches: [] })).toEqual([]);
  });
});
