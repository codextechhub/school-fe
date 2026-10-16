/**
 * The school's own fee settings, shown in the Fees section of Finance settings.
 *
 * The shared finance package renders whatever the host supplies in its
 * `FeeDuePolicyPanel` slot, so that one slot carries every school-only fee
 * rule: when fee bills fall due, and whether students may pay their own fees.
 * Each keeps its own read, save and permission check.
 */

import FeeDuePolicySettings from "./fee-due-policy";
import StudentPaymentRulesSettings from "./student-payment-rules";

export default function SchoolFeeSettings() {
  return (
    <div className="space-y-8">
      <FeeDuePolicySettings />
      <StudentPaymentRulesSettings />
    </div>
  );
}
