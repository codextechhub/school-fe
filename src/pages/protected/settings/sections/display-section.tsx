import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { bindFormatters, zoneLongName, type ClockStyle, type DateFormat } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useGetDisplaySettingsQuery,
  useResetBranchTimezoneMutation,
  useUpdateDisplaySettingsMutation,
} from "@/redux/services/school/school-settings-api";
import type {
  BranchDisplayZone,
  DisplayOption,
  DisplaySettingsData,
} from "@/redux/services/school/school-settings-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { useSettingsBranches } from "../use-settings-branches";
import { useSettingsWrite } from "../use-settings-write";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

/** An afternoon time, so the 12-hour card shows "pm" beside the 24-hour one. */
const SAMPLE_TIME = "14:05";

/**
 * How the school shows dates and times.
 *
 * The date style and the clock are the school's, and every screen follows
 * them. The time zone is the school's too, and a branch that keeps different
 * hours (a Nairobi branch of a Lagos school) may keep its own: "today", "now"
 * and every time shown for that branch's records are then its own.
 *
 * Invoices, receipts, emails and exports are not yet printed this way.
 */
export function DisplaySection() {
  const query = useGetDisplaySettingsQuery();
  const data = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading display settings…" />;
  if (query.isError || !data) {
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
        title="Display"
        description="How dates and times read across XVS, and the time zone your school and each branch keep."
      />
      <SchoolDisplayForm key={JSON.stringify([data.date_format, data.clock, data.timezone])} data={data} />
      <BranchZones data={data} />
    </div>
  );
}

