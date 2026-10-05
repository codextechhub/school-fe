import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey, type PermissionCode } from "@/permissions";

import {
  ENROL_PERMISSIONS,
  STUDENT_DRAWER_PERMISSION,
  canOpenStudentDrawer,
} from "./access";

/**
 * The student drawers are offered on the key each drawer's endpoint enforces,
 * not on the key that opens the screen. A registrar who may read the roll but
 * not change it must not be offered an Edit that the server answers with 403.
 */
const holding =
  (...codes: PermissionCode[]) =>
  (code: PermissionCode) =>
    codes.includes(code);

describe("student drawer permissions", () => {
  it("names the backend key each drawer's write needs", () => {
    expect(
      Object.fromEntries(
        Object.entries(STUDENT_DRAWER_PERMISSION).map(([kind, code]) => [
          kind,
          resolvePermissionKey(code),
        ]),
      ),
    ).toEqual({
      edit: "school.students.update",
      status: "school.students.transition",
      transfer: "academics.classes.assign",
      branch: "school.students.change_branch",
      guardian: "school.students.update",
    });
  });

  it("offers a branch move only for a pupil on the roll at a school with several branches", () => {
    const mover = holding(P.MOVE_STUDENT_BRANCH);
    const atIkeja = { branch: 3, status: "ACTIVE" };
    expect(canOpenStudentDrawer("branch", mover, { student: atIkeja })).toBe(true);
    // One branch: the record carries no branch, and the action is absent.
    expect(canOpenStudentDrawer("branch", mover, { student: { status: "ACTIVE" } })).toBe(false);
    expect(
      canOpenStudentDrawer("branch", mover, { student: { branch: 3, status: "WITHDRAWN" } }),
    ).toBe(false);
    expect(canOpenStudentDrawer("branch", mover, { student: atIkeja, pastYear: true })).toBe(false);
    expect(canOpenStudentDrawer("branch", holding(P.ASSIGN_CLASS), { student: atIkeja })).toBe(false);
  });

  it("offers nothing on the view key alone", () => {
    const viewOnly = holding(P.BROWSE_STUDENTS);
    for (const kind of ["edit", "status", "transfer", "branch", "guardian"] as const) {
      expect(
        canOpenStudentDrawer(kind, viewOnly, { student: { branch: 3, status: "ACTIVE" } }),
      ).toBe(false);
    }
  });

  it("offers each drawer on its own key and no other", () => {
    expect(canOpenStudentDrawer("status", holding(P.TRANSITION_STUDENT))).toBe(true);
    expect(canOpenStudentDrawer("edit", holding(P.TRANSITION_STUDENT))).toBe(false);
    expect(canOpenStudentDrawer("transfer", holding(P.MODIFY_STUDENT))).toBe(false);
    expect(canOpenStudentDrawer("transfer", holding(P.ASSIGN_CLASS))).toBe(true);
  });

  it("withholds a class move while a past year is read, and nothing else", () => {
    const everything = holding(
      P.MODIFY_STUDENT,
      P.TRANSITION_STUDENT,
      P.ASSIGN_CLASS,
    );
    expect(canOpenStudentDrawer("transfer", everything, { pastYear: true })).toBe(false);
    expect(canOpenStudentDrawer("edit", everything, { pastYear: true })).toBe(true);
    expect(canOpenStudentDrawer("status", everything, { pastYear: true })).toBe(true);
  });

  it("asks for both keys the enrol endpoint checks", () => {
    expect(ENROL_PERMISSIONS.map(resolvePermissionKey).sort()).toEqual([
      "academics.classes.assign",
      "school.students.create",
    ]);
  });
});
