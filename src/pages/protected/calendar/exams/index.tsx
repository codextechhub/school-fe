import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Printer,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { Panel } from "@/components/custom/surface";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { parseApiError } from "@/utils/api-error";
import {
  useCreateExamSlotMutation,
  usePreviewExamSlotMutation,
  useDeleteExamSlotMutation,
  useGetExamsQuery,
  useGetRoomsQuery,
  useGetTeachersQuery,
  usePublishExamMutation,
  useUpdateExamSlotMutation,
} from "@/redux/services/calendar/calendar-api";
import {
  useGetClassesQuery,
  useGetSubjectsQuery,
} from "@/redux/services/academics/academics-api";
import type {
  ExamSlot,
  ExamSlotWrite,
} from "@/redux/services/calendar/calendar-types";
import { formatDate, formatRange } from "../components/dates";
import { PaperDrawer } from "../components/paper-drawer";
import {
  blankPaper,
  paperValuesFrom,
  type PaperValues,
} from "../components/paper-values";
import { ExportButton } from "@/components/custom/export-button";
import { RowActions } from "../components/row-actions";
import { RowPicker } from "../components/row-picker";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { cn } from "@/lib/utils";
import { PaperBoard } from "./paper-board";
import { PaperFilterBar } from "./paper-filter-bar";
import {
  clashingIds,
  filterOptions,
  filterPapers,
  NO_FILTERS,
  type PaperFilters,
} from "./paper-filters";
import { PageShell } from "@/components/layout/page-shell";
import { canManageRow } from "@/lib/can-manage";

/**
 * Papers placed inside a dated exam period on the calendar.
 *
 * **The schedule hangs off the calendar rather than floating beside it.** The
 * school says in its calendar that it is examining in the first week of
 * December, and the papers hang off that statement: the dates, the session and
 * the branch scope are read from the event and none is copied. So with no exam
 * period there is nothing to schedule into, and this screen sends the reader to
 * the calendar rather than showing an empty table.
 *
 * **The refusal and the warnings are the opposite way round from a class
 * timetable**, and that is deliberate on the server's part. A class sitting two
 * papers at once is impossible and is refused; a room used twice and an
 * invigilator in two rooms are both things a school legitimately does, so they
 * warn and save. The drawer says so, because meeting one rule and not the other
 * without explanation reads as arbitrary.
 */
