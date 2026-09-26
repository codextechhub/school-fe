import type { FieldAccess, ReadOnlyOptions } from "@/components/finance-ui";

/**
 * The Field Access resources this app's own screens read, as the backend names
 * them (`module.resource`).
 *
 * Each is the key of the login and `/user/auth/me/` `field_access` map, and the
 * resource a screen hands to `useFieldAccess`. Staff are `school.teachers`
 * because that is the staff register's resource on the backend, whatever the
 * screen calls it.
 */
export const FIELD_RESOURCE = {
  STUDENTS: "school.students",
  GUARDIANS: "school.guardians",
  STAFF: "school.teachers",
} as const;

/** A student's medical fields, in the order every screen shows them. */
export const STUDENT_MEDICAL_FIELDS = ["blood_group", "allergies", "conditions"] as const;

/**
 * The option every Add form passes to every Field Access question.
 *
 * A form that creates a record hands it to `AccessField` (as `creating`) and to
 * `isHidden`, `isReadOnly`, `anyVisible` and `writableOnly`. A field the backend
 * declares open on create is then offered and sent even where the user may not
 * read or change it on an existing record. Screens showing an existing record
 * never pass it.
 */
export const CREATING: ReadOnlyOptions = { creating: true };

/** The guardian fields every route that adds a guardian requires. */
const GUARDIAN_REQUIRED_ON_CREATE = ["first_name", "last_name", "phone"] as const;

/**
 * Whether the signed-in user may add a new guardian, rather than only link one
 * already at the school.
 *
 * Every route that creates a guardian requires the fields above, so the choice
 * is offered only when the user may give each of them at creation. A field the
 * backend lists as open on create always qualifies, whatever its Read and Write
 * switches say; one that is hidden or read-only and not open on create does
 * not, since a form missing a required field could never be sent.
 */
export function canCreateGuardian(access: FieldAccess): boolean {
  return GUARDIAN_REQUIRED_ON_CREATE.every((name) => !access.isReadOnly(name, CREATING));
}
