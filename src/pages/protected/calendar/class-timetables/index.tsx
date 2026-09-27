import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  Bell,
  Copy,
  Eraser,
  GraduationCap,
  Printer,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/custom/surface";
import PermissionGate from "@/components/custom/permission-gate";
import PromptModal from "@/components/modal/prompt-modal";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { parseApiError } from "@/utils/api-error";
import {
  useClearTimetableMutation,
  useCreateSlotMutation,
  usePreviewSlotMutation,
  useDeleteSlotMutation,
  useDuplicateTimetableMutation,
  useGetClassTimetableQuery,
  useGetClassTimetablesQuery,
  useGetRoomsQuery,
  useGetTeachersQuery,
  useLazyPreviewDuplicateTimetableQuery,
  usePublishTimetableMutation,
  useUpdateSlotMutation,
} from "@/redux/services/calendar/calendar-api";
import { useGetSubjectsQuery } from "@/redux/services/academics/academics-api";
import type { GridCell } from "@/redux/services/calendar/calendar-types";
import { TimetableGrid } from "../components/timetable-grid";
import {
  LessonDrawer,
  type LessonTarget,
  type LessonValues,
} from "../components/lesson-drawer";
import { DuplicateDrawer } from "../components/duplicate-drawer";
import { ExportButton } from "@/components/custom/export-button";
import { ClassPicker } from "./class-picker";
import { PageShell } from "@/components/layout/page-shell";
import { canManageRow } from "@/lib/can-manage";

/**
 * A weekly grid per class. Click an empty cell to fill it.
 *
 * **Three states this screen has that a list does not**, and each is a
 * different answer:
 *
 * *No bell schedule* blocks everything. A grid is built on the school's
 * periods, so with none there are no rows to draw and nothing to click. It
 * points at the screen that fixes it rather than rendering an empty table.
 *
 * *Clashes* are shown and do not block editing. They block PUBLISHING, which
 * is the one moment a school asserts the week is finished.
 *
 * *Published* is not read-only here. A published grid can still be edited, and
 * the seeded data proves it matters: a class can be published and then acquire
 * a clash when another class books the same teacher.
 */
