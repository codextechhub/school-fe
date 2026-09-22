import type {
  StaffDetail,
  StaffListRow,
} from "@/redux/services/staff/staff-types";

export interface StaffProfileGap {
  key: keyof StaffDetail;
  label: string;
}

const PROFILE_FIELDS: StaffProfileGap[] = [
  { key: "staff_number", label: "Staff ID" },
  { key: "job_title", label: "Job title" },
  { key: "employment_type", label: "Employment type" },
  { key: "hire_date", label: "Hire date" },
  { key: "phone", label: "Phone number" },
  { key: "gender", label: "Gender" },
  { key: "date_of_birth", label: "Date of birth" },
];

function hasValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

/**
 * Measures the safe employment details already available on a directory row.
 *
 * A school-wide posting is valid, so branch is not treated as a missing field.
 * Personal fields are not fetched into the directory merely to calculate this
 * indicator.
 */
export function getStaffDirectoryHealth(person: StaffListRow) {
  const values = [
    person.staff_number,
    person.job_title,
    person.employment_type,
    person.hire_date,
    person.roles.length > 0 ? person.roles : null,
  ];
  const completed = values.filter(hasValue).length;
  const total = values.length;

  return {
    completed,
    total,
    gaps: total - completed,
    percentage: Math.round((completed / total) * 100),
  };
}

/**
 * Measures editable staff profile fields supported by the current API.
 *
 * Qualifications and documents are intentionally excluded because the API
 * does not declare a required checklist for either collection. A screen must
 * not label a professional certificate as missing for a role that needs none.
 *
 * A field the record does not carry is left out: Field Access withholds the
 * ones this viewer may not read, and those are neither complete nor a gap.
 */
export function getStaffProfileCompleteness(person: StaffDetail) {
  const fields = PROFILE_FIELDS.filter((field) => field.key in person);
  const gaps = fields.filter((field) => !hasValue(person[field.key]));
  const total = fields.length;
  const completed = total - gaps.length;

  return {
    completed,
    total,
    gaps,
    percentage: total === 0 ? 100 : Math.round((completed / total) * 100),
  };
}
