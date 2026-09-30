import { describe, expect, it } from "vitest";

import { roleReadOnly, roleReadOnlySentence } from "./role-reach";

/**
 * Lagoon View runs Ikeja (1), Lekki (2) and Yaba (3). Mr Okafor covers the
 * whole school; Mrs Bello works at Lekki only.
 */
const okafor = { wholeSchool: true, covers: () => true };
const bello = {
  wholeSchool: false,
  covers: (ids: number[]) => ids.length > 0 && ids.every((id) => id === 2),
};
const role = (branch_ids: number[], can_edit?: boolean) => ({ branch: null, branch_ids, can_edit });

describe("roleReadOnly", () => {
  it("lets a whole-school reader change any role", () => {
    expect(roleReadOnly(role([]), okafor)).toBeNull();
    expect(roleReadOnly(role([1, 3]), okafor)).toBeNull();
  });

  it("lets a branch reader change only a role reaching her branches", () => {
    expect(roleReadOnly(role([2]), bello)).toBeNull();
    expect(roleReadOnly(role([]), bello)).toBe("shared");
    expect(roleReadOnly(role([2, 3]), bello)).toBe("other-branches");
  });

  it("takes the server's own answer when it sends one", () => {
    expect(roleReadOnly(role([], true), bello)).toBeNull();
    expect(roleReadOnly(role([2], false), bello)).toBe("other-branches");
    expect(roleReadOnly(role([], false), okafor)).toBe("shared");
  });

  it("reads an older payload's single branch as the role's reach", () => {
    expect(roleReadOnly({ branch: 2, branch_ids: undefined as unknown as number[] }, bello)).toBeNull();
  });
});

describe("roleReadOnlySentence", () => {
  it("says who can change the role and what the reader can do instead", () => {
    expect(roleReadOnlySentence("shared", "see")).toBe(
      "Only a school-wide administrator can change what this role can see. Ask one to change it, or create a role for your branch.",
    );
    expect(roleReadOnlySentence("other-branches")).toContain("reaches branches you do not work in");
  });
});
