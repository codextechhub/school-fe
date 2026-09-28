import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import {
  useGetAdmissionRulesQuery,
  useUpdateAdmissionRulesMutation,
} from "@/redux/services/students/students-api";
import type { AdmissionRules } from "@/redux/services/students/students-types";
import { fieldErrors, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";

const MAX_STAGES = 12;

interface DraftStage {
  /** Absent for a stage added here and not yet saved. */
  id?: number;
  /** Stable React key, since a new stage has no id. */
  key: string;
  name: string;
  is_offer: boolean;
  days: string;
  applicants: number;
}

/**
 * The school's own admission steps, and what an applicant needs before they
 * are put on the roll.
 *
 * A school names its steps in its own order (Entrance exam, Interview, Offer,
 * Accepted); a school with none admits on the spot. A step marked as an offer
 * gives the family a number of days to accept, and an offer left past that
 * reads "Offer expired" on the applicants board for a person to decide:
 * nothing is rejected on its own. A step still holding applicants cannot be
 * removed until they are moved on.
 */
export function AdmissionsSection() {
  const query = useGetAdmissionRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading admission rules…" />;
  if (query.isError || !rules) {
    return (
      <SectionLoadError
        forbidden={parseApiError(query.error).status === 403}
        retry={query.refetch}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Admissions"
        description="The steps an applicant goes through at your school, and what they need before they are put on the roll."
      />
      <AdmissionsForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

function toDraft(rules: AdmissionRules): DraftStage[] {
  return [...rules.stages]
    .sort((a, b) => a.position - b.position)
    .map((stage) => ({
      id: stage.id,
      key: `s${stage.id}`,
      name: stage.name,
      is_offer: stage.is_offer,
      days: stage.offer_valid_days == null ? "" : String(stage.offer_valid_days),
      applicants: stage.applicants,
    }));
}

function AdmissionsForm({ rules }: { rules: AdmissionRules }) {
  const { hasPermission } = usePermissions();
  const canSave = hasPermission(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateAdmissionRulesMutation();
  const [stages, setStages] = useState<DraftStage[]>(() => toDraft(rules));
  const [documents, setDocuments] = useState<string[]>(rules.required_documents_to_confirm);
  const [nextKey, setNextKey] = useState(1);
  const [serverError, setServerError] = useState("");

  const problemOf = (stage: DraftStage, index: number): string => {
    const name = stage.name.trim();
    if (!name) return "Give this step a name.";
    if (name.length > 40) return "Keep the name to 40 characters.";
    if (stages.some((other, i) => i !== index && other.name.trim().toLowerCase() === name.toLowerCase())) {
      return "Two steps have this name.";
    }
    if (stage.is_offer) {
      const days = Number(stage.days);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return "Give the family 1 to 365 days to accept.";
      }
    }
    return "";
  };
  const problems = stages.map(problemOf);
  const invalid = problems.some(Boolean);

  const original = toDraft(rules);
  const shape = (list: DraftStage[]) =>
    JSON.stringify(list.map((s) => [s.id ?? null, s.name.trim(), s.is_offer, s.is_offer ? s.days : ""]));
  const changed =
    shape(stages) !== shape(original) ||
    [...documents].sort().join() !== [...rules.required_documents_to_confirm].sort().join();

  const update = (index: number, next: Partial<DraftStage>) =>
    setStages(stages.map((s, i) => (i === index ? { ...s, ...next } : s)));
  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[index], next[target]] = [next[target], next[index]];
    setStages(next);
  };
  const add = () => {
    setStages([...stages, { key: `n${nextKey}`, name: "", is_offer: false, days: "14", applicants: 0 }]);
    setNextKey(nextKey + 1);
  };

  const onSave = async () => {
    if (!changed || invalid) return;
    setServerError("");
    try {
      await save({
        stages: stages.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          name: s.name.trim(),
          is_offer: s.is_offer,
          offer_valid_days: s.is_offer ? Number(s.days) : null,
        })),
        required_documents_to_confirm: documents,
      }).unwrap();
      toast.success("Admission rules saved.");
    } catch (error) {
      const named = Object.values(fieldErrors(error))[0];
      setServerError(named || writeErrorMessage(error, "We could not save these rules. Try again."));
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Admission steps"
        description="In order. With no steps, an applicant is simply waiting until they are put on the roll or their application is closed."
      >
        <div className="space-y-3 px-4 py-4 sm:px-5">
          {stages.length === 0 ? (
            <p className="font-mont text-xs text-gray-05">No steps. Your school admits on the spot.</p>
          ) : (
            <ol className="space-y-2.5">
              {stages.map((stage, index) => (
                <li key={stage.key} className="rounded-xl border border-white-02 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-7 shrink-0 place-content-center rounded-full bg-gray-03 font-mont text-xs font-semibold text-gray-01">
                      {index + 1}
                    </span>
                    <Input
                      aria-label={`Step ${index + 1} name`}
                      className="min-w-0 flex-1 basis-40"
                      placeholder="For example, Interview"
                      value={stage.name}
                      maxLength={60}
                      disabled={!canSave}
                      onChange={(e) => update(index, { name: e.target.value })}
                    />
                    {canSave ? (
                      <span className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === stages.length - 1} onClick={() => move(index, 1)}>
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${stage.name || "this step"}`}
                          disabled={stage.applicants > 0}
                          title={stage.applicants > 0 ? `${stage.applicants} applicant${stage.applicants === 1 ? " is" : "s are"} here. Move them first.` : undefined}
                          onClick={() => setStages(stages.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 pl-9">
                    <label className="flex items-center gap-2 font-mont text-xs text-gray-01">
                      <Switch
                        checked={stage.is_offer}
                        disabled={!canSave}
                        onCheckedChange={(on) => update(index, { is_offer: on })}
                        aria-label={`${stage.name || "This step"} is an offer`}
                      />
                      An offer the family accepts
                    </label>
                    {stage.is_offer ? (
                      <label className="flex items-center gap-2 font-mont text-xs text-gray-01">
                        within
                        <Input
                          className="h-8 w-20"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={365}
                          disabled={!canSave}
                          value={stage.days}
                          onChange={(e) => update(index, { days: e.target.value })}
                        />
                        days
                      </label>
                    ) : null}
                    {stage.applicants > 0 ? (
                      <span className="font-mont text-[11px] text-gray-05">
                        {stage.applicants} applicant{stage.applicants === 1 ? "" : "s"} here now
                      </span>
                    ) : null}
                  </div>
                  {problems[index] ? (
                    <p role="alert" className="mt-2 pl-9 font-mont text-[11px] text-destructive">{problems[index]}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {canSave ? (
            <Button variant="outline" onClick={add} disabled={stages.length >= MAX_STAGES}>
              <Plus className="size-4" />
              Add a step
            </Button>
          ) : null}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Documents needed before enrolling"
        description="No child joins the roll without these. An applicant is held until they are on their record, a child enrolled directly must have them attached, and a spreadsheet brings children in as applicants. Leave all unticked to enrol at once."
      >
        <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {rules.document_types.map((doc) => (
            <label key={doc.value} className="flex min-w-0 items-center gap-2.5 font-mont text-sm text-gray-01">
              <Checkbox
                checked={documents.includes(doc.value)}
                disabled={!canSave}
                onCheckedChange={(on) =>
                  setDocuments(on === true ? [...documents, doc.value] : documents.filter((d) => d !== doc.value))
                }
              />
              <span className="min-w-0">{doc.label}</span>
            </label>
          ))}
        </div>
      </SettingsPanel>

      {serverError ? (
        <p role="alert" className="font-mont text-xs text-destructive">{serverError}</p>
      ) : null}

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || invalid || saving}>
            Save admission rules
          </Button>
        </div>
      ) : (
        <p className="font-mont text-xs text-gray-05">
          You can read these rules. Changing them is the school administrator's to do.
        </p>
      )}
    </div>
  );
}
