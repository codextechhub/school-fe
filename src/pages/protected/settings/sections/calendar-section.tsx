import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useGetCalendarRulesQuery,
  useUpdateCalendarRulesMutation,
} from "@/redux/services/calendar/calendar-api";
import type { CalendarRules, TeacherDutyMatch } from "@/redux/services/calendar/calendar-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { useSettingsWrite } from "../use-settings-write";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 7, short: "Sun", label: "Sunday" },
];

/** Short card titles; the sentence under each says what it means. */
const DUTY_LABEL: Record<TeacherDutyMatch, string> = {
  OFF: "Don't check",
  WARN: "Warn",
  REFUSE: "Refuse",
};

const DUTY_TEXT: Record<TeacherDutyMatch, string> = {
  OFF: "Any teacher can be put on any lesson.",
  WARN: "A lesson given to a teacher without that class and subject in Teaching duties saves, with a warning, and publishing lists it.",
  REFUSE: "A lesson can only go to a teacher who has that class and subject in Teaching duties, and a timetable with a mismatch cannot be published.",
};

const FIELDS = [
  "teaching_days",
  "week_starts_on",
  "closes_school_by_type",
  "room_required_to_publish",
  "teacher_duty_match",
  "invigilator_roles",
  "default_period_minutes",
] as const;

/**
 * The school's rules for its calendar, timetables and exams.
 *
 * The days the school teaches (they shape every timetable and the "taught X of
 * Y days" count; staff leave keeps its own working days in Settings, Staff
 * rules), the day a week starts on, which kinds of event close the school when
 * one is added, what a timetable needs before it is published, who may
 * invigilate, and the length a new period starts with.
 *
 * Each is a default or a check on what happens next: nothing already on the
 * calendar or a published timetable changes when these do.
 */
