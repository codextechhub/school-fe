import {
  useGetAdmissionPolicyQuery,
  useResetBranchAdmissionPolicyMutation,
  useUpdateAdmissionPolicyMutation,
} from "@/redux/services/students/students-api";
import { P } from "@/permissions";
import { NumberRuleSection, type NumberRuleConfig } from "./number-rule-section";

const ADMISSION_NUMBERS: NumberRuleConfig = {
  title: "Admission numbers",
  description:
    "Whether every child must have an admission number when they are enrolled, and what a valid one looks like at your school.",
  loadingLabel: "Loading the admission number rule…",
  permission: P.MODIFY_STUDENT,
  requiredLabel: "Required at enrolment",
  requiredHelp: "When on, a child cannot be enrolled without an admission number.",
  hintLabel: "Hint shown on the enrolment form",
  autoIssueHelp:
    "When enrolment leaves the number blank, the next one in the series is given out. Needs a rule that ends in digits, so the next number can be worked out.",
  samplePlaceholder: "Type an admission number",
  prefixPlaceholder: "BSS/",
  savedToast: "Admission number rule saved.",
  useRule: (branch, skip) =>
    useGetAdmissionPolicyQuery(branch ? { branch } : undefined, { skip }),
  useSave: useUpdateAdmissionPolicyMutation,
  useReset: useResetBranchAdmissionPolicyMutation,
};

/** The school's admission-number rule, for children; see {@link NumberRuleSection}. */
export function AdmissionNumbersSection() {
  return <NumberRuleSection config={ADMISSION_NUMBERS} />;
}
