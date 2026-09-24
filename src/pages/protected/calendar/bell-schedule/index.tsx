import { useMemo, useState } from "react";
import { Bell, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PermissionGate from "@/components/custom/permission-gate";
import PromptModal from "@/components/modal/prompt-modal";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { parseApiError } from "@/utils/api-error";
import {
  useCreatePeriodMutation,
  useDeletePeriodMutation,
  useGetPeriodsQuery,
  useUpdatePeriodMutation,
} from "@/redux/services/calendar/calendar-api";
import type {
  DayOfWeek,
  Period,
  PeriodWrite,
} from "@/redux/services/calendar/calendar-types";
import { PeriodDrawer } from "../components/period-drawer";
import { blankPeriod, periodDraftFrom } from "../components/period-draft";
import { PageShell } from "@/components/layout/page-shell";
import { useActionParam } from "@/hooks/use-action-param";
import {
  PeriodDirectory,
  SchoolDayPanel,
  type BellDay,
} from "./bell-schedule-view";

/**
 * The daily period structure every timetable grid is built on.
 *
 * **Two reads of one thing, and the day tabs are not a filter.** "The whole
 * schedule" lists every row on file. Picking a weekday asks a different
 * question - what actually runs that day - and the answer is not a subset: a
 * day with periods of its own runs ONLY those, and the everyday schedule does
 * not apply to it at all. The server computes that, and writes the sentence
 * explaining it, because a client deciding it would be a second implementation
 * of the rule.
 *
 * **The order column is not editable anywhere.** It is assigned from the times,
 * so the school day cannot be put in an order that disagrees with the clock.
 */
export default function BellSchedule() {
  const { lens, branch, readOnlyYear, multiBranch, sessionName } =
    useAcademicsLens();
  const { hasPermission } = usePermissions();

  const [day, setDay] = useState<BellDay>("all");
  const [editing, setEditing] = useState<Period | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState<Period | null>(null);

  const { data, isLoading, isError, refetch } = useGetPeriodsQuery({
    ...lens,
    day,
  });
  // The whole schedule, always, whichever tab is showing. The drawer needs it
  // to answer "does this day already have its own schedule", and the tabs need
  // it to mark the days that do.
  const { data: allData } = useGetPeriodsQuery({ ...lens, day: "all" });

  const [create, { isLoading: creating }] = useCreatePeriodMutation();
  const [update, { isLoading: updating }] = useUpdatePeriodMutation();
  const [remove, { isLoading: removing }] = useDeletePeriodMutation();

  const schedule = data?.data;
  const periods = useMemo(() => schedule?.periods ?? [], [schedule]);
  const everyPeriod = useMemo(() => allData?.data?.periods ?? [], [allData]);

  /**
   * The periods that form the visual school day.
   *
   * The directory answers "what rows exist" while this preview answers "what
   * does a day look like". The All view therefore previews only the everyday
   * schedule, because joining it to Friday's override would create a school day
   * that never runs.
   */
  const stripPeriods = useMemo(
    () => (day === "all" ? periods.filter((p) => !p.day_of_week) : periods),
    [day, periods],
  );
  const stripLabel =
    day === "all"
      ? "The everyday schedule used unless a weekday has its own periods."
      : `${schedule?.day_label ?? "This day"}'s schedule as it actually runs.`;

  /** Which weekdays carry rows of their own, so run their own schedule. */
  const ownDays = useMemo(
    () =>
      new Set(
        everyPeriod
          .map((period) => period.day_of_week)
          .filter((value): value is DayOfWeek => value !== null),
      ),
    [everyPeriod],
  );

  const canCreate = hasPermission(P.CREATE_TIMETABLE_ENTRY) && !readOnlyYear;
  const canEdit = hasPermission(P.MODIFY_TIMETABLE_ENTRY) && !readOnlyYear;
  const canDelete = hasPermission(P.DELETE_TIMETABLE) && !readOnlyYear;

  const open = (period: Period | null) => {
    setEditing(period);
    setDrawerOpen(true);
  };

  // The command-palette action follows the Add button's permission gate.
  useActionParam("new", canCreate, () => open(null));

  const save = async (body: PeriodWrite) => {
    const result = editing
      ? await update({ id: editing.id, ...body }).unwrap()
      : await create(body).unwrap();
    toast.success(result.message);
  };

  const runDelete = async () => {
    if (!confirm) return;
    try {
      const result = await remove(confirm.id).unwrap();
      toast.success(result.message || `${confirm.label} removed.`);
    } catch (error) {
      toast.error(
        parseApiError(error).message || "That period could not be removed.",
      );
    }
    setConfirm(null);
  };

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Bell}
          title="We could not load your bell schedule"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  const empty = !isLoading && everyPeriod.length === 0;

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">
            Bell Schedule
          </h1>
          <p className="mt-1 min-w-0 text-sm text-gray-06 text-pretty">
            Set the daily periods every class and teacher timetable uses.
          </p>
        </div>
        <PermissionGate
          permission={P.CREATE_TIMETABLE_ENTRY}
          disabled={readOnlyYear}
        >
          <Button
            className="shrink-0 text-sm"
            onClick={() => open(null)}
            disabled={!canCreate}
          >
            <Plus /> Add period
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-52 w-full rounded-md" />
          <Skeleton className="h-72 w-full rounded-md" />
        </>
      ) : empty ? (
        <OutlinedNotice
          icon={Bell}
          title="No bell schedule yet"
          body={
            sessionName
              ? `${sessionName} has no periods on it. Class timetables are built on these, so they need a bell schedule before a single lesson can be placed.`
              : "Class timetables are built on these periods, so they need a bell schedule first."
          }
          actionLabel={canCreate ? "Add the first period" : undefined}
          onAction={() => open(null)}
        />
      ) : (
        <>
          <SchoolDayPanel
            day={day}
            periods={stripPeriods}
            ownDays={ownDays}
            label={stripLabel}
            note={schedule?.note}
            canEdit={canEdit}
            onDayChange={setDay}
            onEdit={open}
          />

          <PeriodDirectory
            periods={periods}
            note={directoryNote(day, schedule?.day_label, schedule?.note)}
            multiBranch={multiBranch}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={open}
            onDelete={setConfirm}
          />
        </>
      )}

      <PeriodDrawer
        open={drawerOpen}
        editing={!!editing}
        saving={creating || updating}
        initial={editing ? periodDraftFrom(editing) : blankPeriod(branch)}
        dayHasOwnSchedule={(d) => ownDays.has(d)}
        onClose={() => setDrawerOpen(false)}
        onSave={save}
      />

      <PromptModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runDelete}
        loading={removing}
        canCancel
        title={`Remove ${confirm?.label}?`}
        description={deleteBody(confirm)}
        onConfirmText="Remove"
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
      />
    </PageShell>
  );
}

/** "08:00:00" as "08:00". The seconds are never anything but zero here. */
function clock(value: string): string {
  return (value ?? "").slice(0, 5);
}

function directoryNote(day: BellDay, dayLabel?: string, serverNote?: string) {
  if (day === "all") {
    return "Every period defined, including weekdays that run their own schedule.";
  }
  return serverNote ?? `${dayLabel ?? "This day"} follows the everyday schedule.`;
}

/**
 * What removing a period does.
 *
 * A lesson period holding slots is PROTECTed by the server, so this warns
 * rather than promises. The day-replacing case gets its own sentence, because
 * removing the LAST row a day owns hands that day back to the everyday
 * schedule - a change to a day nobody was editing.
 */
function deleteBody(period: Period | null): string {
  if (!period) return "";
  const when = `${clock(period.start_time)} to ${clock(period.end_time)}`;
  if (period.day_of_week) {
    return `${period.label} runs ${when} on ${period.day_label} only. If it is the last period that day owns, the day goes back to running the everyday schedule. Any lesson already scheduled in it will block the removal.`;
  }
  return `${period.label} runs ${when} every day, so it comes off every timetable grid built on it. Any lesson already scheduled in it will block the removal.`;
}
