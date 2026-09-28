import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useGetEnrolmentRulesQuery,
  useUpdateEnrolmentRulesMutation,
} from "@/redux/services/students/students-api";
import type {
  CapacityMode,
  EnrolmentRules,
} from "@/redux/services/students/students-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { useSettingsWrite } from "../use-settings-write";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

const CAPACITY_MODES: { value: CapacityMode; label: string; description: string }[] = [
  {
    value: "WARN",
    label: "Warn, then allow",
    description: "A full class says so, and the person enrolling can go ahead anyway.",
  },
  {
    value: "HARD",
    label: "Never over capacity",
    description: "A full class takes nobody else, for enrolment, moves and promotion alike.",
  },
  {
    value: "OFF",
    label: "Don't check",
    description: "Capacity is shown for information only and never stops anybody.",
  },
];

const FIELDS = [
  "min_age_years",
  "max_age_years",
  "required_documents",
  "required_fields",
  "capacity_mode",
  "default_capacity",
] as const;

/**
 * The school's rules for enrolling a child.
 *
 * Every form that enrols or edits a pupil reads these same rules, so what is
 * set here is what the enrolment form checks and what the server refuses.
 * Documents stay a prompt: a school registering a child on the day they
 * arrive rarely has every paper in hand, so a missing one marks the record
 * incomplete rather than stopping the enrolment.
 */
export function EnrolmentSection() {
  const query = useGetEnrolmentRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading enrolment rules…" />;
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
        title="Enrolment"
        description="The rules a new pupil's record is checked against: how old they may be, what the school asks for, and how full a class may get."
      />
      <EnrolmentForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

function EnrolmentForm({ rules }: { rules: EnrolmentRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateEnrolmentRulesMutation();

  const [minAge, setMinAge] = useState(String(rules.min_age_years));
  const [maxAge, setMaxAge] = useState(String(rules.max_age_years));
  const [documents, setDocuments] = useState<string[]>(rules.required_documents);
  const [fields, setFields] = useState<string[]>(rules.required_fields);
  const [mode, setMode] = useState<CapacityMode>(rules.capacity_mode);
  const [defaultCapacity, setDefaultCapacity] = useState(
    rules.default_capacity == null ? "" : String(rules.default_capacity),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const min = Number(minAge);
  const max = Number(maxAge);
  const ageProblem =
    !Number.isInteger(min) || !Number.isInteger(max) || minAge.trim() === "" || maxAge.trim() === ""
      ? "Enter both ages as whole numbers."
      : min < 0 || max > 99
        ? "Ages run from 0 to 99."
        : min >= max
          ? "The youngest age must be below the oldest."
          : "";
  const capacity = defaultCapacity.trim() === "" ? null : Number(defaultCapacity);
  const capacityProblem =
    capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)
      ? "Leave it blank for no limit, or enter 1 to 500."
      : "";

  const same = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join();
  const changed =
    min !== rules.min_age_years ||
    max !== rules.max_age_years ||
    !same(documents, rules.required_documents) ||
    !same(fields, rules.required_fields) ||
    mode !== rules.capacity_mode ||
    capacity !== rules.default_capacity;

  const toggle = (list: string[], value: string, on: boolean) =>
    on ? [...list, value] : list.filter((item) => item !== value);

  const onSave = async () => {
    if (!changed || ageProblem || capacityProblem) return;
    setErrors({});
    try {
      await save({
        min_age_years: min,
        max_age_years: max,
        required_documents: documents,
        required_fields: fields,
        capacity_mode: mode,
        default_capacity: capacity,
      }).unwrap();
      toast.success("Enrolment rules saved.");
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
        title="Age at enrolment"
        description="A birth date outside this range is refused as a mistyped year. Age is counted in calendar years."
      >
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
          <label className="block min-w-0">
            <span className="font-mont text-xs text-gray-01">Youngest</span>
            <Input className="mt-1" type="number" inputMode="numeric" min={0} max={98} disabled={!canSave} value={minAge} onChange={(e) => setMinAge(e.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="font-mont text-xs text-gray-01">Oldest</span>
            <Input className="mt-1" type="number" inputMode="numeric" min={1} max={99} disabled={!canSave} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
          </label>
          <ErrorLine text={ageProblem || errors.min_age_years || errors.max_age_years} />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Documents to ask for"
        description="A child missing one of these shows as incomplete until it is uploaded. It never stops an enrolment."
      >
        <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {rules.document_types.map((doc) => (
            <CheckRow
              key={doc.value}
              label={doc.label}
              checked={documents.includes(doc.value)}
              disabled={!canSave}
              onChange={(on) => setDocuments(toggle(documents, doc.value, on))}
            />
          ))}
          <ErrorLine text={errors.required_documents} />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Details required at enrolment"
        description="Name, birth date, gender and a class are always required. Tick anything else a new record must have. Records already on the roll are not affected until someone edits that detail."
      >
        <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {rules.optional_fields.map((field) => (
            <CheckRow
              key={field.value}
              label={field.label}
              checked={fields.includes(field.value)}
              disabled={!canSave}
              onChange={(on) => setFields(toggle(fields, field.value, on))}
            />
          ))}
          <ErrorLine text={errors.required_fields} />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Class capacity"
        description="What happens when a class is full, and the size a new class starts with."
      >
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {CAPACITY_MODES.map((option) => {
              const active = option.value === mode;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!canSave}
                  aria-pressed={active}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed",
                    active ? "border-primary bg-primary/5" : "border-white-02 bg-white hover:border-gray-04",
                  )}
                >
                  <span className="block font-mont text-xs font-semibold text-gray-01">{option.label}</span>
                  <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">{option.description}</span>
                </button>
              );
            })}
          </div>
          <label className="block max-w-xs">
            <span className="font-mont text-xs text-gray-01">Capacity of a new class</span>
            <Input
              className="mt-1"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              placeholder="No limit"
              disabled={!canSave}
              value={defaultCapacity}
              onChange={(e) => setDefaultCapacity(e.target.value)}
            />
            <span className="mt-1 block font-mont text-[11px] text-gray-05">
              Used when a class or a set of arms is created without a capacity. Existing classes keep theirs.
            </span>
          </label>
          <ErrorLine text={capacityProblem || errors.default_capacity || errors.capacity_mode} />
        </div>
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || !!ageProblem || !!capacityProblem || saving}>
            Save enrolment rules
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2.5 font-mont text-sm text-gray-01">
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(value) => onChange(value === true)} />
      <span className="min-w-0">{label}</span>
    </label>
  );
}

function ErrorLine({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="font-mont text-[11px] text-destructive sm:col-span-full">
      {text}
    </p>
  );
}
