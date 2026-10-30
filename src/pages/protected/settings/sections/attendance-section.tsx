import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  useAddReasonCodeMutation,
  useGetAttendanceSettingsQuery,
  useGetReasonCodesQuery,
  useSetReasonCodeRetiredMutation,
  useUpdateAttendanceSettingsMutation,
} from "@/redux/services/attendance/attendance-api";
import type {
  AttendanceSettings,
  ReasonCode,
  SettingsLevel,
} from "@/redux/services/attendance/attendance-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { useSettingsWrite } from "../use-settings-write";
import { useSettingFields } from "../use-setting-fields";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

const FIELDS = [
  "guardian_notices",
  "chronic_threshold",
  "lesson_marking_levels",
  "edit_window_days",
] as const;

/**
 * The school's attendance rules: which levels mark every lesson, whether a
 * guardian is emailed when a child is absent, the rate below which a child is
 * on the chronic-absence list, how long a submitted register stays open to
 * changes, and the school's own reasons for excusing an absence.
 *
 * All of it binds every branch, so only a reader who covers the whole school
 * changes it; the server refuses anyone else. A change applies from now on:
 * marks already taken, and notices already sent, are not touched.
 */
export function AttendanceSection() {
  const query = useGetAttendanceSettingsQuery();
  const settings = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading attendance settings…" />;
  if (query.isError || !settings) {
    return (
      <SectionLoadError
        forbidden={parseApiError(query.error).status === 403}
        retry={query.refetch}
      />
    );
  }

  const scope = [
    settings.scope_label.school_name,
    "applies to every branch",
    [settings.scope_label.session_name, settings.scope_label.term_name].filter(Boolean).join(", "),
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <SettingsSectionHeader title="Attendance" description={scope} />
      <AttendanceForm key={JSON.stringify(settings)} settings={settings} />
      <ReasonCodes />
    </div>
  );
}

