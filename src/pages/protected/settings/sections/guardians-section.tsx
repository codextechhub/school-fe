import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useGetGuardianRulesQuery,
  useUpdateGuardianRulesMutation,
} from "@/redux/services/students/students-api";
import {
  RELATIONSHIPS,
  type GuardianRules,
} from "@/redux/services/students/students-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";

const MATCHING_TEXT: Record<GuardianRules["matching"], string> = {
  EMAIL_THEN_PHONE:
    "Two children whose guardian shares an email, or failing that a phone number, are treated as siblings with one guardian.",
  EMAIL_ONLY:
    "Only a shared email makes siblings. Families who share a landline stay separate.",
};

const FIELDS = [
  "min_per_student",
  "email_required",
  "matching",
  "extra_relationships",
] as const;

const MAX_EXTRAS = 10;

/**
 * The school's rules for guardians.
 *
 * How many guardians each child needs, whether a new guardian must have an
 * email, how siblings are recognised, and the relationship words the school
 * uses beyond the fixed ones. Every form that adds or links a guardian, and
 * both imports, apply the same rules on the server.
 */
export function GuardiansSection() {
  const query = useGetGuardianRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading guardian rules…" />;
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
        title="Guardians"
        description="Who a child's record must name, and how the school recognises one family across several children."
      />
      <GuardiansForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

function GuardiansForm({ rules }: { rules: GuardianRules }) {
  const { hasPermission } = usePermissions();
  const canSave = hasPermission(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateGuardianRulesMutation();

  const [minimum, setMinimum] = useState(String(rules.min_per_student));
  const [emailRequired, setEmailRequired] = useState(rules.email_required);
  const [matching, setMatching] = useState(rules.matching);
  const [extras, setExtras] = useState<string[]>(rules.extra_relationships);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const min = Number(minimum);
  const minProblem =
    !Number.isInteger(min) || min < 1 || min > 4 ? "Choose 1 to 4 guardians." : "";

  const taken = (word: string) =>
    extras.some((e) => e.toLowerCase() === word.toLowerCase()) ||
    RELATIONSHIPS.some((r) => r.label.toLowerCase() === word.toLowerCase());
  const word = draft.trim();
  const draftProblem = !word
    ? ""
    : word.length > 30
      ? "Keep it to 30 characters."
      : taken(word)
        ? "That relationship is already on the list."
        : extras.length >= MAX_EXTRAS
          ? `A school can add up to ${MAX_EXTRAS}.`
          : "";

  const changed =
    min !== rules.min_per_student ||
    emailRequired !== rules.email_required ||
    matching !== rules.matching ||
    extras.join("\n") !== rules.extra_relationships.join("\n");

  const add = () => {
    if (!word || draftProblem) return;
    setExtras([...extras, word]);
    setDraft("");
  };

  const onSave = async () => {
    if (!changed || minProblem) return;
    setErrors({});
    try {
      await save({
        min_per_student: min,
        email_required: emailRequired,
        matching,
        extra_relationships: extras,
      }).unwrap();
      toast.success("Guardian rules saved.");
    } catch (error) {
      const byField = fieldErrorsFor(error, FIELDS);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save these rules. Try again."));
      }
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Guardians per child"
        description="A child cannot be enrolled with fewer, and the last ones cannot be unlinked. An import still brings in one per row, and marks the record for the rest."
      >
        <div className="space-y-2 px-4 py-4 sm:px-5">
          <label className="block max-w-40">
            <span className="font-mont text-xs text-gray-01">At least</span>
            <Input
              className="mt-1"
              type="number"
              inputMode="numeric"
              min={1}
              max={4}
              disabled={!canSave}
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
            />
          </label>
          <ErrorLine text={minProblem || errors.min_per_student} />
        </div>
      </SettingsPanel>

      <SettingsPanel title="Contact details">
        <label className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
          <span className="min-w-0">
            <span className="block font-mont text-sm font-medium text-gray-01">Email required for a new guardian</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              A phone number is always required. A guardian already on record without an email can
              still be linked to another child.
            </span>
          </span>
          <Switch
            checked={emailRequired}
            disabled={!canSave}
            onCheckedChange={setEmailRequired}
            aria-label="Email required for a new guardian"
          />
        </label>
        <ErrorLine text={errors.email_required} padded />
      </SettingsPanel>

      <SettingsPanel
        title="Recognising siblings"
        description="When a new child's guardian matches one already at the school, the two children share that guardian."
      >
        <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {rules.matching_options.map((option) => {
            const value = option.value as GuardianRules["matching"];
            const active = value === matching;
            return (
              <button
                key={value}
                type="button"
                disabled={!canSave}
                aria-pressed={active}
                onClick={() => setMatching(value)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed",
                  active ? "border-primary bg-primary/5" : "border-white-02 bg-white hover:border-gray-02",
                )}
              >
                <span className="block font-mont text-xs font-semibold text-gray-01">{option.label}</span>
                <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">
                  {MATCHING_TEXT[value] ?? ""}
                </span>
              </button>
            );
          })}
          <ErrorLine text={errors.matching} />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Your own relationships"
        description="Words your school uses beyond Mother, Father, Uncle, Aunt, Grandparent, Legal guardian, Sibling and Other. Removing one later leaves the children already linked with it as they are."
      >
        <div className="space-y-3 px-4 py-4 sm:px-5">
          {extras.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {extras.map((extra) => (
                <li
                  key={extra}
                  className="flex items-center gap-1.5 rounded-full border border-white-02 bg-gray-03 py-1 pl-3 pr-1.5 font-mont text-xs text-gray-01"
                >
                  {extra}
                  {canSave ? (
                    <button
                      type="button"
                      aria-label={`Remove ${extra}`}
                      onClick={() => setExtras(extras.filter((e) => e !== extra))}
                      className="grid size-5 place-content-center rounded-full text-gray-05 hover:bg-white hover:text-gray-01"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mont text-xs text-gray-05">None yet.</p>
          )}
          {canSave ? (
            <div className="flex max-w-md flex-wrap items-start gap-2">
              <Input
                className="min-w-0 flex-1"
                placeholder="For example, Sponsor"
                value={draft}
                maxLength={40}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
              />
              <Button variant="outline" onClick={add} disabled={!word || !!draftProblem}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          ) : null}
          <ErrorLine text={draftProblem || errors.extra_relationships} />
        </div>
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || !!minProblem || saving}>
            Save guardian rules
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

function ErrorLine({ text, padded }: { text?: string; padded?: boolean }) {
  if (!text) return null;
  return (
    <p role="alert" className={cn("font-mont text-[11px] text-destructive sm:col-span-full", padded && "px-4 pb-3 sm:px-5")}>
      {text}
    </p>
  );
}
