import { useState } from "react";
import { toast } from "sonner";
import { CircleAlert, Landmark, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SettingsPanel,
  SettingsRow,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { P } from "@/permissions";
import {
  useGetPayrollScopeQuery,
  useUpdatePayrollScopeMutation,
} from "@/redux/services/school/school-settings-api";
import type { PayrollScope } from "@/redux/services/school/school-settings-types";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import { useSettingsWrite } from "../use-settings-write";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

const ICONS: Record<PayrollScope, typeof Landmark> = {
  CENTRAL: Landmark,
  PER_BRANCH: Network,
};

/**
 * Whether the school pays everybody in one run, or each branch runs its own.
 *
 * The switch is trivial. The refusal is the feature. Moving to per-branch is
 * refused while any active employee has no branch, because a branch run
 * covers exactly its own people and an unassigned person would simply not be
 * paid. The server names those people, and the refusal stays on screen rather
 * than in a toast that vanishes, because that list is what the reader has to
 * go and act on.
 */
export function PayrollSection() {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const query = useGetPayrollScopeQuery();
  const [save, { isLoading: saving }] = useUpdatePayrollScopeMutation();
  const [refusal, setRefusal] = useState<string | null>(null);
  const data = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading payroll settings…" />;
  if (query.isError || !data) {
    return (
      <SectionLoadError
        forbidden={parseApiError(query.error).status === 403}
        retry={query.refetch}
      />
    );
  }

  const choose = async (next: PayrollScope) => {
    if (next === data.scope) return;
    setRefusal(null);
    try {
      await save({ scope: next }).unwrap();
      toast.success(next === "PER_BRANCH" ? "Each branch now runs its own payroll." : "Payroll now runs once for the whole school.");
    } catch (error) {
      // The server names the people without a branch in the sentence itself.
      setRefusal(apiErrorMessage(error, "The payroll setting could not be changed."));
    }
  };

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Payroll"
        description="Whether your school pays everybody in one payroll run, or each branch runs its own. A school runs one payroll until somebody changes this."
      />

      {refusal ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <p className="flex items-start gap-2 font-mont text-sm font-semibold text-amber-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            Per-branch payroll is not possible yet
          </p>
          <p className="mt-1.5 pl-6 font-mont text-xs leading-5 text-amber-900">{refusal}</p>
          <p className="mt-2 pl-6 font-mont text-[11px] leading-4 text-amber-800">
            Give each of them a branch on their staff record, then come back.
          </p>
        </div>
      ) : null}

      <SettingsPanel
        title="How your school runs payroll"
        description="Switching to per branch is refused while anybody active has no branch, because they would be on nobody's run."
      >
        {data.options.map((option) => (
          <SettingsRow
            key={option.value}
            icon={ICONS[option.value] ?? Landmark}
            label={option.label}
            description={option.description}
            value={
              data.scope === option.value ? (
                <Badge variant="active" className="font-mont text-xs">In use</Badge>
              ) : canSave ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving || query.isFetching}
                  onClick={() => choose(option.value)}
                >
                  {saving ? "Saving…" : "Use this"}
                </Button>
              ) : null
            }
          />
        ))}
      </SettingsPanel>

      <ReadOnlyNote reason={reason} subject="the payroll settings" />
    </div>
  );
}
