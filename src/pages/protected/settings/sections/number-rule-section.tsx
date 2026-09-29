import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import type { PermissionCode } from "@/permissions";
import type { AdmissionPolicy } from "@/redux/services/students/students-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";
import { useSettingsBranches } from "../use-settings-branches";
import { useSettingsWrite } from "../use-settings-write";

type Mode = "none" | "simple" | "custom";

const escapeRegex = (text: string) => text.replace(/[\\^$.*+?()[\]{}|/-]/g, "\\$&");

/** `^BSS/\d{4}$` back into "BSS/" and 4, or null when it is not that shape. */
function parseSimple(pattern: string): { prefix: string; digits: number } | null {
  const match = /^\^((?:\\.|[^\\^$.*+?()[\]{}|])*)\\d\{(\d+)\}\$$/.exec(pattern);
  if (!match) return null;
  return { prefix: match[1].replace(/\\(.)/g, "$1"), digits: Number(match[2]) };
}

const simplePattern = (prefix: string, digits: number) => `^${escapeRegex(prefix)}\\d{${digits}}$`;

function compiles(pattern: string) {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/** A number rule as both endpoints speak it; staff IDs reuse the admission shape. */
type NumberPolicy = AdmissionPolicy;
type PolicyWrite = Omit<NumberPolicy, "suggestion" | "source"> & { branch?: string };

interface Unwrappable {
  unwrap: () => Promise<unknown>;
}

/**
 * What one number rule differs in: its endpoints and its words.
 *
 * The `use*` members are the rule's RTK Query hooks, each called once on
 * every render of the form that uses it.
 */
export interface NumberRuleConfig {
  title: string;
  description: string;
  loadingLabel: string;
  /** The key the endpoint's write checks, before reach. */
  permission: PermissionCode;
  /** The switch's label, such as "Required at enrolment". */
  requiredLabel: string;
  requiredHelp: string;
  hintLabel: string;
  autoIssueHelp: string;
  samplePlaceholder: string;
  prefixPlaceholder: string;
  savedToast: string;
  useRule: (
    branch: string,
    skip: boolean,
  ) => {
    currentData?: { data: NumberPolicy };
    isError: boolean;
    error?: unknown;
    refetch: () => unknown;
  };
  useSave: () => readonly [(write: PolicyWrite) => Unwrappable, { isLoading: boolean }];
  useReset: () => readonly [(branch: string) => Unwrappable, { isLoading: boolean }];
}

/**
 * A school's own rule for the numbers it issues: admission numbers for
 * children, staff IDs for staff.
 *
 * Most schools number people as a fixed prefix and a run of digits
 * (`BSS/0142`), so that shape is offered in plain words and turned into the
 * pattern here. A school with a rule that does not fit it can still write the
 * pattern itself. Either way the rule can be tried against a number before it
 * is saved, because a rule that refuses every real number stops enrolment or
 * hiring dead.
 *
 * The hint is what the form prints under the field, so it is what a clerk
 * actually reads.
 *
 * A branch may keep its own rule (Lekki numbers `LK/`, the Annex `AX/`). A
 * branch without one follows the school's, and a number is unique across the
 * whole school whichever rule it follows. The picker offers only the branches
 * the reader reaches, and is absent at a single-branch school. A reader who
 * covers only some branches opens on their own, and reads the school's rule
 * without changing it (`useSettingsWrite`).
 */
export function NumberRuleSection({ config }: { config: NumberRuleConfig }) {
  const branches = useSettingsBranches();
  // A reader who cannot act for the whole school opens on their own branch.
  const [picked, setPicked] = useState<string | null>(null);
  const branch =
    picked ?? (!branches.wholeSchool && branches.choices[0] ? String(branches.choices[0].id) : "");
  const { canSave, reason } = useSettingsWrite(config.permission, branch);
  const query = config.useRule(branch, branches.isLoading);
  // currentData: while another branch loads, `data` still holds the last one's.
  const policy = query.currentData?.data;
  const branchName = branches.choices.find((b) => String(b.id) === branch)?.name;

  return (
    <div className="space-y-5">
      <SettingsSectionHeader title={config.title} description={config.description} />

      {branches.applies && branches.choices.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white-02 bg-white p-4">
          <div className="w-full sm:w-60">
            <NativeSelect
              aria-label="Which rule to edit"
              value={branch}
              disabled={branches.isLoading}
              onChange={(event) => setPicked(event.target.value)}
            >
              <option value="">Whole school</option>
              {branches.choices.map((item) => (
                <option key={item.id} value={String(item.id)}>{item.name}</option>
              ))}
            </NativeSelect>
          </div>
          <p className="min-w-0 flex-1 font-mont text-xs leading-5 text-gray-05">
            {branchName
              ? policy?.source === "branch"
                ? `${branchName} has its own rule.`
                : `${branchName} follows the school's rule. Saving here gives it its own.`
              : "The school's rule, followed by every branch that has not set its own."}
          </p>
        </div>
      ) : null}

      {policy ? (
        <NumberRuleForm
          key={`${branch}:${JSON.stringify(policy)}`}
          config={config}
          policy={policy}
          branch={branch}
          branchName={branchName}
          canSave={canSave}
          readOnly={
            <ReadOnlyNote
              reason={reason}
              subject="this rule"
              one
              branchPicker={branches.applies && branches.choices.length > 0}
            />
          }
        />
      ) : query.isError ? (
        <SectionLoadError
          forbidden={parseApiError(query.error).status === 403}
          retry={query.refetch}
        />
      ) : (
        <SectionLoading label={config.loadingLabel} />
      )}
    </div>
  );
}

