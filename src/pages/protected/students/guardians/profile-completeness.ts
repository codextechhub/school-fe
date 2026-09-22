import type { GuardianDetail } from "@/redux/services/students/students-types";

export interface GuardianProfileGap {
  key: "full_name" | "phone" | "email" | "occupation" | "address";
  label: string;
}

const PROFILE_FIELDS: GuardianProfileGap[] = [
  { key: "full_name", label: "Full name" },
  { key: "phone", label: "Phone number" },
  { key: "email", label: "Email address" },
  { key: "occupation", label: "Occupation" },
  { key: "address", label: "Home address" },
];

/**
 * Measures the guardian details the school can edit from this profile.
 *
 * The score uses the five guardian-owned fields supported by the edit API,
 * less any the record does not carry: Field Access leaves out the fields this
 * viewer may not read, and those are neither complete nor a gap for them.
 */
export function getGuardianProfileCompleteness(guardian: GuardianDetail) {
  const fields = PROFILE_FIELDS.filter((field) => field.key in guardian);
  const gaps = fields.filter((field) => !guardian[field.key]?.trim());
  const total = fields.length;
  const completed = total - gaps.length;

  return {
    completed,
    total,
    gaps,
    percentage: total === 0 ? 100 : Math.round((completed / total) * 100),
  };
}