export default function ClassTimetables() {
  const { lens, readOnlyYear } = useAcademicsLens();
  const { hasPermission } = usePermissions();
  const [params, setParams] = useSearchParams();

  const [lesson, setLesson] = useState<LessonTarget | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | null>(null);

  const { data: listData, isLoading: listLoading } =
    useGetClassTimetablesQuery(lens);
  const classes = useMemo(() => listData?.data ?? [], [listData]);

  // The first class the caller can see, until one is picked. A screen that
  // opens on "choose a class" makes a reader do a step the server can do.
  const requestedClass = Number(params.get("class"));
  const current =
    classes.find((schoolClass) => schoolClass.id === requestedClass)?.id ??
    classes[0]?.id ??
    null;
  const currentRow = classes.find((c) => c.id === current) ?? null;

  const setClassId = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("class", String(id));
    setParams(next, { replace: true });
  };

  const { data: gridData, isLoading: gridLoading } = useGetClassTimetableQuery(
    current ? { id: current, session: lens.session } : { id: 0 },
    { skip: !current },
  );
  const grid = gridData?.data;

  const { data: subjectData } = useGetSubjectsQuery(lens);
  // Deliberately unnarrowed, unlike the teacher screen's list. This is the
  // picker that ASSIGNS a teacher to a lesson, and Mr Eze teaches at both
  // branches: filtering it would make him unschedulable at the second one.
  // What makes the wide picker safe is that the clash query is wide too.
  const { data: teacherData } = useGetTeachersQuery({ session: lens.session });
  // Rooms at THIS class's branch: the server refuses a room anywhere else.
  const { data: roomData } = useGetRoomsQuery(
    currentRow?.branch
      ? { branch: currentRow.branch, active: "true" }
      : { active: "true" },
  );

  const [createSlot, { isLoading: creating }] = useCreateSlotMutation();
  const [previewSlot] = usePreviewSlotMutation();
  const [updateSlot, { isLoading: updating }] = useUpdateSlotMutation();
  const [deleteSlot, { isLoading: deleting }] = useDeleteSlotMutation();
  const [clear, { isLoading: clearing }] = useClearTimetableMutation();
  const [publish, { isLoading: publishing }] = usePublishTimetableMutation();
  const [previewDuplicate, previewState] =
    useLazyPreviewDuplicateTimetableQuery();
  const [runDuplicate, { isLoading: duplicating }] =
    useDuplicateTimetableMutation();

  // A school-wide class's grid is read-only to a branch administrator.
  const mine = canManageRow(currentRow);
  const canCreate = hasPermission(P.CREATE_TIMETABLE_ENTRY) && !readOnlyYear && mine;
  const canEdit = hasPermission(P.MODIFY_TIMETABLE_ENTRY) && !readOnlyYear && mine;
  const canManage = hasPermission(P.DELETE_TIMETABLE) && !readOnlyYear && mine;
  const canPublish = hasPermission(P.PUBLISH_TIMETABLE) && !readOnlyYear && mine;

  const warnings = grid?.warnings ?? [];
  const published = grid?.status === "PUBLISHED";

  const openCell = (cell: GridCell, dayIndex: number) => {
    // A filled cell is an edit; an empty one is a new lesson.
    if (!grid || !(cell.slot ? canEdit : canCreate)) return;
    const day = grid.days[dayIndex];
    setLesson({
      slot: cell.slot ?? null,
      period: cell.period,
      periodLabel: cell.period_label,
      dayOfWeek: day.day_of_week,
      dayLabel: day.day_label,
    });
  };

  const saveLesson = async (values: LessonValues) => {
    if (!lesson || !current) return [];
    const body = {
      subject: values.subject!,
      teacher: values.teacher,
      room: values.room,
    };
    const result = lesson.slot
      ? await updateSlot({ id: lesson.slot.id, ...body }).unwrap()
      : await createSlot({
          school_class: current,
          day_of_week: lesson.dayOfWeek as 1 | 2 | 3 | 4 | 5,
          period: lesson.period,
          ...body,
        }).unwrap();
    toast.success(result.message);
    // The write happened AND has something to say. Each warning is the
    // server's own sentence, naming who is double-booked and where.
    for (const w of result.data?.warnings ?? []) toast.warning(w.detail);
    return result.data?.warnings ?? [];
  };

  // Asks what this draft would clash with, from the same engine the save uses.
  // The preview endpoint always takes the whole draft, including the class and
  // the cell, so a change of teacher is asked about in the place it would land.
  const previewLesson = async (values: LessonValues) => {
    if (!lesson || !current) return { warnings: [] };
    const result = await previewSlot({
      school_class: current,
      day_of_week: lesson.dayOfWeek as 1 | 2 | 3 | 4 | 5,
      period: lesson.period,
      subject: values.subject!,
      teacher: values.teacher,
      room: values.room,
      // The cell being edited is not a clash with itself.
      ...(lesson.slot ? { exclude: lesson.slot.id } : {}),
    }).unwrap();
    return { warnings: result.data?.warnings ?? [] };
  };

  const removeLesson = async () => {
    if (!lesson?.slot) return;
    const result = await deleteSlot(lesson.slot.id).unwrap();
    toast.success(result.message || "Slot cleared.");
  };

  const runClear = async () => {
    if (!current) return;
    try {
      const result = await clear({ id: current }).unwrap();
      toast.success(result.message);
    } catch (error) {
      toast.error(
        parseApiError(error).message || "That timetable could not be cleared.",
      );
    }
    setConfirm(null);
  };

  const runPublish = async () => {
    if (!current) return;
    try {
      const result = await publish({ id: current }).unwrap();
      toast.success(result.message);
    } catch (error) {
      // TIMETABLE_HAS_CLASHES or TIMETABLE_INCOMPLETE. Both are sentences
      // written for this reader and shown as they arrived.
      toast.error(
        parseApiError(error).message || "That timetable could not be published.",
      );
    }
  };

  if (listLoading) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <Skeleton className="h-14 w-72 max-w-full rounded-md" />
        <Skeleton className="h-[28rem] w-full rounded-md" />
      </PageShell>
    );
  }

  if (!classes.length) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <OutlinedNotice
          icon={GraduationCap}
          title="No classes yet"
          body="A timetable is a week for one class, so there has to be a class first. Add them on Classes & Arms."
          actionLabel="Go to Classes & Arms"
          onAction={() => {
            window.location.assign(
              routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASSES,
            );
          }}
        />
      </PageShell>
    );
  }

  // The blocking state, and it is the whole screen. A grid is built on the
  // school's periods; with none there are no rows to draw.
  if (grid && !grid.has_bell_schedule) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <ClassPicker
          classes={classes}
          current={current}
          onPick={setClassId}
        />
        <OutlinedNotice
          icon={Bell}
          title="No bell schedule yet"
          body="A timetable grid is built on the school's periods, so the bell schedule has to come first."
          actionLabel="Set up the bell schedule"
          onAction={() => {
            window.location.assign(routesPath.PROTECTED.TIMETABLES.BELL_SCHEDULE);
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="print-hide flex flex-wrap items-start justify-between gap-3">
        <PageHeading />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="text-sm"
            onClick={() => window.print()}
          >
            <Printer className="size-4" /> Print
          </Button>
          {/* Print serves the noticeboard workflow while export serves the
              spreadsheet workflow and keeps its independent permission. */}
          <ExportButton
            screen="calendar.timetable"
            params={{
              school_class: current ?? undefined,
              branch: currentRow?.branch ?? undefined,
            }}
          />
          {canEdit && (
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => setDupOpen(true)}
            >
              <Copy className="size-4" /> Duplicate from…
            </Button>
          )}
          {canManage && (grid?.filled ?? 0) > 0 && (
            <Button
              variant="outline"
              className="text-sm text-error-text"
              onClick={() => setConfirm("clear")}
            >
              <Eraser className="size-4" /> Clear
            </Button>
          )}
          <PermissionGate
            permission={P.PUBLISH_TIMETABLE}
            disabled={readOnlyYear}
          >
            <Button
              className="text-sm"
              onClick={runPublish}
              disabled={!canPublish || publishing}
            >
              <Send className="size-4" />
              {published ? "Republish" : "Publish"}
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="print-hide flex flex-wrap items-center justify-between gap-3">
        <ClassPicker classes={classes} current={current} onPick={setClassId} />

        <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:justify-end">
          <Badge
            variant={published ? "active" : currentRow?.status ? "pending" : "inactive"}
            className="rounded-full py-0.5 text-[11px]"
          >
            {grid?.status_label ?? currentRow?.status_label ?? "Not started"}
          </Badge>
          <p className="text-xs text-gray-05">
            {grid?.filled ?? currentRow?.lesson_count ?? 0} of{" "}
            {grid?.lesson_periods ?? 0} teaching periods filled
          </p>
        </div>
      </div>

      {gridLoading || !grid ? (
        <Skeleton className="h-[28rem] w-full rounded-md" />
      ) : (
        <Panel className="print-area overflow-hidden">
          {/* The document's own heading: on paper there is no session pill and
              no page title to say which class or which year this is. */}
          <div className="print-only mb-4">
            <h1 className="font-mont text-lg font-semibold text-black-01">
              {grid.school_class.name} - weekly timetable
            </h1>
            <p className="text-sm text-gray-06">
              {grid.session.name} · {grid.status_label} ·{" "}
              {grid.filled} of {grid.lesson_periods} teaching periods filled
            </p>
          </div>

          {/* A printed copy carries the fact that the week is unresolved, but
              not the list: a noticeboard cannot act on "Mrs Eze is
              double-booked", and a reader who can is looking at the screen. */}
          {warnings.length > 0 && (
            // States the clashes and nothing about publication: a grid can be
            // published and then acquire one when another class books the same
            // teacher, so "has not been published" would be false exactly when
            // it matters most.
            <p className="print-only mb-3 text-sm text-error-text">
              {warnings.length} unresolved clash
              {warnings.length === 1 ? "" : "es"} in this week.
            </p>
          )}

          {warnings.length > 0 && (
            <div className="print-hide border-b border-error-text/20 bg-error-text/5 px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-error-text">
                <AlertTriangle className="size-3.5 shrink-0" />
                {warnings.length} clash
                {warnings.length === 1 ? "" : "es"} in this timetable
              </p>
              <ul className="mt-1.5 grid gap-1">
                {warnings.map((w, i) => (
                  <li
                    key={`${w.code}-${i}`}
                    className="text-xs text-gray-06 text-pretty"
                  >
                    {w.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-05 text-pretty">
                The grid saves with clashes in it. They only block publishing.
              </p>
            </div>
          )}

          {grid.filled === 0 && canCreate && (
            <p className="print-hide border-b border-primary/10 bg-pry-01/25 px-4 py-3 text-[13px] text-gray-06 text-pretty sm:px-5">
              {grid.lesson_periods} teaching slots this week. Click any empty
              slot to add the first lesson, or duplicate another class's week.
            </p>
          )}

          <div>
            <TimetableGrid
              days={grid.days}
              warnings={warnings}
              variant="class"
              onCellClick={canEdit || canCreate ? openCell : undefined}
              emptyLabel={canCreate ? "Add" : "Free"}
            />
          </div>

          {published && (
            <p className="print-hide border-t border-border px-4 py-3 text-xs text-gray-05 text-pretty sm:px-5">
              Published{" "}
              {grid.published_at
                ? new Date(grid.published_at).toLocaleDateString()
                : ""}
              . Editing it here does not unpublish it; press Republish when the
              week is right again.
            </p>
          )}
        </Panel>
      )}

      <p className="print-hide text-xs text-gray-05">
        Teacher weeks are derived from these grids.{" "}
        <Link
          to={routesPath.PROTECTED.TIMETABLES.TEACHERS}
          className="font-medium text-primary hover:underline"
        >
          See a teacher's timetable
        </Link>
      </p>

      <LessonDrawer
        open={!!lesson}
        target={lesson}
        className={grid?.school_class.name ?? ""}
        subjects={subjectData?.data ?? []}
        teachers={teacherData?.data ?? []}
        rooms={roomData?.data ?? []}
        saving={creating || updating}
        removing={deleting}
        onClose={() => setLesson(null)}
        onSave={saveLesson}
        onRemove={canManage ? removeLesson : undefined}
        onPreview={previewLesson}
        canPreview={hasPermission(P.CREATE_TIMETABLE_ENTRY)}
      />

      <DuplicateDrawer
        open={dupOpen}
        targetName={currentRow?.name ?? ""}
        // A class cannot be copied into itself, and a class with no lessons
        // has nothing to give.
        sources={classes.filter((c) => c.id !== current && c.lesson_count > 0)}
        summary={previewState.data?.data ?? null}
        previewing={previewState.isFetching}
        running={duplicating}
        onPreview={({ source, keepTeachers, keepRooms }) =>
          current &&
          previewDuplicate({
            id: current,
            source_class: source,
            keep_teachers: keepTeachers,
            keep_rooms: keepRooms,
          })
        }
        onClose={() => setDupOpen(false)}
        onRun={async ({ source, keepTeachers, keepRooms }) => {
          if (!current) return;
          const result = await runDuplicate({
            id: current,
            source_class: source,
            keep_teachers: keepTeachers,
            keep_rooms: keepRooms,
          }).unwrap();
          toast.success(result.message);
        }}
      />

      <PromptModal
        isOpen={confirm === "clear"}
        onClose={() => setConfirm(null)}
        onConfirm={runClear}
        loading={clearing}
        canCancel
        title={`Clear ${currentRow?.name}'s timetable?`}
        description={`Every lesson in ${currentRow?.name}'s week is removed - ${grid?.filled ?? 0} of them. ${
          published
            ? "The timetable also drops back to draft, so it will need publishing again."
            : "Nothing else is affected."
        } This cannot be undone.`}
        onConfirmText="Clear it"
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
      />
    </PageShell>
  );
}

function PageHeading() {
  return (
    <div className="min-w-0">
      <h1 className="font-mont text-lg font-semibold text-black-01">
        Class Timetables
      </h1>
      <p className="mt-1 text-sm text-gray-06 text-pretty">
        Build each class's week, resolve clashes, then publish it.
      </p>
    </div>
  );
}
