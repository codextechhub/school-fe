import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "./index";

/**
 * The attendance keys the backend seeds, pinned to the codes the screens gate
 * on. `usePermissions` answers false for a code it cannot resolve, so a key
 * missing here hides a screen from every role that holds it, with nothing
 * failing anywhere else.
 */
describe("Attendance permission registry", () => {
  it("resolves the register keys", () => {
    expect(resolvePermissionKey(P.VIEW_ATTENDANCE)).toBe("attendance.register.view");
    expect(resolvePermissionKey(P.TAKE_OWN_REGISTER)).toBe("attendance.register.mark");
    expect(resolvePermissionKey(P.TAKE_ANY_REGISTER)).toBe("attendance.register.mark_any");
    expect(resolvePermissionKey(P.REMIND_CLASS_TEACHER)).toBe("attendance.register.remind");
  });

  it("resolves the correction, staff, report and settings keys", () => {
    expect(resolvePermissionKey(P.REQUEST_ATTENDANCE_CORRECTION)).toBe(
      "attendance.correction.create",
    );
    expect(resolvePermissionKey(P.DECIDE_ATTENDANCE_CORRECTION)).toBe(
      "attendance.correction.approve",
    );
    expect(resolvePermissionKey(P.VIEW_STAFF_REGISTER)).toBe("attendance.staff.view");
    expect(resolvePermissionKey(P.TAKE_STAFF_REGISTER)).toBe("attendance.staff.mark");
    expect(resolvePermissionKey(P.VIEW_ATTENDANCE_REPORTS)).toBe("attendance.report.view");
    expect(resolvePermissionKey(P.EXPORT_ATTENDANCE_REPORTS)).toBe("attendance.report.export");
    expect(resolvePermissionKey(P.MANAGE_ATTENDANCE_SETTINGS)).toBe(
      "attendance.settings.update",
    );
  });

  it("keeps taking your own register apart from taking any class's", () => {
    // The backend grants `mark` to teachers and `mark_any` to administrators.
    // One code for both would let every teacher take every class's register.
    expect(resolvePermissionKey(P.TAKE_OWN_REGISTER)).not.toBe(
      resolvePermissionKey(P.TAKE_ANY_REGISTER),
    );
  });
});
