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
  useCopyBellScheduleMutation,
  useCreatePeriodMutation,
  useDeletePeriodMutation,
  useGetPeriodsQuery,
  useUpdatePeriodMutation,
} from "@/redux/services/calendar/calendar-api";
import { useSessionLens } from "@/hooks/use-session-lens";
import { useCalendarRules } from "@/hooks/use-school-week";
import { weekdayChoices } from "@/lib/week";
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
  CopyResultNote,
  CopyScheduleOffer,
  PeriodDirectory,
  SchoolDayPanel,
  type BellDay,
} from "./bell-schedule-view";
import {
  copyOfferFor,
  copyScopeFor,
  type CopyScope,
  type CopySource,
  periodsInScope,
  usePreviousSchedule,
  viewCoversScope,
} from "./bell-copy";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { formatClock } from "./bell-schedule-time";

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
 *
 * **The weekdays are the school's teaching days**, from its calendar rules,
 * plus any day that still owns periods. A year with no periods in the
 * reader's reach is offered a copy of the most recent earlier year that has
 * some, worded for what the copy will touch (see bell-copy.ts).
 */
export default function BellSchedule() {
  const { lens, branch, readOnlyYear, multiBranch, sessionName, currentSession } =
    useAcademicsLens();
  const { sessions } = useSessionLens();
  const { applies, wholeSchool, pinnedBranch, allLabel } = useBranchLens();
  const { hasPermission } = usePermissions();
  const { teachingDays, weekStartsOn, defaultPeriodMinutes } = useCalendarRules();

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
  const [copySchedule, { isLoading: copying }] = useCopyBellScheduleMutation();
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [copyRefusal, setCopyRefusal] = useState("");
  const [copied, setCopied] = useState<{
    message: string;
    skipped: { name: string; day: string }[];
  } | null>(null);

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

  // The teaching days, plus any day still carrying periods of its own.
  const weekdays = useMemo(
    () => weekdayChoices(teachingDays, weekStartsOn, [...ownDays]),
    [teachingDays, weekStartsOn, ownDays],
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

  const empty = !isLoading && everyPeriod.length === 0;
  const copyScope = copyScopeFor({ applies, wholeSchool });
  const coversScope = viewCoversScope({
    scope: copyScope,
    branch,
    pinned: pinnedBranch != null,
  });
  const targetInScope = periodsInScope(everyPeriod, copyScope).length;
  const previous = usePreviousSchedule({
    sessions,
    current: currentSession,
    scope: copyScope,
    enabled: canCreate && (coversScope ? targetInScope === 0 : empty),
  });
  const copyOffer = copyOfferFor({
    canCreate,
    loading: isLoading || !allData,
    coversScope,
    targetInScope,
    viewEmpty: empty,
    source: previous,
  });
  const copySource = copyOffer?.kind === "offer" ? copyOffer.source : null;

  const runCopy = async () => {
    if (!copySource || !currentSession) return;
    setCopyRefusal("");
    try {
      const result = await copySchedule({
        from_session: copySource.session.id,
        session: currentSession.id,
      }).unwrap();
      const message =
        result.message || `Copied ${copySource.session.name}'s bell schedule.`;
      const skipped = (result.data?.skipped ?? []).map((s) => ({ name: s.name, day: s.day_label }));
      toast.success(message);
      setCopied({ message, skipped });
    } catch (error) {
      setCopyRefusal(
        parseApiError(error).message || "That bell schedule could not be copied.",
      );
    }
    setCopyConfirm(false);
  };

  const copyPanel = (
    <CopyScheduleOffer
      offer={copyOffer}
      scope={copyScope}
      targetName={sessionName}
      allLabel={allLabel}
      copying={copying}
      refusal={copyRefusal}
      onCopy={() => setCopyConfirm(true)}
    />
  );

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
        <>
        {copyPanel}
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
        </>
      ) : (
        <>
          {copied && (
            <CopyResultNote
              message={copied.message}
              skipped={copied.skipped}
              onDismiss={() => setCopied(null)}
            />
          )}
          {copyPanel}
          <SchoolDayPanel
            day={day}
            periods={stripPeriods}
            ownDays={ownDays}
            weekdays={weekdays}
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
        teachingDays={teachingDays}
        weekStartsOn={weekStartsOn}
        defaultPeriodMinutes={defaultPeriodMinutes}
        onClose={() => setDrawerOpen(false)}
        onSave={save}
      />

      <PromptModal
        isOpen={copyConfirm && !!copySource}
        onClose={() => setCopyConfirm(false)}
        onConfirm={runCopy}
        loading={copying}
        canCancel
        title={`Copy ${copySource?.session.name}'s bell schedule?`}
        description={copyConfirmText(copyScope, copySource, sessionName)}
        onConfirmText="Copy"
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
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
  const when = `${formatClock(period.start_time)} to ${formatClock(period.end_time)}`;
  if (period.day_of_week) {
    return `${period.label} runs ${when} on ${period.day_label} only. If it is the last period that day owns, the day goes back to running the everyday schedule. Any lesson already scheduled in it will block the removal.`;
  }
  return `${period.label} runs ${when} every day, so it comes off every timetable grid built on it. Any lesson already scheduled in it will block the removal.`;
}

/**
 * The copy confirmation, naming what will be copied and where. A period set
 * for a day the school no longer teaches is left out, and the server says so
 * afterwards.
 */
function copyConfirmText(
  scope: CopyScope,
  source: CopySource | null,
  target: string | null,
): string {
  if (!source) return "";
  const count = source.periodCount;
  const periods = `${count} period${count === 1 ? "" : "s"}`;
  const where =
    scope === "school"
      ? `${periods}, from every branch,`
      : scope === "branches"
        ? `${periods} at your branch${count === 1 ? "" : "es"}`
        : periods;
  return `${source.session.name}'s ${where} are added to ${target ?? "this year"} with the same times, types and days. Any set for a day the school no longer teaches is left out. ${source.session.name} is not changed, and anything copied can be edited or removed here afterwards.`;
}
