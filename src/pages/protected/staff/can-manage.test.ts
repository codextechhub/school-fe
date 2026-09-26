import { describe, expect, it } from "vitest";

import type { StaffListRow } from "@/redux/services/staff/staff-types";

import { canManage } from "./can-manage";

const row = (extra: Record<string, unknown>) => ({ id: 1, ...extra }) as unknown as StaffListRow;

describe("canManage", () => {
  it("is false only when the server says the viewer may not change the row", () => {
    expect(canManage(row({ can_manage: false }))).toBe(false);
  });

  it("is true when the server says the viewer may change the row", () => {
    expect(canManage(row({ can_manage: true }))).toBe(true);
  });

  it("reads a row without the flag as manageable", () => {
    expect(canManage(row({}))).toBe(true);
  });
});
