import { P, type PermissionCode } from "@/permissions";

import type { DrawerKind } from "./index";

/**
 * The permission each student drawer's write needs, by drawer.
 *
 * Every screen that opens a student drawer reads it from here, so the
 * directory's row menu, the profile's buttons and the applicants board cannot
 * disagree about who may edit, move or relink a child. Each key is the one the
 * server enforces on the drawer's endpoint:
 *
 * - `edit`: PATCH `/students/<id>/` needs `school.students.update`.
 * - `status`: POST `/students/<id>/status/` needs `school.students.transition`.
 * - `transfer`: POST `/students/<id>/assign-class/` needs
 *   `academics.classes.assign`, because seating a child is the class module's
 *   power rather than the roll's.
 * - `guardian`: POST `/students/<id>/guardians/` needs `school.students.update`.
 */
export const STUDENT_DRAWER_PERMISSION: Record<DrawerKind, PermissionCode> = {
  edit: P.MODIFY_STUDENT,
  status: P.TRANSITION_STUDENT,
  transfer: P.ASSIGN_CLASS,
  guardian: P.MODIFY_STUDENT,
};

/**
 * Whether a student drawer may be offered to this reader.
 *
 * A class placement belongs to a year, and a year that is not the active one
 * is read-only, so `transfer` is also withheld while a past year is being read.
 * Status, record and guardian edits carry no year and are unaffected by it.
 */
export function canOpenStudentDrawer(
  kind: DrawerKind,
  hasPermission: (code: PermissionCode) => boolean,
  { pastYear = false }: { pastYear?: boolean } = {},
): boolean {
  if (kind === "transfer" && pastYear) return false;
  return hasPermission(STUDENT_DRAWER_PERMISSION[kind]);
}

/**
 * Both keys enrolling a student needs, checked together (`mode="all"`).
 *
 * POST `/students/` creates the record and seats the child in a class in one
 * act, so the server asks for `school.students.create` AND
 * `academics.classes.assign`, and refuses a caller holding only one of them.
 * The same holds for saving an applicant, which goes through the same route.
 */
export const ENROL_PERMISSIONS: PermissionCode[] = [
  P.ENROLL_STUDENT,
  P.ASSIGN_CLASS,
];
