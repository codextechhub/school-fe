/**
 * Whether this school's students may pay their own fees, whether families may
 * pay by card, and the smallest part payment the school accepts by card.
 *
 * Fees are normally paid by a parent or guardian in their own app. Paying in
 * the student portal is the fallback for a family that cannot, so the school
 * decides whether to offer it at all; turned off, the Pay action leaves every
 * student's fees screen. The minimum stops a student paying ₦50 at a time; the
 * whole balance of an invoice may always be paid, however small it is.
 *
 * Families pay by bank transfer to each student's own account number unless
 * the school switches card on. The smallest part payment is a card rule, so
 * its box appears only while card is on and is left out of a save while it is
 * hidden.
 *
 * One rule for every branch, so a branch-bound reader sees it and cannot save
 * it. Reading needs `school.fees.view`; saving needs `school.fees.update` and a
 * whole-school reach, and a refusal from the server (403) is named as that.
 * School-only, as the fee due date beside it: the endpoint is the FAL's.
 *
 * Laid out as every Finance setting is: a name, its control, and the
 * explanation behind the ⓘ beside it. A problem with the amount typed stays on
 * the page, under the box.
 */

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HintedPanel, SettingField, SettingToggle } from "@/components/finance-ui";
import { SettingsSectionHeader } from "@/components/settings/settings-layout";
import { useSettingsWrite } from "@/pages/protected/settings/use-settings-write";
import { ReadOnlyNote } from "@/pages/protected/settings/sections/shared";
import { P } from "@/permissions";
import {
  useGetStudentPaymentRulesQuery,
  useUpdateStudentPaymentRulesMutation,
  type StudentPaymentRules,
} from "@/redux/services/school-finance/student-payment-rules-api";
import { parseApiError, writeErrorMessage } from "@/utils/api-error";

import { readWholeNaira } from "./whole-naira";

function StudentPaymentRulesForm({ rules }: { rules: StudentPaymentRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_FEES);
  const [save, { isLoading: saving }] = useUpdateStudentPaymentRulesMutation();
  const [enabled, setEnabled] = useState(rules.enabled);
  const [cardOn, setCardOn] = useState(rules.family_card_payments);
  const [minimum, setMinimum] = useState((rules.min_part_payment / 100).toLocaleString("en-NG"));

  const read = readWholeNaira(minimum);
  const minimumProblem = cardOn ? read.problem : "";
  const minimumChanged = cardOn && !read.problem && read.kobo !== rules.min_part_payment;
  const changed =
    enabled !== rules.enabled || cardOn !== rules.family_card_payments || minimumChanged;

  const onSave = async () => {
    if (!canSave || !changed || minimumProblem) return;
    try {
      const body: Partial<StudentPaymentRules> = {};
      if (enabled !== rules.enabled) body.enabled = enabled;
      if (cardOn !== rules.family_card_payments) body.family_card_payments = cardOn;
      if (minimumChanged) body.min_part_payment = read.kobo ?? undefined;
      const result = await save(body).unwrap();
      toast.success(result.message || "Student payment rules saved.");
    } catch (error) {
      toast.error(
        parseApiError(error).status === 403
          ? "Only a whole-school finance administrator can change these rules. Nothing was saved."
          : writeErrorMessage(error, "We could not save these rules. Try again."),
      );
    }
  };

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="Students paying their own fees"
        description="Whether students may pay their own fees, and whether families may pay by card."
        action={
          canSave ? (
            <Button
              onClick={onSave}
              disabled={!changed || saving || Boolean(minimumProblem)}
              className="font-mont text-xs"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : undefined
        }
      />

      <ReadOnlyNote reason={reason} subject="these rules" />

      <HintedPanel
        title="Paying in the student portal"
        hint="Fees are normally paid by a parent or guardian in their own app. Paying in the student portal is for a family that cannot."
      >
        <SettingToggle
          label="Students may pay their own fees"
          hint={<>
            <p>On: students see a Pay button on their invoices. Card and bank details are entered on the payment page, never in the portal.</p>
            <p>Off: students see their fees but cannot pay them. Their family pays in their own app or at the school.</p>
          </>}
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={!canSave}
        />
      </HintedPanel>

      <HintedPanel
        title="How families pay"
        hint="Without card, a family pays by bank transfer to the student's own account number. Card is for families who cannot transfer."
      >
        <SettingToggle
          label="Card payments for families"
          hint={<>
            <p>Off: parents and pupils pay fees by bank transfer to each pupil's own account number, inside the app.</p>
            <p>On: they can also pay by card. Turn it on if many of your parents pay from abroad.</p>
          </>}
          checked={cardOn}
          onCheckedChange={setCardOn}
          disabled={!canSave}
        />
        {!canSave ? (
          <p className="px-4 pb-4 font-mont text-xs leading-5 text-gray-05 sm:px-5">
            A whole-school finance administrator can change this.
          </p>
        ) : null}
        {cardOn ? (
          <div className="px-4 py-4 sm:px-5">
            <SettingField
              label="Minimum card part-payment (₦)"
              hint="In whole naira. A payer can always pay the whole balance of an invoice, however small."
            >
              {(id) => (
                <>
                  <Input
                    id={id}
                    className="max-w-40"
                    inputMode="numeric"
                    value={minimum}
                    disabled={!canSave}
                    aria-invalid={minimumProblem ? true : undefined}
                    onChange={(event) => setMinimum(event.target.value)}
                  />
                  {minimumProblem ? (
                    <p role="alert" className="mt-1.5 font-mont text-[11px] text-destructive">
                      {minimumProblem}
                    </p>
                  ) : null}
                </>
              )}
            </SettingField>
          </div>
        ) : null}
      </HintedPanel>
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
      key={`${rules.enabled}:${rules.min_part_payment}:${rules.family_card_payments}`}
      rules={rules}
    />
  );
}