export default function ExamScheduling() {
  const { lens, readOnlyYear } = useAcademicsLens();
  const { hasPermission } = usePermissions();

  const [examId, setExamId] = useState<number | null>(null);
  const [paper, setPaper] = useState<{
    values: PaperValues;
    slot: ExamSlot | null;
  } | null>(null);

  const { data, isLoading, isError, refetch } = useGetExamsQuery({
    session: lens.session,
    branch: lens.branch,
  });
  const exams = useMemo(() => data?.data ?? [], [data]);

  const current = examId ?? exams[0]?.id ?? null;
  const exam = exams.find((e) => e.id === current) ?? null;

  const { data: classData } = useGetClassesQuery(lens);
  // A paper belongs to its class, so only classes the viewer may change are offered.
  const paperClasses = useMemo(
    () => (classData?.data ?? []).filter((klass) => canManageRow(klass)),
    [classData],
  );
  const { data: subjectData } = useGetSubjectsQuery(lens);
  const { data: roomData } = useGetRoomsQuery({
    branch: lens.branch,
    active: "true",
  });
  // Invigilators are NOT narrowed by the lens, unlike the teacher screen's own
  // list. This is the picker for putting somebody in a room, and a school
  // borrowing an invigilator from its other branch for a morning is ordinary.
  const { data: teacherData } = useGetTeachersQuery({ session: lens.session });

  const [create, { isLoading: creating }] = useCreateExamSlotMutation();
  const [previewExamSlot] = usePreviewExamSlotMutation();
  const [filters, setFilters] = useState<PaperFilters>(NO_FILTERS);
  // The board answers "when is what"; the list answers "show me every field of
  // every row", which is what somebody checking an invigilator column against
  // a staff rota wants. The list is also what prints.
  const [view, setView] = useState<"board" | "list">("list");

  // Plain calls, not `useMemo`. All three are pure passes over one exam's
  // papers - a hundred rows at the outside - and the React Compiler memoises
  // them on its own. Wrapping them by hand made it refuse to optimise the
  // component at all, which is the opposite of what the wrapping was for.
  //
  // Warnings name the papers they are about, so the board can mark exactly
  // which cards are in a clash rather than colouring a whole day.
  const slots = exam?.slots ?? [];
  const clashing = clashingIds(exam?.warnings);
  const options = filterOptions(slots);
  const shown = filterPapers(slots, filters, clashing);

  const [update, { isLoading: updating }] = useUpdateExamSlotMutation();
  const [remove, { isLoading: removing }] = useDeleteExamSlotMutation();
  const [publish, { isLoading: publishing }] = usePublishExamMutation();

  const canCreate = hasPermission(P.CREATE_EXAM) && !readOnlyYear;
  const canEdit = hasPermission(P.MODIFY_EXAM) && !readOnlyYear;
  const canDelete = hasPermission(P.DELETE_EXAM) && !readOnlyYear;
  const canPublish = hasPermission(P.PUBLISH_EXAM_TIMETABLE) && !readOnlyYear;

  const published = exam?.status === "PUBLISHED";

  const savePaper = async (body: ExamSlotWrite) => {
    if (!exam) return;
    const result = paper?.slot
      ? await update({ examId: exam.id, id: paper.slot.id, ...body }).unwrap()
      : await create({ examId: exam.id, ...body }).unwrap();
    toast.success(result.message);
    // Saved AND flagged. Each sentence names the room or the person and the
    // sitting it collides with.
    for (const w of result.data?.warnings ?? []) toast.warning(w.detail);
  };

  // The same engine the save uses, asked before the save. An incomplete draft
  // never reaches here: the drawer only asks once the paper is placed.
  const previewPaper = async (values: PaperValues) => {
    if (!exam) return { refusal: null, warnings: [] };
    const result = await previewExamSlot({
      examId: exam.id,
      school_class: values.school_class!,
      subject: values.subject!,
      exam_date: values.exam_date,
      sitting: values.sitting,
      // Empty means "no answer", and must not become "00:00".
      start_time: values.start_time || null,
      end_time: values.end_time || null,
      room: values.room,
      invigilator: values.invigilator,
      // The paper being edited is not a clash with itself.
      ...(paper?.slot ? { exclude: paper.slot.id } : {}),
    }).unwrap();
    return {
      refusal: result.data?.refusal ?? null,
      warnings: result.data?.warnings ?? [],
    };
  };

  const removePaper = async () => {
    if (!exam || !paper?.slot) return;
    const result = await remove({ examId: exam.id, id: paper.slot.id }).unwrap();
    toast.success(result.message || "Paper removed.");
  };

  const runPublish = async () => {
    if (!exam) return;
    try {
      const result = await publish({ id: exam.id }).unwrap();
      toast.success(result.message);
    } catch (error) {
      toast.error(
        parseApiError(error).message || "That schedule could not be published.",
      );
    }
  };

  if (isError) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <OutlinedNotice
          icon={ClipboardList}
          title="We could not load your exam schedule"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-80 w-full rounded-md" />
      </PageShell>
    );
  }

  // The blocking state. Not "no papers" - there is nowhere to put one, because
  // a schedule hangs off a dated exam period and the calendar holds none.
  if (!exams.length || !exam) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <OutlinedNotice
          icon={CalendarPlus}
          title="No exam period yet"
          body="An exam timetable sits inside a dated exam period on the calendar, so that has to exist first. Add one as a calendar event with the type Exam period."
          actionLabel="Add an exam period"
          actionTo={routesPath.PROTECTED.ACADEMIC_CALENDAR.EVENTS}
        />
      </PageShell>
    );
  }

  const range = formatRange(exam.start_date, exam.end_date);

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="print-hide flex flex-wrap items-start justify-between gap-3">
        <PageHeading periodName={exam.name} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="text-sm"
            onClick={() => window.print()}
          >
            <Printer className="size-4" /> Print
          </Button>
          <ExportButton
            screen="calendar.exam_papers"
            params={{ branch: lens.branch === "all" ? undefined : lens.branch }}
          />
          <PermissionGate
            permission={P.CREATE_EXAM}
            disabled={readOnlyYear}
          >
            <Button
              variant="outline"
              className="text-sm"
              disabled={!canCreate || published}
              onClick={() =>
                setPaper({ values: blankPaper(exam.start_date), slot: null })
              }
            >
              <Plus className="size-4" /> Add paper
            </Button>
          </PermissionGate>
          <PermissionGate
            permission={P.PUBLISH_EXAM_TIMETABLE}
            disabled={readOnlyYear}
          >
            <Button
              className="text-sm"
              onClick={runPublish}
              disabled={!canPublish || !canManageRow(exam) || publishing || published}
            >
              <Send className="size-4" />
              {published ? "Published" : "Publish"}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {exams.length > 1 ? (
        <div className="print-hide flex flex-wrap items-center justify-between gap-3">
          <RowPicker
            label="Exam period"
            rows={exams.map((e) => ({
              id: e.id,
              name: e.name,
              has_clash: e.warnings.length > 0,
            }))}
            current={current}
            searchPlaceholder="Search exam periods"
            emptyText="No exam period matches that."
            presentation="card"
            icon={CalendarDays}
            subtitle={(row) => {
              const found = exams.find((e) => e.id === row.id)!;
              return `${formatRange(found.start_date, found.end_date)} · ${found.paper_count} paper${found.paper_count === 1 ? "" : "s"} · ${found.status_label}`;
            }}
            onPick={setExamId}
          />
          <PeriodStatus
            published={published}
            status={exam.status_label}
            papers={exam.paper_count}
          />
        </div>
      ) : (
        <Panel className="print-hide flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="font-mont text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-05">
              Exam period
            </p>
            <h2 className="mt-1 truncate font-mont text-base font-semibold text-black-01">
              {exam.name}
            </h2>
            <p className="mt-1 text-[13px] text-gray-06">
              {range} · from the calendar
            </p>
          </div>
          <div className="ml-auto">
            <PeriodStatus
              published={published}
              status={exam.status_label}
              papers={exam.paper_count}
            />
          </div>
        </Panel>
      )}

      <Panel className="print-area p-5">
        {/* On paper there is no header and no picker to say which exam period
            these papers belong to. */}
        <div className="print-only mb-4">
          <h1 className="font-mont text-lg font-semibold text-black-01">
            {exam.name}
          </h1>
          <p className="text-sm text-gray-06">
            {range} · {exam.paper_count} paper
            {exam.paper_count === 1 ? "" : "s"}
            {published ? " · Published" : " · Draft"}
          </p>
        </div>

        {exam.warnings.length > 0 && (
          <p className="print-only mb-3 text-sm text-error-text">
            {exam.warnings.length} clash
            {exam.warnings.length === 1 ? "" : "es"} in this schedule.
          </p>
        )}

        {exam.warnings.length > 0 && (
          <div className="print-hide rounded-lg border border-error-text/30 bg-error-text/5 px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-error-text">
              <AlertTriangle className="size-3.5 shrink-0" />
              {exam.warnings.length} clash
              {exam.warnings.length === 1 ? "" : "es"} in this schedule
            </p>
            <ul className="mt-1.5 grid gap-1">
              {exam.warnings.map((w, i) => (
                <li
                  key={`${w.code}-${i}`}
                  className="text-xs text-gray-06 text-pretty"
                >
                  {w.detail}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-05 text-pretty">
              Two classes really can sit in one hall, and one person really does
              float between rooms, so these save and publish. Check each one is
              meant before you publish.
            </p>
          </div>
        )}

        {published && (
          <p className="print-hide mt-4 rounded-lg border border-white-02 bg-white-05 px-3 py-2.5 text-[13px] text-gray-06 text-pretty">
            This schedule has been published, so it can no longer be changed.
          </p>
        )}

        <div className="mt-4">
          {exam.slots.length === 0 ? (
            <OutlinedNotice
              icon={ClipboardList}
              title="No papers scheduled"
              body={`${exam.name} runs ${range}. Add the papers that sit inside it.`}
              actionLabel={canCreate && !published ? "Add the first paper" : undefined}
              onAction={() =>
                setPaper({ values: blankPaper(exam.start_date), slot: null })
              }
            />
          ) : (
            <>
            <div className="print-hide mb-3 flex flex-wrap items-start justify-between gap-2">
              <PaperFilterBar
                filters={filters}
                options={options}
                clashingPaperCount={clashing.size}
                showing={shown.length}
                total={exam.slots.length}
                onChange={setFilters}
              />
              <SegmentedToggle
                ariaLabel="How to show the schedule"
                value={view}
                onChange={setView}
                options={[
                  { value: "board", label: "Board", icon: LayoutGrid },
                  { value: "list", label: "List", icon: List },
                ]}
              />
            </div>

            {shown.length === 0 ? (
              <OutlinedNotice
                icon={ClipboardList}
                title="No papers match"
                body="Every paper in this schedule is filtered out. Clear a filter to see them again."
                actionLabel="Clear all"
                onAction={() => setFilters(NO_FILTERS)}
              />
            ) : view === "board" ? (
              // Hidden on paper: the list is what prints, because a printed
              // exam timetable is checked field by field against a rota.
              <div className="print-hide">
                <PaperBoard
                  slots={shown}
                  clashing={clashing}
                  canCreate={!!canCreate && !published}
                  onOpen={(slot) => {
                    // A paper opens for editing only where the viewer may change it.
                    if (canEdit && !published && canManageRow(slot)) {
                      setPaper({ values: paperValuesFrom(slot), slot });
                    }
                  }}
                  onAdd={(date, sitting) =>
                    setPaper({
                      values: {
                        ...blankPaper(exam.start_date),
                        exam_date: date,
                        sitting: sitting as PaperValues["sitting"],
                      },
                      slot: null,
                    })
                  }
                />
              </div>
            ) : null}

            <div className={cn("print-drop-last", view === "board" && "hidden print:block")}>
            <CustomTable
              tableHeaderList={[
                "Date",
                "Sitting",
                "Class",
                "Subject",
                "Room",
                "Invigilator",
                "Action",
              ]}
              defaultBodyList={shown}
              tableBodyList={shown.map((slot) => ({
                Date: formatDate(slot.exam_date),
                Sitting: slot.sitting_label,
                Class: slot.class_name,
                Subject: slot.subject_name,
                Room: slot.room_name ?? "-",
                Invigilator: slot.invigilator?.name ?? "-",
                Action: (
                  <RowActions
                    label={`Actions for ${slot.class_name} ${slot.subject_name}`}
                    actions={[
                      canEdit && !published && canManageRow(slot) && {
                        label: "Edit",
                        icon: Pencil,
                        onSelect: () =>
                          setPaper({ values: paperValuesFrom(slot), slot }),
                      },
                      canDelete && !published && canManageRow(slot) && {
                        label: "Remove paper",
                        icon: Trash2,
                        destructive: true,
                        onSelect: async () => {
                          try {
                            const result = await remove({
                              examId: exam.id,
                              id: slot.id,
                            }).unwrap();
                            toast.success(result.message || "Paper removed.");
                          } catch (error) {
                            toast.error(
                              parseApiError(error).message ||
                                "That paper could not be removed.",
                            );
                          }
                        },
                      },
                    ]}
                  />
                ),
              }))}
              onRowClick={(slot: ExamSlot) => {
                if (slot && canEdit && !published && canManageRow(slot)) {
                  setPaper({ values: paperValuesFrom(slot), slot });
                }
              }}
              cardBreakpoint="lg"
              emptyText="No papers"
            />
            </div>
            </>
          )}
        </div>
      </Panel>

      <PaperDrawer
        open={!!paper}
        initial={paper?.values ?? blankPaper(exam.start_date)}
        editing={!!paper?.slot}
        periodName={exam.name}
        periodRange={range}
        minDate={exam.start_date}
        maxDate={exam.end_date}
        classes={paperClasses}
        subjects={subjectData?.data ?? []}
        rooms={roomData?.data ?? []}
        teachers={teacherData?.data ?? []}
        saving={creating || updating}
        removing={removing}
        onClose={() => setPaper(null)}
        onPreview={previewPaper}
        canPreview={hasPermission(P.CREATE_EXAM)}
        onSave={savePaper}
        onRemove={
          canDelete && paper?.slot && canManageRow(paper.slot)
            ? removePaper
            : undefined
        }
      />
    </PageShell>
  );
}

function PageHeading({ periodName }: { periodName?: string }) {
  return (
    <div className="min-w-0">
      <h1 className="font-mont text-lg font-semibold text-black-01">
        Exam Scheduling
      </h1>
      <p className="mt-1 text-sm text-gray-06 text-pretty">
        {periodName
          ? `Papers placed inside ${periodName}.`
          : "Build and publish the papers inside each dated exam period."}
      </p>
    </div>
  );
}

function PeriodStatus({
  published,
  status,
  papers,
}: {
  published: boolean;
  status: string;
  papers: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Badge
        variant={published ? "active" : "pending"}
        className="rounded-full py-0.5 text-[11px]"
      >
        {status}
      </Badge>
      <p className="text-xs text-gray-05">
        {papers} paper{papers === 1 ? "" : "s"}
      </p>
    </div>
  );
}