function NumberRuleForm({
  config,
  policy,
  branch,
  branchName,
  canSave,
  readOnly,
}: {
  config: NumberRuleConfig;
  policy: NumberPolicy;
  branch: string;
  branchName?: string;
  canSave: boolean;
  /** Shown in place of the actions when the reader may not change this rule. */
  readOnly: ReactNode;
}) {
  const [save, { isLoading: saving }] = config.useSave();
  const [reset, { isLoading: resetting }] = config.useReset();
  const [autoIssue, setAutoIssue] = useState(policy.auto_issue ?? false);
  const simple = parseSimple(policy.pattern);
  const [required, setRequired] = useState(policy.required);
  const [mode, setMode] = useState<Mode>(!policy.pattern ? "none" : simple ? "simple" : "custom");
  const [prefix, setPrefix] = useState(simple?.prefix ?? "");
  const [digits, setDigits] = useState(String(simple?.digits ?? 4));
  const [custom, setCustom] = useState(policy.pattern);
  const [hint, setHint] = useState(policy.hint);
  const [sample, setSample] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const digitsNumber = Number(digits);
  const digitsValid = Number.isInteger(digitsNumber) && digitsNumber >= 1 && digitsNumber <= 12;
  const pattern =
    mode === "none" ? "" : mode === "simple" ? (digitsValid ? simplePattern(prefix, digitsNumber) : "") : custom.trim();
  const patternValid = mode === "none" || (pattern !== "" && compiles(pattern));
  const example = mode === "simple" && digitsValid ? `${prefix}${"0".repeat(digitsNumber - 1)}1` : "";

  const changed =
    required !== policy.required ||
    pattern !== policy.pattern ||
    hint !== policy.hint ||
    autoIssue !== (policy.auto_issue ?? false);
  const sampleResult = sample && patternValid && pattern ? new RegExp(pattern).test(sample) : null;

  const onSave = async () => {
    if (!changed || !patternValid) return;
    setErrors({});
    try {
      await save({
        required,
        pattern,
        hint: hint.trim(),
        auto_issue: autoIssue,
        branch: branch || undefined,
      }).unwrap();
      toast.success(branchName ? `Rule saved for ${branchName}.` : config.savedToast);
    } catch (error) {
      const byField = fieldErrorsFor(error, ["required", "pattern", "hint"]);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save the rule. Try again."));
      }
    }
  };

  return (
    <SettingsPanel>
      <div className="space-y-5 px-4 py-5 sm:px-5">
        <label className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block font-mont text-sm font-medium text-gray-01">{config.requiredLabel}</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">{config.requiredHelp}</span>
          </span>
          <Switch checked={required} disabled={!canSave} onCheckedChange={setRequired} aria-label={config.requiredLabel} />
        </label>

        <div className="space-y-3">
          <p className="font-mont text-sm font-medium text-gray-01">What a valid number looks like</p>
          <fieldset disabled={!canSave} className="min-w-0">
            <SegmentedToggle<Mode>
              value={mode}
              onChange={setMode}
              ariaLabel="What a valid number looks like"
              options={[
                { value: "none", label: "Any number" },
                { value: "simple", label: "Prefix and digits" },
                { value: "custom", label: "Custom pattern" },
              ]}
            />
          </fieldset>

          {mode === "simple" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="font-mont text-xs text-gray-01">Starts with</span>
                <Input className="mt-1" value={prefix} placeholder={config.prefixPlaceholder} disabled={!canSave} onChange={(e) => setPrefix(e.target.value)} />
              </label>
              <label className="block min-w-0">
                <span className="font-mont text-xs text-gray-01">Then this many digits</span>
                <Input
                  className="mt-1"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={12}
                  value={digits}
                  disabled={!canSave}
                  aria-invalid={digitsValid ? undefined : true}
                  onChange={(e) => setDigits(e.target.value)}
                />
              </label>
              <p className="font-mont text-xs text-gray-05 sm:col-span-2">
                {digitsValid ? <>For example <span className="font-medium text-gray-01">{example}</span></> : "Choose between 1 and 12 digits."}
              </p>
            </div>
          ) : null}

          {mode === "custom" ? (
            <label className="block">
              <span className="font-mont text-xs text-gray-01">Pattern (a regular expression)</span>
              <Input
                className="mt-1 font-mono"
                value={custom}
                disabled={!canSave}
                placeholder="^BSS/[0-9]{4}$"
                aria-invalid={patternValid ? undefined : true}
                onChange={(e) => setCustom(e.target.value)}
              />
              {!patternValid ? (
                <span role="alert" className="mt-1 block font-mont text-[11px] text-destructive">
                  This pattern is not valid. Check the brackets and symbols.
                </span>
              ) : null}
            </label>
          ) : null}
          {errors.pattern ? (
            <p role="alert" className="font-mont text-[11px] text-destructive">{errors.pattern}</p>
          ) : null}

          {mode !== "none" ? (
            <label className="block">
              <span className="font-mont text-xs text-gray-01">Try a number</span>
              <Input className="mt-1" value={sample} placeholder={example || config.samplePlaceholder} onChange={(e) => setSample(e.target.value)} />
              {sampleResult !== null ? (
                <span className={`mt-1 block font-mont text-[11px] ${sampleResult ? "text-green-01" : "text-destructive"}`}>
                  {sampleResult ? "This number would be accepted." : "This number would be refused."}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>

        <label className="block">
          <span className="font-mont text-sm font-medium text-gray-01">{config.hintLabel}</span>
          <Input
            className="mt-1"
            value={hint}
            maxLength={200}
            disabled={!canSave}
            placeholder={example ? `For example ${example}` : "Optional"}
            onChange={(e) => setHint(e.target.value)}
          />
          {errors.hint ? (
            <span role="alert" className="mt-1 block font-mont text-[11px] text-destructive">{errors.hint}</span>
          ) : null}
        </label>

        <label className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block font-mont text-sm font-medium text-gray-01">Issue numbers automatically</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">{config.autoIssueHelp}</span>
          </span>
          <Switch checked={autoIssue} disabled={!canSave} onCheckedChange={setAutoIssue} aria-label="Issue numbers automatically" />
        </label>

        {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {branch && policy.source === "branch" ? (
            <Button
              variant="outline"
              disabled={resetting || saving}
              onClick={() =>
                reset(branch)
                  .unwrap()
                  .then(() => toast.success(`${branchName ?? "This branch"} now follows the school's rule.`))
                  .catch((error) => toast.error(writeErrorMessage(error, "That could not be changed.")))
              }
            >
              Use the school&apos;s rule
            </Button>
          ) : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || !patternValid || saving}>
            Save rule
          </Button>
        </div>
        ) : (
          readOnly
        )}
      </div>
    </SettingsPanel>
  );
}
