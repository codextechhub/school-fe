/**
 * Whether this school's students may pay their own fees, and the smallest
 * part payment it accepts.
 *
 * Fees are normally paid by a parent or guardian in their own app. Paying in
 * the student portal is the fallback for a family that cannot, so the school
 * decides whether to offer it at all; turned off, the Pay action leaves every
 * student's fees screen. The minimum stops a student paying ₦50 at a time; the
 * whole balance of an invoice may always be paid, however small it is.
 *
 * One rule for every branch, so a branch-bound reader sees it and cannot save
 * it. Reading needs `school.fees.view`; saving needs `school.fees.update`.
 * School-only, as the fee due date beside it: the endpoint is the FAL's.
 */

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsPanel, SettingsSectionHeader } from "@/components/settings/settings-layout";
import { useSettingsWrite } from "@/pages/protected/settings/use-settings-write";
import { ReadOnlyNote } from "@/pages/protected/settings/sections/shared";
import { P } from "@/permissions";
import {
  useGetStudentPaymentRulesQuery,
  useUpdateStudentPaymentRulesMutation,
  type StudentPaymentRules,
} from "@/redux/services/school-finance/student-payment-rules-api";
import { writeErrorMessage } from "@/utils/api-error";

import { readWholeNaira } from "./whole-naira";

function StudentPaymentRulesForm({ rules }: { rules: StudentPaymentRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_FEES);
  const [save, { isLoading: saving }] = useUpdateStudentPaymentRulesMutation();
  const [enabled, setEnabled] = useState(rules.enabled);
  const [minimum, setMinimum] = useState((rules.min_part_payment / 100).toLocaleString("en-NG"));

  const read = readWholeNaira(minimum);
  const changed =
    enabled !== rules.enabled || (!read.problem && read.kobo !== rules.min_part_payment);

  const onSave = async () => {
    if (!canSave || !changed || read.problem) return;
    try {
      const body: Partial<StudentPaymentRules> = {};
      if (enabled !== rules.enabled) body.enabled = enabled;
      if (read.kobo !== rules.min_part_payment) body.min_part_payment = read.kobo ?? undefined;
      const result = await save(body).unwrap();
      toast.success(result.message || "Student payment rules saved.");
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not save these rules. Try again."));
    }
  };

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="Students paying their own fees"
        description="Fees are normally paid by a parent or guardian in their own app. You can let students pay in the student portal when their family cannot."
        action={
          canSave ? (
            <Button
              onClick={onSave}
              disabled={!changed || saving || Boolean(read.problem)}
              className="font-mont text-xs"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : undefined
        }
      />

      <ReadOnlyNote reason={reason} subject="these rules" />

      <SettingsPanel title="Paying in the student portal">
        <div className="grid gap-5 p-4 sm:p-5">
          <label className="flex items-start gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!canSave}
              aria-label="Students may pay their own fees"
            />
            <span className="min-w-0">
              <span className="block font-mont text-sm font-medium text-gray-01">
                Students may pay their own fees
              </span>
              <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
                {enabled
                  ? "Students see a Pay button on their invoices. Card and bank details are entered on the payment page, never in the portal."
                  : "Students see their fees but cannot pay them. Their family pays in their own app or at the school."}
              </span>
            </span>
          </label>

          <label className="block min-w-0">
            <span className="font-mont text-sm font-medium text-gray-01">
              Smallest part payment (₦)
            </span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              A student can always pay the whole balance of an invoice, however small.
            </span>
            <Input
              className="mt-2 max-w-40"
              inputMode="numeric"
              value={minimum}
              disabled={!canSave || !enabled}
              aria-invalid={read.problem ? true : undefined}
              onChange={(event) => setMinimum(event.target.value)}
            />
            {read.problem ? (
              <p role="alert" className="mt-1.5 font-mont text-[11px] text-destructive">
                {read.problem}
              </p>
            ) : null}
          </label>
        </div>
      </SettingsPanel>
    </div>
  );
}

export default function StudentPaymentRulesSettings() {
  const { data, isLoading, isError } = useGetStudentPaymentRulesQuery();
  const rules = data?.data;

  if (isLoading) return <p className="font-mont text-xs text-gray-05">Loading…</p>;
  if (isError || !rules) {
    return (
      <p className="font-mont text-xs text-gray-05">
        This school's student payment rules could not be loaded.
      </p>
    );
  }
  return (
    <StudentPaymentRulesForm
      key={`${rules.enabled}:${rules.min_part_payment}`}
      rules={rules}
    />
  );
}
