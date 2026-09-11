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
 * The score uses the five guardian-owned fields supported by the edit API.
 */
export function getGuardianProfileCompleteness(guardian: GuardianDetail) {
  const gaps = PROFILE_FIELDS.filter(
    (field) => !guardian[field.key]?.trim(),
  );
  const total = PROFILE_FIELDS.length;
  const completed = total - gaps.length;

  return {
    completed,
    total,
    gaps,
    percentage: Math.round((completed / total) * 100),
  };
}
