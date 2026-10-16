import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useGetPromotionRulesQuery,
  useUpdatePromotionRulesMutation,
} from "@/redux/services/students/students-api";
import type {
  CapacityMode,
  PromotionArms,
  PromotionCapacityMode,
  PromotionHoldOrMove,
  PromotionRules,
} from "@/redux/services/students/students-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { useSettingsWrite } from "../use-settings-write";
import { readPassMark } from "./pass-mark";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

interface Choice<T extends string> {
  value: T;
  label: string;
  description: string;
}

const SUSPENDED: Choice<PromotionHoldOrMove>[] = [
  {
    value: "HOLD",
    label: "Hold them where they are",
    description: "A suspended student stays in last year's class and is listed for someone to move by hand.",
  },
  {
    value: "PROMOTE",
    label: "Move them up, still suspended",
    description: "They go up with their year group. Lifting the suspension later needs no move.",
  },
];

const NOT_PLACED: Choice<PromotionHoldOrMove>[] = [
  {
    value: "HOLD",
    label: "Hold them where they are",
    description: "A student confirmed but not yet attending waits for a person to decide.",
  },
  {
    value: "PROMOTE",
    label: "Move them up too",
    description: "They go up with the class they were placed in and are marked as attending, as when a class is given by hand.",
  },
];

const ARMS: Choice<PromotionArms>[] = [
  {
    value: "SAME_ARM",
    label: "Keep each arm",
    description: "JSS1 B moves into JSS2 B. Where next year has no class with that arm, its students are shared across the next level's classes.",
  },
  {
    value: "SPREAD",
    label: "Spread across the arms",
    description: "A year group is shared out evenly across the next level's classes, emptiest first. Move anyone who belongs elsewhere afterwards.",
  },
];

const CAPACITY_LABEL: Record<CapacityMode, string> = {
  WARN: "Warn, then allow",
  HARD: "Never over capacity",
  OFF: "Don't check",
};

const CAPACITY: Choice<PromotionCapacityMode>[] = [
  {
    value: "FOLLOW_ENROLMENT",
    label: "Same as enrolment",
    description: "A full class does at promotion whatever it does when a child is enrolled.",
  },
  {
    value: "WARN",
    label: CAPACITY_LABEL.WARN,
    description: "The run names the full classes, and the person running it can go ahead anyway.",
  },
  {
    value: "HARD",
    label: CAPACITY_LABEL.HARD,
    description: "A run that would overfill any class is refused until a class is added or students are moved.",
  },
  {
    value: "OFF",
    label: CAPACITY_LABEL.OFF,
    description: "The run never checks capacity.",
  },
];

const FIELDS = ["suspended", "not_placed", "arms", "capacity_mode", "pass_mark"] as const;


/**
 * The school's rules for the end-of-year promotion.
 *
 * Who moves up (a suspended student, and one confirmed but not yet attending,
 * are held by default), whether a year group keeps its arms or is spread
 * across the next level's classes, and what a full class does during the run.
 * The promotion preview and the run both work from these rules, so the
 * preview a registrar reviews is what the run does.
 *
 * Promotion keeps its own capacity rule because a school that never squeezes
 * a new admission into a full class may still want a whole year group to move
 * up and be sorted out in September. Until the school sets one, promotion
 * follows the enrolment rule.
 *
 * The pass mark is guidance for staff and decides nothing: the promotion
 * preview shows it beside the outcomes, and whoever records them still decides
 * each student. Pupils and families never see it.
 */
export function PromotionSection() {
  const query = useGetPromotionRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading promotion rules…" />;
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
        title="Promotion"
        description="Who moves up at the end of the year, which class they land in, and what a full class does during the run."
      />
      <PromotionForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

function PromotionForm({ rules }: { rules: PromotionRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdatePromotionRulesMutation();
  const [suspended, setSuspended] = useState(rules.suspended);
  const [notPlaced, setNotPlaced] = useState(rules.not_placed);
  const [arms, setArms] = useState(rules.arms);
  const [capacity, setCapacity] = useState(rules.capacity_mode);
  const [passMark, setPassMark] = useState(rules.pass_mark == null ? "" : String(rules.pass_mark));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mark = readPassMark(passMark);
  const passMarkChanged = !mark.problem && mark.value !== (rules.pass_mark ?? null);
  const changed =
    suspended !== rules.suspended ||
    notPlaced !== rules.not_placed ||
    arms !== rules.arms ||
    capacity !== rules.capacity_mode ||
    passMarkChanged;

  const onSave = async () => {
    if (!changed || mark.problem) return;
    setErrors({});
    try {
      await save({
        suspended,
        not_placed: notPlaced,
        arms,
        capacity_mode: capacity,
        ...(passMarkChanged ? { pass_mark: mark.value } : {}),
      }).unwrap();
      toast.success("Promotion rules saved.");
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
      <SettingsPanel title="Suspended students" description="A student suspended when the year ends.">
        <Choices choices={SUSPENDED} value={suspended} onChange={setSuspended} disabled={!canSave} />
        <ErrorLine text={errors.suspended} />
      </SettingsPanel>

      <SettingsPanel
        title="Students not yet attending"
        description="Confirmed and placed in a class, but not yet marked as attending."
      >
        <Choices choices={NOT_PLACED} value={notPlaced} onChange={setNotPlaced} disabled={!canSave} />
        <ErrorLine text={errors.not_placed} />
      </SettingsPanel>

      <SettingsPanel title="Arms" description="Which class a promoted student lands in at the next level.">
        <Choices choices={ARMS} value={arms} onChange={setArms} disabled={!canSave} />
        <ErrorLine text={errors.arms} />
      </SettingsPanel>

      <SettingsPanel
        title="Full classes during promotion"
        description={`Enrolment is set to "${CAPACITY_LABEL[rules.enrolment_capacity_mode]}".`}
      >
        <Choices
          choices={CAPACITY}
          value={capacity}
          onChange={setCapacity}
          disabled={!canSave}
          columns="sm:grid-cols-2 lg:grid-cols-4"
        />
        <ErrorLine text={errors.capacity_mode} />
      </SettingsPanel>

      <SettingsPanel
        title="Pass mark"
        description="A guide for staff, shown beside the outcomes on the promotion screen. It promotes and holds back nobody, and students and families never see it."
      >
        <label className="block min-w-0 px-4 py-4 sm:px-5">
          <span className="font-mont text-sm font-medium text-gray-01">Pass mark (%)</span>
          <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
            Leave it empty if your school sets no pass mark.
          </span>
          <Input
            className="mt-2 max-w-32"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            placeholder="e.g. 50"
            disabled={!canSave}
            aria-invalid={mark.problem ? true : undefined}
            value={passMark}
            onChange={(event) => setPassMark(event.target.value)}
          />
        </label>
        <ErrorLine text={mark.problem || errors.pass_mark} />
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || saving || Boolean(mark.problem)}>
            Save promotion rules
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}

function Choices<T extends string>({
  choices,
  value,
  onChange,
  disabled,
  columns = "sm:grid-cols-2",
}: {
  choices: Choice<T>[];
  value: T;
  onChange: (next: T) => void;
  disabled: boolean;
  columns?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2.5 px-4 py-4 sm:px-5", columns)}>
      {choices.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed",
              active ? "border-primary bg-primary/5" : "border-white-02 bg-white hover:border-gray-02",
            )}
          >
            <span className="block font-mont text-xs font-semibold text-gray-01">{option.label}</span>
            <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function ErrorLine({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="px-4 pb-3 font-mont text-[11px] text-destructive sm:px-5">
      {text}
    </p>
  );
}
