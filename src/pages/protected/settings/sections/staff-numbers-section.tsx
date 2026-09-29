import {
  useGetStaffNumberPolicyQuery,
  useResetBranchStaffNumberPolicyMutation,
  useUpdateStaffNumberPolicyMutation,
} from "@/redux/services/staff/staff-api";
import { P } from "@/permissions";
import { NumberRuleSection, type NumberRuleConfig } from "./number-rule-section";

const STAFF_NUMBERS: NumberRuleConfig = {
  title: "Staff IDs",
  description:
    "Whether everybody on the staff must have a staff ID when they are added, and what a valid one looks like at your school. A staff ID also works for signing in.",
  loadingLabel: "Loading the staff ID rule…",
  permission: P.UPDATE_SETTINGS,
  requiredLabel: "Required when someone is added",
  requiredHelp: "When on, nobody can be added to the staff without a staff ID.",
  hintLabel: "Hint shown when adding staff",
  autoIssueHelp:
    "When the staff ID is left blank, the next one in the series is given out. Needs a rule that ends in digits, so the next number can be worked out.",
  samplePlaceholder: "Type a staff ID",
  prefixPlaceholder: "BS/STF/",
  savedToast: "Staff ID rule saved.",
  useRule: (branch, skip) =>
    useGetStaffNumberPolicyQuery(branch ? { branch } : undefined, { skip }),
  useSave: useUpdateStaffNumberPolicyMutation,
  useReset: useResetBranchStaffNumberPolicyMutation,
};

/** The school's staff ID rule; see {@link NumberRuleSection}. */
export function StaffNumbersSection() {
  return <NumberRuleSection config={STAFF_NUMBERS} />;
}
