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
