import { describe, expect, it } from "vitest";

import type { UserFieldAccessOverride } from "@/redux/services/roles/roles-types";

import { fieldExceptionEffect } from "./field-access-overrides";

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
