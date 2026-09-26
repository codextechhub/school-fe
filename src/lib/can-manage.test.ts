import { describe, expect, it } from "vitest";

import { canManageRow } from "./can-manage";

describe("canManageRow", () => {
  it("is false only when the server says the row is read-only", () => {
    expect(canManageRow({ can_manage: false })).toBe(false);
  });

  it("is true when the server says the row may be changed", () => {
    expect(canManageRow({ can_manage: true })).toBe(true);
  });

  it("reads a row without the flag, or no row, as changeable", () => {
    expect(canManageRow({})).toBe(true);
    expect(canManageRow(undefined)).toBe(true);
  });
});