export function CalendarSection() {
  const query = useGetCalendarRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading calendar settings…" />;
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
        title="Calendar and timetables"
        description="The days your school teaches, how its calendar reads, and what a timetable or exam needs."
      />
      <CalendarForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

function CalendarForm({ rules }: { rules: CalendarRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateCalendarRulesMutation();
  const [days, setDays] = useState<number[]>(rules.teaching_days);
  const [weekStart, setWeekStart] = useState<number>(rules.week_starts_on);
  const [closes, setCloses] = useState<Record<string, boolean>>(rules.closes_school_by_type);
  const [roomRequired, setRoomRequired] = useState(rules.room_required_to_publish);
  const [duty, setDuty] = useState<TeacherDutyMatch>(rules.teacher_duty_match);
  const [invigilators, setInvigilators] = useState<string[]>(rules.invigilator_roles);
  const [minutes, setMinutes] = useState(rules.default_period_minutes == null ? "" : String(rules.default_period_minutes));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const daysProblem = days.length === 0 ? "Choose at least one day the school teaches." : "";
  const invigilatorProblem = invigilators.length === 0 ? "Choose at least one role that may invigilate." : "";
  const minutesValue = minutes.trim() === "" ? null : Number(minutes);
  const minutesProblem =
    minutesValue !== null && (!Number.isInteger(minutesValue) || minutesValue < 10 || minutesValue > 240)
      ? "Use 10 to 240 minutes, or leave it blank."
      : "";

  const sorted = (list: (string | number)[]) => [...list].sort().join();
  const changed =
    sorted(days) !== sorted(rules.teaching_days) ||
    weekStart !== rules.week_starts_on ||
    JSON.stringify(closes) !== JSON.stringify(rules.closes_school_by_type) ||
    roomRequired !== rules.room_required_to_publish ||
    duty !== rules.teacher_duty_match ||
    sorted(invigilators) !== sorted(rules.invigilator_roles) ||
    minutesValue !== rules.default_period_minutes;
  const invalid = Boolean(daysProblem || invigilatorProblem || minutesProblem);

  const toggle = <T,>(list: T[], item: T, on: boolean) =>
    on ? [...list, item] : list.filter((x) => x !== item);

  const onSave = async () => {
    if (!changed || invalid) return;
    setErrors({});
    try {
      await save({
        teaching_days: [...days].sort((a, b) => a - b),
        week_starts_on: weekStart,
        closes_school_by_type: closes,
        room_required_to_publish: roomRequired,
        teacher_duty_match: duty,
        invigilator_roles: invigilators,
        default_period_minutes: minutesValue,
      }).unwrap();
      toast.success("Calendar and timetable settings saved.");
    } catch (error) {
      const byField = fieldErrorsFor(error, FIELDS);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save these settings. Try again."));
      }
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Teaching days"
        description="The days lessons happen. Timetables show these days, and the calendar counts them as teaching days. Staff leave counts its own working days, set in Staff rules."
      >
        <div className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Teaching days">
            {WEEKDAYS.map((day) => {
              const on = days.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  disabled={!canSave}
                  aria-pressed={on}
                  aria-label={day.label}
                  onClick={() => setDays(toggle(days, day.value, !on))}
                  className={cn(
                    "min-w-12 rounded-lg border px-3 py-1.5 font-mont text-xs transition-colors disabled:cursor-not-allowed",
                    on ? "border-primary bg-primary/5 font-semibold text-primary" : "border-white-02 bg-white text-gray-05 hover:border-gray-02",
                  )}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          <ErrorLine text={daysProblem || errors.teaching_days} />
        </div>
      </SettingsPanel>

      <SettingsPanel title="Week starts on" description="The first column of every calendar and date picker.">
        <div className="grid grid-cols-2 gap-2.5 px-4 py-4 sm:max-w-sm sm:px-5">
          {[
            { value: 1, label: "Monday" },
            { value: 7, label: "Sunday" },
          ].map((option) => {
            const active = option.value === weekStart;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!canSave}
                aria-pressed={active}
                onClick={() => setWeekStart(option.value)}
                className={cn(
                  "rounded-xl border px-3.5 py-2.5 text-left font-mont text-xs font-semibold transition-colors disabled:cursor-not-allowed",
                  active ? "border-primary bg-primary/5 text-primary" : "border-white-02 bg-white text-gray-01 hover:border-gray-02",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <ErrorLine text={errors.week_starts_on} padded />
      </SettingsPanel>

      <SettingsPanel
        title="Events that close the school"
        description="When one of these is added to the calendar, it is marked as closing the school, and it can still be changed on the event. Events already on the calendar keep theirs."
      >
        <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {rules.event_types.map((type) => (
            <label key={type.value} className="flex min-w-0 items-center gap-2.5 font-mont text-sm text-gray-01">
              <Checkbox
                checked={Boolean(closes[type.value])}
                disabled={!canSave}
                onCheckedChange={(on) => setCloses({ ...closes, [type.value]: on === true })}
              />
              <span className="min-w-0">{type.label}</span>
            </label>
          ))}
        </div>
        <ErrorLine text={errors.closes_school_by_type} padded />
      </SettingsPanel>

      <SettingsPanel title="Timetables">
        <label className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
          <span className="min-w-0">
            <span className="block font-mont text-sm font-medium text-gray-01">A lesson needs a room before publishing</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              Off suits a school whose classes stay in their own rooms: a timetable publishes once every
              lesson has a teacher.
            </span>
          </span>
          <Switch
            checked={roomRequired}
            disabled={!canSave}
            onCheckedChange={setRoomRequired}
            aria-label="A lesson needs a room before publishing"
          />
        </label>
        <ErrorLine text={errors.room_required_to_publish} padded />

        <div className="px-4 py-4 sm:px-5">
          <p className="font-mont text-sm font-medium text-gray-01">The lesson&apos;s teacher and Teaching duties</p>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 lg:grid-cols-3">
            {rules.teacher_duty_match_options.map((option) => {
              const value = option.value as TeacherDutyMatch;
              const active = value === duty;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!canSave}
                  aria-pressed={active}
                  onClick={() => setDuty(value)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed",
                    active ? "border-primary bg-primary/5" : "border-white-02 bg-white hover:border-gray-02",
                  )}
                >
                  <span className="block font-mont text-xs font-semibold text-gray-01">{DUTY_LABEL[value] ?? option.label}</span>
                  <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">{DUTY_TEXT[value] ?? ""}</span>
                </button>
              );
            })}
          </div>
          <ErrorLine text={errors.teacher_duty_match} />
        </div>

        <div className="px-4 py-4 sm:px-5">
          <label className="block max-w-xs">
            <span className="font-mont text-sm font-medium text-gray-01">Length of a new period</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              In minutes. Adding a period fills in its end time from its start. Leave blank to type both.
            </span>
            <Input
              className="mt-2"
              type="number"
              inputMode="numeric"
              min={10}
              max={240}
              placeholder="No default"
              disabled={!canSave}
              aria-invalid={minutesProblem ? true : undefined}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <ErrorLine text={minutesProblem || errors.default_period_minutes} />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Who may invigilate exams"
        description="People holding any of these roles can be put in charge of an exam room."
      >
        <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {rules.invigilator_role_options.map((role) => (
            <label key={role.value} className="flex min-w-0 items-center gap-2.5 font-mont text-sm text-gray-01">
              <Checkbox
                checked={invigilators.includes(role.value)}
                disabled={!canSave}
                onCheckedChange={(on) => setInvigilators(toggle(invigilators, role.value, on === true))}
              />
              <span className="min-w-0">{role.label}</span>
            </label>
          ))}
        </div>
        <ErrorLine text={invigilatorProblem || errors.invigilator_roles} padded />
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || invalid || saving}>
            Save calendar settings
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}

function ErrorLine({ text, padded }: { text?: string; padded?: boolean }) {
  if (!text) return null;
  return (
    <p role="alert" className={cn("mt-1.5 font-mont text-[11px] text-destructive", padded && "px-4 pb-3 sm:px-5")}>
      {text}
    </p>
  );
}