function SchoolDisplayForm({ data }: { data: DisplaySettingsData }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateDisplaySettingsMutation();
  const [dateFormat, setDateFormat] = useState<DateFormat>(data.date_format);
  const [clock, setClock] = useState<ClockStyle>(data.clock);
  const [zone, setZone] = useState(data.timezone);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const preview = useMemo(
    () => bindFormatters({ timeZone: zone, dateFormat, clock }),
    [zone, dateFormat, clock],
  );
  const changed =
    dateFormat !== data.date_format || clock !== data.clock || zone !== data.timezone;

  const onSave = async () => {
    if (!changed) return;
    setErrors({});
    try {
      await save({
        ...(dateFormat !== data.date_format ? { date_format: dateFormat } : {}),
        ...(clock !== data.clock ? { clock } : {}),
        ...(zone !== data.timezone ? { timezone: zone } : {}),
      }).unwrap();
      toast.success("Display settings saved.");
    } catch (error) {
      const byField = fieldErrorsFor(error, ["date_format", "clock", "timezone"]);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save these settings. Try again."));
      }
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel title="Dates" description="Every date on screen reads this way.">
        <Choices
          options={data.date_format_options}
          value={dateFormat}
          disabled={!canSave}
          onChange={(value) => setDateFormat(value as DateFormat)}
          sample={(value) =>
            bindFormatters({ timeZone: zone, dateFormat: value as DateFormat, clock }).formatDay(preview.today())
          }
          showLabel={false}
        />
        <ErrorLine text={errors.date_format} />
      </SettingsPanel>

      <SettingsPanel title="Times" description="Lessons, events and every time on screen.">
        <Choices
          options={data.clock_options}
          value={clock}
          disabled={!canSave}
          onChange={(value) => setClock(value as ClockStyle)}
          sample={(value) =>
            bindFormatters({ timeZone: zone, dateFormat, clock: value as ClockStyle }).formatTime(SAMPLE_TIME)
          }
        />
        <ErrorLine text={errors.clock} />
      </SettingsPanel>

      <SettingsPanel
        title="Your school's time zone"
        description={'When a school day starts and ends, what "today" is, and the time shown on everything that has no branch of its own.'}
      >
        <div className="space-y-2 px-4 py-4 sm:px-5">
          <div className="w-full sm:w-80">
            <NativeSelect
              aria-label="Your school's time zone"
              value={zone}
              disabled={!canSave}
              onChange={(event) => setZone(event.target.value)}
            >
              {data.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </NativeSelect>
          </div>
          <p className="font-mont text-xs text-gray-05">
            It is {preview.formatTime(clockOf(preview.now()))} on {preview.formatDay(preview.today())} in{" "}
            {zoneLongName(zone)}.
          </p>
          <ErrorLine text={errors.timezone} inline />
        </div>
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || saving}>
            Save display settings
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}

/** "14:05" from the zone's present moment, for the preview line. */
function clockOf(now: { hour: number; minute: number }): string {
  return `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`;
}

/**
 * Each branch's time zone: the school's unless the branch keeps its own.
 *
 * Offered only at a school with more than one branch, and only for the
 * branches the reader reaches. A branch administrator may set their own
 * branch's zone; the school's zone above stays the school-wide
 * administrator's.
 */
function BranchZones({ data }: { data: DisplaySettingsData }) {
  const branches = useSettingsBranches();
  if (!branches.applies || data.branches.length === 0) return null;
  return (
    <SettingsPanel
      title="Branches in another time zone"
      description="A branch that keeps different hours can keep its own zone. Its school day, its today and every time on its records then follow it."
    >
      <ul className="divide-y divide-white-02">
        {data.branches.map((branch) => (
          // Keyed by the zones too, so a row starts again from the saved
          // values after either changes, rather than offering a stale one.
          <BranchZoneRow
            key={`${branch.id}:${branch.timezone}:${data.timezone}`}
            branch={branch}
            options={data.options}
            schoolZone={data.timezone}
          />
        ))}
      </ul>
    </SettingsPanel>
  );
}

function BranchZoneRow({
  branch,
  options,
  schoolZone,
}: {
  branch: BranchDisplayZone;
  options: DisplayOption[];
  schoolZone: string;
}) {
  const { canSave } = useSettingsWrite(P.UPDATE_SETTINGS, branch.id);
  const [save, { isLoading: saving }] = useUpdateDisplaySettingsMutation();
  const [reset, { isLoading: resetting }] = useResetBranchTimezoneMutation();
  const [zone, setZone] = useState(branch.timezone);
  const own = branch.source === "branch";
  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? value;

  const onSave = async () => {
    try {
      await save({ timezone: zone, branch: branch.id }).unwrap();
      toast.success(`${branch.name} now keeps its own time zone.`);
    } catch (error) {
      toast.error(writeErrorMessage(error, "That time zone could not be saved."));
    }
  };
  const onReset = async () => {
    try {
      await reset({ branch: branch.id }).unwrap();
      setZone(schoolZone);
      toast.success(`${branch.name} now follows the school's time zone.`);
    } catch (error) {
      toast.error(writeErrorMessage(error, "That could not be changed."));
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
      <span className="min-w-0 flex-1 basis-40">
        <span className="block font-mont text-sm font-medium text-gray-01">{branch.name}</span>
        <span className="block font-mont text-xs text-gray-05">
          {own ? `Its own zone: ${labelOf(branch.timezone)}` : `Follows the school: ${labelOf(schoolZone)}`}
        </span>
      </span>
      {canSave ? (
        <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className="w-full sm:w-64">
            <NativeSelect
              aria-label={`${branch.name} time zone`}
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </NativeSelect>
          </span>
          <Button variant="outline" size="sm" disabled={saving || zone === branch.timezone} onClick={onSave}>
            Save
          </Button>
          {own ? (
            <Button variant="ghost" size="sm" disabled={resetting} onClick={onReset}>
              Use the school&apos;s
            </Button>
          ) : null}
        </span>
      ) : null}
    </li>
  );
}

function Choices({
  options,
  value,
  disabled,
  onChange,
  sample,
  showLabel = true,
}: {
  options: DisplayOption[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  sample: (value: string) => string;
  /** The option's own label under the sample; off where the sample says it all. */
  showLabel?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-3 sm:px-5">
      {options.map((option) => {
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
            <span className="block font-mont text-sm font-semibold text-gray-01">{sample(option.value)}</span>
            {showLabel ? (
              <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">{option.label}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ErrorLine({ text, inline }: { text?: string; inline?: boolean }) {
  if (!text) return null;
  return (
    <p role="alert" className={cn("font-mont text-[11px] text-destructive", !inline && "px-4 pb-3 sm:px-5")}>
      {text}
    </p>
  );
}
