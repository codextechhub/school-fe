import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "./index";

/**
 * The keys that arrived with capability pricing, and a registry that lagged it.
 *
 * `resolvePermissionKey` answers "" for a code it does not carry, and
 * `usePermissions` reads that as "no". So a key the backend grants but the
 * registry has never heard of hides a screen from a school entitled to it, and
 * nothing anywhere fails: the button is simply not there, for everybody, for
 * as long as nobody notices.
 *
 * Thirteen keys were in that state. Splitting exams out of the timetable is
 * how the two came to be priced apart - lessons are Calendar at Plus and exams
 * at Advanced - and the split created five keys this app had no name for. The
 * rest are staff records, student promotion and the three import and export
 * verbs seeded alongside them.
 *
 * These assertions are the tripwire, in the same shape as the academics and
 * staff files beside them.
 */
describe("Exams, priced apart from the weekly timetable", () => {
  it("resolves every exam key the exam screens gate on", () => {
    expect(resolvePermissionKey(P.BROWSE_EXAMS)).toBe("academics.exam.view");
    expect(resolvePermissionKey(P.CREATE_EXAM)).toBe("academics.exam.create");
    expect(resolvePermissionKey(P.MODIFY_EXAM)).toBe("academics.exam.update");
    expect(resolvePermissionKey(P.MANAGE_EXAMS)).toBe("academics.exam.manage");
    expect(resolvePermissionKey(P.PUBLISH_EXAM_TIMETABLE)).toBe(
      "academics.exam.publish",
    );
  });

  it("keeps the timetable keys distinct from them", () => {
    // One code answering both would have priced one of the two wrong for every
    // school on the platform.
    expect(resolvePermissionKey(P.BROWSE_TIMETABLES)).toBe(
      "academics.timetable.view",
    );
    expect(resolvePermissionKey(P.PUBLISH_TIMETABLE)).toBe(
      "academics.timetable.publish",
    );
    expect(resolvePermissionKey(P.BROWSE_EXAMS)).not.toBe(
      resolvePermissionKey(P.BROWSE_TIMETABLES),
    );
  });
});

describe("Staff records, kept apart from the staff directory", () => {
  it("resolves the two record keys", () => {
    expect(resolvePermissionKey(P.VIEW_STAFF_RECORDS)).toBe(
      "school.staff_records.view",
    );
    expect(resolvePermissionKey(P.UPDATE_STAFF_RECORD)).toBe(
      "school.staff_records.update",
    );
  });

  it("does not answer them with the directory's keys", () => {
    // Reading the staff list is not reading somebody's contract.
    expect(resolvePermissionKey(P.VIEW_STAFF_RECORDS)).not.toBe(
      resolvePermissionKey(P.BROWSE_TEACHERS),
    );
  });
});

describe("The remaining keys the backend grants a school role", () => {
  it("resolves student promotion", () => {
    expect(resolvePermissionKey(P.PROMOTE_STUDENTS)).toBe(
      "school.students.promote",
    );
  });

  it("resolves the two import verbs", () => {
    expect(resolvePermissionKey(P.IMPORT_STRUCTURE)).toBe(
      "academics.structure.import",
    );
    expect(resolvePermissionKey(P.IMPORT_ADMINISTRATORS)).toBe(
      "school.administrators.import",
    );
  });

  it("resolves scheduled exports", () => {
    expect(resolvePermissionKey(P.VIEW_EXPORT_SCHEDULES)).toBe(
      "exports.schedule.view",
    );
    expect(resolvePermissionKey(P.CREATE_EXPORT_SCHEDULE)).toBe(
      "exports.schedule.create",
    );
    expect(resolvePermissionKey(P.MANAGE_EXPORT_SCHEDULES)).toBe(
      "exports.schedule.manage",
    );
  });
});

describe("The registry stays a bijection", () => {
  it("gives every code exactly one key, and every key one code", () => {
    // Two names for one code is two ways to write one gate; one name for two
    // keys hands a screen the other one's meaning.
    const codes = Object.values(P) as string[];
    const keys = codes.map((code) => resolvePermissionKey(code as never));
    const resolved = keys.filter(Boolean);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(resolved).size).toBe(resolved.length);
  });

  it("leaves no new code unresolved", () => {
    for (const code of [
      P.BROWSE_EXAMS, P.CREATE_EXAM, P.MODIFY_EXAM, P.MANAGE_EXAMS,
      P.PUBLISH_EXAM_TIMETABLE, P.VIEW_STAFF_RECORDS, P.UPDATE_STAFF_RECORD,
      P.PROMOTE_STUDENTS, P.IMPORT_STRUCTURE, P.IMPORT_ADMINISTRATORS,
      P.VIEW_EXPORT_SCHEDULES, P.CREATE_EXPORT_SCHEDULE,
      P.MANAGE_EXPORT_SCHEDULES,
    ]) {
      expect(resolvePermissionKey(code)).not.toBe("");
    }
  });
});