function AttendanceForm({ settings }: { settings: AttendanceSettings }) {
  const { canSave, reason } = useSettingsWrite(P.MANAGE_ATTENDANCE_SETTINGS);
  const { shown, editable } = useSettingFields({}, canSave);
  const [save, { isLoading: saving }] = useUpdateAttendanceSettingsMutation();
  const [levels, setLevels] = useState<string[]>(settings.lesson_marking_levels);
  const [notices, setNotices] = useState(settings.guardian_notices);
  const [threshold, setThreshold] = useState(String(settings.chronic_threshold));
  const [editWindow, setEditWindow] = useState(String(settings.edit_window_days));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const thresholdValue = Number(threshold);
  const thresholdProblem =
    !Number.isInteger(thresholdValue) || thresholdValue < 50 || thresholdValue > 100
      ? "Use a whole number from 50 to 100."
      : "";
  const windowValue = Number(editWindow);
  const windowProblem =
    !Number.isInteger(windowValue) || windowValue < 0 || windowValue > 14
      ? "Use a whole number of days from 0 to 14."
      : "";

  const sorted = (list: string[]) => [...list].sort().join();
  const changed =
    (editable("lesson_marking_levels") && sorted(levels) !== sorted(settings.lesson_marking_levels)) ||
    (editable("guardian_notices") && notices !== settings.guardian_notices) ||
    (editable("chronic_threshold") && thresholdValue !== settings.chronic_threshold) ||
    (editable("edit_window_days") && windowValue !== settings.edit_window_days);
  const invalid = Boolean((editable("chronic_threshold") && thresholdProblem) ||
    (editable("edit_window_days") && windowProblem));

  const onSave = async () => {
    if (!changed || invalid) return;
    setErrors({});
    try {
      await save({
        ...(editable("lesson_marking_levels") && sorted(levels) !== sorted(settings.lesson_marking_levels) ? { lesson_marking_levels: levels } : {}),
        ...(editable("guardian_notices") && notices !== settings.guardian_notices ? { guardian_notices: notices } : {}),
        ...(editable("chronic_threshold") && thresholdValue !== settings.chronic_threshold ? { chronic_threshold: thresholdValue } : {}),
        ...(editable("edit_window_days") && windowValue !== settings.edit_window_days ? { edit_window_days: windowValue } : {}),
      }).unwrap();
      toast.success("Attendance settings saved.");
    } catch (error) {
      const byField = fieldErrorsFor(error, FIELDS);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save these settings. Try again."));
      }
    }
  };

  const programmes = groupByProgramme(settings.levels);

  return (
    <div className="space-y-5">
      {shown("lesson_marking_levels") && <SettingsPanel
        title="Lesson marking"
        description="A switch per level. On, each class in the level also has a register for every lesson on its published timetable. Off, a class has one register a day and nothing else."
      >
        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:px-5 lg:grid-cols-2">
          {programmes.map(([programme, rows]) => (
            <div key={programme} className="min-w-0 space-y-2">
              <p className="font-mont text-xs font-semibold uppercase tracking-wide text-gray-05">{programme}</p>
              {rows.map((level) => {
                const on = levels.includes(level.code);
                return (
                  <label key={level.code} className="block rounded-lg border border-white-02 px-3 py-2.5">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mont text-sm text-gray-01">{level.name}</span>
                      <Switch
                        checked={on}
                        disabled={!editable("lesson_marking_levels")}
                        aria-label={`Lesson marking for ${level.name}`}
                        onCheckedChange={(next) =>
                          setLevels(next ? [...levels, level.code] : levels.filter((code) => code !== level.code))
                        }
                      />
                    </span>
                    {on && (
                      <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">
                        {level.has_published_timetable
                          ? "On. Each class with a published timetable has a register for every lesson."
                          : "On, but no class in this level has a published timetable yet, so there is nothing to mark."}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        <ErrorLine text={errors.lesson_marking_levels} padded />
      </SettingsPanel>}

      {shown("guardian_notices") && <SettingsPanel title="Guardian notices">
        <label className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
          <span className="min-w-0">
            <span className="block font-mont text-sm font-medium text-gray-01">Email the guardian when a child is absent</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              The primary guardian only, one email per child per day, at the moment the register is
              submitted. Late and Excused send nothing.
            </span>
          </span>
          <Switch
            checked={notices}
            disabled={!editable("guardian_notices")}
            onCheckedChange={setNotices}
            aria-label="Email the guardian when a child is absent"
          />
        </label>
        <ErrorLine text={errors.guardian_notices} padded />
      </SettingsPanel>}

      {(shown("chronic_threshold") || shown("edit_window_days")) && <SettingsPanel title="Rules">
        <div className="grid grid-cols-1 gap-5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {shown("chronic_threshold") && <label className="block min-w-0">
            <span className="font-mont text-sm font-medium text-gray-01">Chronic-absence threshold</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              In percent. A student whose rate for the term is below it is on the chronic-absence
              list in Attendance reports. This is your school&apos;s number.
            </span>
            <Input
              className="mt-2 max-w-32"
              type="number"
              inputMode="numeric"
              min={50}
              max={100}
              disabled={!editable("chronic_threshold")}
              aria-invalid={thresholdProblem ? true : undefined}
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
            />
            <ErrorLine text={thresholdProblem || errors.chronic_threshold} />
          </label>}
          {shown("edit_window_days") && <label className="block min-w-0">
            <span className="font-mont text-sm font-medium text-gray-01">Days a register stays open to changes</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              After a register is submitted, the person who took it can change a row for this many
              days after its date. 0 is the same day only. After that a change is a correction
              request.
            </span>
            <Input
              className="mt-2 max-w-32"
              type="number"
              inputMode="numeric"
              min={0}
              max={14}
              disabled={!editable("edit_window_days")}
              aria-invalid={windowProblem ? true : undefined}
              value={editWindow}
              onChange={(event) => setEditWindow(event.target.value)}
            />
            <ErrorLine text={windowProblem || errors.edit_window_days} />
          </label>}
        </div>
      </SettingsPanel>}

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || invalid || saving}>
            Save attendance settings
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}

/** The levels in the order the server sends them, under their programme. */
function groupByProgramme(levels: SettingsLevel[]): [string, SettingsLevel[]][] {
  const groups = new Map<string, SettingsLevel[]>();
  for (const level of levels) {
    if (!groups.has(level.program_name)) groups.set(level.program_name, []);
    groups.get(level.program_name)!.push(level);
  }
  return [...groups.entries()];
}

/**
 * The school's reasons for excusing an absence.
 *
 * Retiring and restoring take effect at once rather than waiting for Save: a
 * reason is a row of its own, not a field of the form above. A retired reason
 * stays on the marks that used it and is offered on no new mark.
 */
function ReasonCodes() {
  const { canSave } = useSettingsWrite(P.MANAGE_ATTENDANCE_SETTINGS);
  const { shown, editable } = useSettingFields({ name: "reason_code_name" }, canSave);
  const { data, isLoading } = useGetReasonCodesQuery();
  const [setRetired, retiring] = useSetReasonCodeRetiredMutation();
  const [adding, setAdding] = useState(false);
  const codes = data?.data ?? [];

  const toggle = async (code: ReasonCode) => {
    const result = await setRetired({ id: code.id, retired: !code.retired });
    if ("error" in result) return;
    toast.success(code.retired ? `${code.name ?? "Reason"} restored` : `${code.name ?? "Reason"} retired`, {
      description: code.retired
        ? "It can be chosen again."
        : "It stays on the marks that used it and is offered on no new one.",
    });
  };

  if (!["name", "retired", "requires_note", "used_this_term"].some(shown)) return null;
  return (
    <SettingsPanel
      title="Reasons for excused absences"
      description="Your school's own list, offered when a child is marked Excused. A retired reason stays on the marks that used it."
    >
      <ul className="divide-y divide-white-02">
        {isLoading && <li className="px-4 py-4 font-mont text-xs text-gray-05 sm:px-5">Loading reasons…</li>}
        {codes.map((code) => (
          <li key={code.id} className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <span className="min-w-0 flex-1">
              {shown("name") && <span className="block font-mont text-sm font-medium text-gray-01">{code.name}</span>}
              <span className="block font-mont text-xs text-gray-05">
                {[
                  shown("retired") && code.retired
                    ? "Kept on the marks that used it, offered on no new mark"
                    : shown("used_this_term") && code.used_this_term !== undefined
                      ? `${code.used_this_term} mark${code.used_this_term === 1 ? "" : "s"} this term`
                      : null,
                  shown("requires_note") && code.requires_note ? "Needs a note" : null,
                ].filter(Boolean).join(" · ")}
              </span>
            </span>
            {shown("retired") && <Badge variant={code.retired ? "inactive" : "active"} className="rounded-full">
              {code.retired ? "Retired" : "In use"}
            </Badge>}
            {editable("retired") && (
              <Button
                variant="outline"
                size="sm"
                disabled={retiring.isLoading && retiring.originalArgs?.id === code.id}
                onClick={() => void toggle(code)}
              >
                {code.retired ? "Restore" : "Retire"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {editable("name") && (
        <div className="px-4 py-3 sm:px-5">
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            Add a reason
          </Button>
        </div>
      )}
      {adding && <AddReasonDrawer onClose={() => setAdding(false)} canEditNote={editable("requires_note")} />}
    </SettingsPanel>
  );
}

/** A new reason: its name, and whether choosing it asks for a note. */
function AddReasonDrawer({ onClose, canEditNote }: { onClose: () => void; canEditNote: boolean }) {
  const [name, setName] = useState("");
  const [needsNote, setNeedsNote] = useState(false);
  const [add, { isLoading }] = useAddReasonCodeMutation();
  const trimmed = name.trim();

  const submit = async () => {
    const result = await add({ name: trimmed, ...(canEditNote ? { requires_note: needsNote } : {}) });
    if ("error" in result) return;
    toast.success(`${trimmed} added`, { description: "It is offered the next time a child is marked Excused." });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Add a reason"
      subtitle="Offered when a child is marked Excused"
      saveLabel="Add reason"
      onSave={() => void submit()}
      canSave={trimmed.length > 0 && trimmed.length <= 60}
      saving={isLoading}
    >
      <Field label="Name" required hint="At most 60 characters. For example, Exam leave.">
        <Input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
      </Field>
      {canEditNote && <label className="flex items-start gap-2.5 font-mont text-sm text-gray-01">
        <Checkbox checked={needsNote} onCheckedChange={(on) => setNeedsNote(on === true)} />
        <span className="min-w-0">
          Needs a note
          <span className="block text-xs text-gray-05">
            Choosing it asks for a sentence saying what happened, as Other does.
          </span>
        </span>
      </label>}
    </DrawerShell>
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
