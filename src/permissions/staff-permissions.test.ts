import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "./index";

/**
 * The staff module's keys, pinned.
 *
 * `usePermissions` returns false for a code it cannot resolve, so a key missing
 * from the registry does not fail: it silently hides the control it gates, and
 * a fully entitled school administrator is shown a directory with no Add button
 * and no explanation. These assertions are the tripwire, the same one Academic
 * Structure keeps for the same reason.
 *
 * The backend resource is `teachers` rather than `staff` and stays that way:
 * the key is a primary key that four tables point at, so its description
 * changed and the key did not. These keys govern the bursar and the registrar
 * as much as the teacher, which is why the constants read as staff ones.
 */
describe("Staff permission registry", () => {
  it("resolves the record keys the directory, profile and add form gate on", () => {
    expect(resolvePermissionKey(P.BROWSE_TEACHERS)).toBe("school.teachers.view");
    expect(resolvePermissionKey(P.INVITE_TEACHER)).toBe("school.teachers.create");
    expect(resolvePermissionKey(P.MODIFY_TEACHER)).toBe("school.teachers.update");
    expect(resolvePermissionKey(P.MANAGE_TEACHERS)).toBe("school.teachers.manage");
  });

  it("resolves the teaching-duty key, which is separate from the record keys", () => {
    // Writing who teaches what is not editing a record: a branch admin may do
    // it, and a teacher holding `school.teachers.view` may not.
    expect(resolvePermissionKey(P.ASSIGN_TEACHING)).toBe("school.teachers.assign");
  });

  it("resolves the account keys, which are the identity layer's and not the record's", () => {
    expect(resolvePermissionKey(P.MODIFY_ADMINISTRATOR)).toBe(
      "school.administrators.update",
    );
    expect(resolvePermissionKey(P.SUSPEND_ADMINISTRATOR)).toBe(
      "school.administrators.suspend",
    );
    expect(resolvePermissionKey(P.REACTIVATE_ADMINISTRATOR)).toBe(
      "school.administrators.reactivate",
    );
  });

  it("resolves the three leave keys, which are three different questions", () => {
    // Applying for your own is not reading a colleague's, and neither is
    // filing one on somebody's behalf. A single key here would let every
    // teacher read who is off sick.
    expect(resolvePermissionKey(P.APPLY_FOR_LEAVE)).toBe("school.leave.apply");
    expect(resolvePermissionKey(P.VIEW_LEAVE)).toBe("school.leave.view");
    expect(resolvePermissionKey(P.MANAGE_LEAVE)).toBe("school.leave.manage");
  });

  it("gives every staff key its own code", () => {
    // The registry is a bijection: one code per key. Two constants sharing a
    // number would hand one of them the other's meaning, and the screen gated
    // on the quieter key would open for somebody who holds only the louder one.
    const codes = [
      P.BROWSE_TEACHERS, P.INVITE_TEACHER, P.MODIFY_TEACHER, P.MANAGE_TEACHERS,
      P.ASSIGN_TEACHING, P.APPLY_FOR_LEAVE, P.VIEW_LEAVE, P.MANAGE_LEAVE,
    ];
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(resolvePermissionKey(code)).not.toBe("");
  });
});
