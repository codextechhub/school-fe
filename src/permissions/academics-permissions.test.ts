import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "./index";

// Eight academics keys went missing from the registry without anything failing,
// which is how a fully entitled school admin would have been shown no Academic
// Structure at all: usePermissions returns false for a code it cannot resolve.
// These assertions are the tripwire. console-fe pins its modules the same way
// (src/permissions/procurement-permissions.test.ts).
describe("Academic Structure permission registry", () => {
  it("resolves the structure keys the department, program and level screens gate on", () => {
    expect(resolvePermissionKey(P.BROWSE_STRUCTURE)).toBe("academics.structure.view");
    expect(resolvePermissionKey(P.CREATE_STRUCTURE)).toBe("academics.structure.create");
    expect(resolvePermissionKey(P.MODIFY_STRUCTURE)).toBe("academics.structure.update");
    expect(resolvePermissionKey(P.MANAGE_STRUCTURE)).toBe("academics.structure.manage");
  });

  it("resolves the subject keys", () => {
    expect(resolvePermissionKey(P.BROWSE_SUBJECTS)).toBe("academics.subject.view");
    expect(resolvePermissionKey(P.CREATE_SUBJECT)).toBe("academics.subject.create");
    expect(resolvePermissionKey(P.MODIFY_SUBJECT)).toBe("academics.subject.update");
    expect(resolvePermissionKey(P.MANAGE_SUBJECTS)).toBe("academics.subject.manage");
  });

  it("resolves the session and class keys the same screens read", () => {
    expect(resolvePermissionKey(P.BROWSE_SESSIONS)).toBe("academics.session.view");
    expect(resolvePermissionKey(P.MANAGE_SESSIONS)).toBe("academics.session.manage");
    expect(resolvePermissionKey(P.BROWSE_CLASSES)).toBe("academics.classes.view");
    expect(resolvePermissionKey(P.MANAGE_CLASSES)).toBe("academics.classes.manage");
  });

  it("resolves the timetable keys rooms, bells, grids and exams gate on", () => {
    // These five were seeded and granted by the backend long before school-fe
    // had heard of them, which is the same failure the structure keys had: a
    // school admin holding every key would have seen no Timetables at all,
    // because usePermissions returns false for a code it cannot resolve.
    expect(resolvePermissionKey(P.BROWSE_TIMETABLES)).toBe("academics.timetable.view");
    expect(resolvePermissionKey(P.CREATE_TIMETABLE_ENTRY)).toBe(
      "academics.timetable.create",
    );
    expect(resolvePermissionKey(P.MODIFY_TIMETABLE_ENTRY)).toBe(
      "academics.timetable.update",
    );
    expect(resolvePermissionKey(P.MANAGE_TIMETABLES)).toBe("academics.timetable.manage");
    expect(resolvePermissionKey(P.PUBLISH_TIMETABLE)).toBe("academics.timetable.publish");
  });

  it("keeps the calendar and the timetable on their own resources", () => {
    // The backend seeds them apart and says why: adding a public holiday and
    // rebuilding the school's timetable are not one act. Collapsing them here
    // would hand calendar.manage to anyone who may edit a lesson.
    expect(resolvePermissionKey(P.MANAGE_CALENDAR)).not.toBe(
      resolvePermissionKey(P.MANAGE_TIMETABLES),
    );
    expect(resolvePermissionKey(P.BROWSE_CALENDAR)).not.toBe(
      resolvePermissionKey(P.BROWSE_TIMETABLES),
    );
  });

  it("keeps publish off the manage key", () => {
    // A branch admin publishes a timetable and does not delete one. The backend
    // seeds publish to school_admin AND branch_admin, manage to school_admin
    // only, so one key doing both jobs would quietly promote every branch admin.
    expect(resolvePermissionKey(P.PUBLISH_TIMETABLE)).not.toBe(
      resolvePermissionKey(P.MANAGE_TIMETABLES),
    );
  });

  it("keeps structure and subject on their own resources", () => {
    // A single "academics.structure.*" doing duty for subjects too would hand a
    // branch admin subject-delete along with department-delete. The backend
    // seeds them apart (subject.create/update reach branch_admin; structure's
    // do not), so the registry must keep them apart.
    expect(resolvePermissionKey(P.MANAGE_STRUCTURE)).not.toBe(
      resolvePermissionKey(P.MANAGE_SUBJECTS),
    );
  });
});

describe("Permission registry integrity", () => {
  it("resolves every P constant to a dotted backend key", () => {
    const unresolved = Object.entries(P).filter(
      ([, code]) => !resolvePermissionKey(code).includes("."),
    );
    expect(unresolved).toEqual([]);
  });

  it("maps each code to exactly one key, and each key to exactly one code", () => {
    const codes = Object.values(P);
    expect(new Set(codes).size).toBe(codes.length);
    const keys = codes.map(resolvePermissionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("Export Centre permission registry", () => {
  it("resolves the two keys an export from a screen needs", () => {
    // Both, because exporting is two calls: translate the screen, then run it.
    expect(resolvePermissionKey(P.VIEW_EXPORT_CATALOGUE)).toBe(
      "exports.catalogue.view",
    );
    expect(resolvePermissionKey(P.RUN_EXPORT)).toBe("exports.run.create");
    expect(resolvePermissionKey(P.DOWNLOAD_EXPORT_FILE)).toBe("exports.file.download");
  });

  it("uses the same codes console-fe does for the same module", () => {
    // Same keys, same module, so the same MM/RR/AA. A second numbering for one
    // backend module is two maps to keep in step, and the second one drifts.
    expect(P.VIEW_EXPORT_CATALOGUE).toBe("920101");
    expect(P.RUN_EXPORT).toBe("920302");
  });
});
