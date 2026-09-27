import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import {
  useGetAdmissionPolicyQuery,
  useUpdateAdmissionPolicyMutation,
} from "@/redux/services/students/students-api";
import type { AdmissionPolicy } from "@/redux/services/students/students-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";

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

/**
 * The school's own rule for admission numbers.
 *
 * Most schools number children as a fixed prefix and a run of digits
 * (`BSS/0142`), so that shape is offered in plain words and turned into the
 * pattern here. A school with a rule that does not fit it can still write the
 * pattern itself. Either way the rule can be tried against a number before it
 * is saved, because a rule that refuses every real number stops enrolment dead.
 *
 * The hint is what the enrolment form prints under the field, so it is what a
 * clerk actually reads.
 */
export function AdmissionNumbersSection() {
  const query = useGetAdmissionPolicyQuery();
  const policy = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading the admission number rule…" />;
  if (query.isError || !policy) {
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
        title="Admission numbers"
        description="Whether every child must have an admission number when they are enrolled, and what a valid one looks like at your school."
      />
      <AdmissionForm key={JSON.stringify(policy)} policy={policy} />
    </div>
  );
}

function AdmissionForm({ policy }: { policy: AdmissionPolicy }) {
  const [save, { isLoading: saving }] = useUpdateAdmissionPolicyMutation();
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

  const changed = required !== policy.required || pattern !== policy.pattern || hint !== policy.hint;
  const sampleResult = sample && patternValid && pattern ? new RegExp(pattern).test(sample) : null;

  const onSave = async () => {
    if (!changed || !patternValid) return;
    setErrors({});
    try {
      await save({ required, pattern, hint: hint.trim() }).unwrap();
      toast.success("Admission number rule saved.");
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
            <span className="block font-mont text-sm font-medium text-gray-01">Required at enrolment</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              When on, a child cannot be enrolled without an admission number.
            </span>
          </span>
          <Switch checked={required} onCheckedChange={setRequired} aria-label="Required at enrolment" />
        </label>

        <div className="space-y-3">
          <p className="font-mont text-sm font-medium text-gray-01">What a valid number looks like</p>
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

          {mode === "simple" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="font-mont text-xs text-gray-01">Starts with</span>
                <Input className="mt-1" value={prefix} placeholder="BSS/" onChange={(e) => setPrefix(e.target.value)} />
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
              <Input className="mt-1" value={sample} placeholder={example || "Type an admission number"} onChange={(e) => setSample(e.target.value)} />
              {sampleResult !== null ? (
                <span className={`mt-1 block font-mont text-[11px] ${sampleResult ? "text-green-01" : "text-destructive"}`}>
                  {sampleResult ? "This number would be accepted." : "This number would be refused."}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>

        <label className="block">
          <span className="font-mont text-sm font-medium text-gray-01">Hint shown on the enrolment form</span>
          <Input
            className="mt-1"
            value={hint}
            maxLength={200}
            placeholder={example ? `For example ${example}` : "Optional"}
            onChange={(e) => setHint(e.target.value)}
          />
          {errors.hint ? (
            <span role="alert" className="mt-1 block font-mont text-[11px] text-destructive">{errors.hint}</span>
          ) : null}
        </label>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button onClick={onSave} loading={saving} disabled={!changed || !patternValid || saving}>
            Save rule
          </Button>
        </div>
      </div>
    </SettingsPanel>
  );
}
