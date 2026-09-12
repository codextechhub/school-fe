import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  BookOpenText,
  Building2,
  Gauge,
  GraduationCap,
  LoaderCircle,
  Lock,
  Pencil,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { ClassTeacherDrawer } from "@/pages/protected/staff/drawers/class-teacher-drawer";
import { PersonAvatar } from "@/pages/protected/students/person-avatar";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useGetClassQuery,
  useGetProgramsQuery,
  useUpdateClassMutation,
} from "@/redux/services/academics/academics-api";
import type {
  ClassWrite,
  Level,
} from "@/redux/services/academics/academics-types";
import {
  useGetClassRosterQuery,
  useLazyGetClassRosterQuery,
} from "@/redux/services/students/students-api";
import type { StudentRow } from "@/redux/services/students/students-types";
import type { Pagination } from "@/redux/services/onboarding/onboarding-types";
import { routesPath } from "@/routes/routesPath";
import { parseApiError } from "@/utils/api-error";
import { ClassDrawer } from "../class-drawer";

/**
 * A live class record with its teacher, capacity, subjects, and roster preview.
 *
 * Student access is checked separately from class access. A reader may manage
 * academic structure without permission to browse pupil records, so the class
 * remains useful while the roster area becomes a clear restricted state.
 */
export default function ClassDetails() {
  const { id } = useParams();
  const classId = Number(id);
  const validId = Number.isFinite(classId) && classId > 0;
  const { lens, multiBranch, readOnlyYear } = useAcademicsLens();
  const { hasPermission } = usePermissions();

  const [editing, setEditing] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetClassQuery(classId, { skip: !validId });
  const klass = data?.data;

  const canBrowseStudents = hasPermission(P.BROWSE_STUDENTS);
  const {
    data: rosterData,
    isFetching: rosterLoading,
    isError: rosterError,
    refetch: refetchRoster,
  } = useGetClassRosterQuery(classId, {
    skip: !validId || !canBrowseStudents,
  });

  const { data: programData } = useGetProgramsQuery(lens);
  const levels = useMemo<Level[]>(
    () => (programData?.data ?? []).flatMap((program) => program.levels ?? []),
    [programData],
  );
  const students = useMemo(() => rosterData?.data ?? [], [rosterData]);
  const [update, { isLoading: updating }] = useUpdateClassMutation();

  const canEdit =
    hasPermission(P.MODIFY_CLASS) && !readOnlyYear && klass?.is_active !== false;
  const canAssignTeacher =
    hasPermission(P.ASSIGN_TEACHING) && !readOnlyYear;

  async function saveClass(body: ClassWrite) {
    if (!klass) return;
    try {
      const result = await update({ id: klass.id, ...body }).unwrap();
      toast.success(result.message);
    } catch (error) {
      toast.error(
        parseApiError(error).message || "That class could not be saved.",
      );
      throw error;
    }
  }

  if (isLoading) {
    return <ClassDetailsSkeleton />;
  }

  if (isError || !klass) {
    return (
      <PageShell className="pb-10">
        <OutlinedNotice
          icon={GraduationCap}
          title="We could not load this class"
          body="It may no longer exist, or something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  const seatsUsed = rosterData?.seats_used;
  const capacity = rosterData?.capacity ?? klass.capacity;
  const rosterAvailable = canBrowseStudents && !rosterError;
  const capacityPercent =
    capacity != null && seatsUsed != null
      ? Math.min(100, Math.round((seatsUsed / capacity) * 100))
      : 0;
  const seatsRemaining =
    capacity != null && seatsUsed != null ? capacity - seatsUsed : null;

  return (
    <PageShell className="content-start gap-5 pb-10" grid>
      <div>
        <Button variant="ghost" asChild className="mb-2 -ml-3 text-gray-05">
          <Link to={routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASSES}>
            <ArrowLeft className="size-4" />
            Classes &amp; Arms
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-black-01">
                {klass.name}
              </h1>
              <Badge
                variant={klass.is_active ? "active" : "inactive"}
                className="rounded-full text-[11px]"
              >
                {klass.is_active ? "Active" : "Archived"}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-05">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="size-3.5" />
                {klass.level_name}
                {klass.arm ? `, Arm ${klass.arm}` : ""}
              </span>
              <span>Code: {klass.code || "Not set"}</span>
              {multiBranch && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {klass.scope_label ?? klass.branch_name ?? "School-wide"}
                  </span>
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <Button
              variant="outline"
              className="shrink-0 border-primary text-primary"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
              Edit class
            </Button>
          )}
        </div>
      </div>

      {!klass.is_active && (
        <Panel className="flex items-start gap-2.5 bg-white-05 px-4 py-3 text-xs text-gray-05">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <p className="text-pretty">
            This class is archived and read-only. Restore it from Classes &amp;
            Arms before making changes.
          </p>
        </Panel>
      )}

      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Class summary"
      >
        <SummaryCard
          icon={UserRoundCheck}
          label="Class teacher"
          value={klass.class_teacher?.name ?? "Not assigned"}
          subdued={!klass.class_teacher}
        />
        <SummaryCard
          icon={Users}
          label="Students"
          value={studentCountLabel({
            canBrowseStudents,
            loading: rosterLoading,
            error: rosterError,
            seatsUsed,
          })}
        />
        <SummaryCard
          icon={Gauge}
          label="Capacity"
          value={capacity == null ? "No limit" : String(capacity)}
        />
        <SummaryCard
          icon={BookOpenText}
          label="Subjects"
          value={String(klass.subject_count)}
        />
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Panel
          as="section"
          className="min-w-0 overflow-hidden"
          aria-labelledby="roster-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div>
              <h2 id="roster-heading" className="font-semibold text-black-01">
                Students in this class
              </h2>
              <p className="mt-0.5 text-xs text-gray-05">
                Scroll inside this panel to load the full class register.
              </p>
            </div>
            {canBrowseStudents && (
              <Button size="sm" variant="outline" asChild>
                <Link
                  to={`${routesPath.PROTECTED.STUDENTS.ASSIGN}?tab=roster&class=${klass.id}`}
                >
                  Open full register
                </Link>
              </Button>
            )}
          </div>

          <RosterPreview
            classId={klass.id}
            students={students}
            pagination={rosterData?.pagination}
            loading={rosterLoading}
            canBrowse={canBrowseStudents}
            error={rosterError}
            onRetry={() => refetchRoster()}
          />
        </Panel>

        <div className="grid min-w-0 content-start gap-5">
          <Panel
            as="section"
            className="overflow-hidden"
            aria-labelledby="teacher-heading"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 id="teacher-heading" className="font-semibold text-black-01">
                Class teacher
              </h2>
              <p className="mt-0.5 text-xs text-gray-05">
                The main contact for this class.
              </p>
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              <span className="grid size-10 shrink-0 place-content-center rounded-full bg-primary/10 text-primary">
                <UserRoundCheck className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-semibold",
                    klass.class_teacher ? "text-black-01" : "text-amber-700",
                  )}
                >
                  {klass.class_teacher?.name ?? "No class teacher assigned"}
                </p>
                <p className="mt-0.5 text-xs text-gray-05">
                  {klass.class_teacher
                    ? "Currently assigned"
                    : "This class needs a teacher"}
                </p>
              </div>
              {canAssignTeacher && klass.is_active && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAssigningTeacher(true)}
                >
                  {klass.class_teacher ? "Change" : "Assign"}
                </Button>
              )}
            </div>
          </Panel>

          <CapacityPanel
            capacity={capacity}
            seatsUsed={seatsUsed}
            percent={capacityPercent}
            remaining={seatsRemaining}
            available={rosterAvailable}
            loading={rosterLoading}
          />

          <Panel
            as="section"
            className="overflow-hidden"
            aria-labelledby="information-heading"
          >
            <div className="border-b border-border px-4 py-3">
              <h2
                id="information-heading"
                className="font-semibold text-black-01"
              >
                Class information
              </h2>
            </div>
            <dl className="grid gap-3 px-4 py-4 text-sm">
              <InformationRow label="Level" value={klass.level_name} />
              <InformationRow
                label="Arm or stream"
                value={klass.arm || "Not set"}
              />
              <InformationRow label="Code" value={klass.code || "Not set"} />
              <InformationRow
                label="Description"
                value={klass.description || "No description"}
              />
            </dl>
          </Panel>
        </div>
      </div>

      <ClassDrawer
        open={editing}
        editing={klass}
        levels={levels}
        saving={updating}
        onClose={() => setEditing(false)}
        onSave={saveClass}
      />

      {assigningTeacher && (
        <ClassTeacherDrawer
          schoolClassId={klass.id}
          className={klass.name}
          currentStaffId={klass.class_teacher?.staff_id ?? null}
          onClose={() => setAssigningTeacher(false)}
        />
      )}
    </PageShell>
  );
}

function ClassDetailsSkeleton() {
  return (
    <PageShell className="content-start gap-5 pb-10" grid>
      <Skeleton className="h-20 w-full rounded-md" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-md" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Skeleton className="h-96 w-full rounded-md" />
        <div className="grid gap-5">
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
      </div>
    </PageShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subdued = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subdued?: boolean;
}) {
  return (
    <Panel className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4">
      <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-05 sm:text-xs">{label}</p>
        <p
          className={cn(
            "break-words text-[13px] font-semibold leading-tight sm:text-base",
            subdued ? "text-amber-700" : "text-black-01",
          )}
        >
          {value}
        </p>
      </div>
    </Panel>
  );
}

function studentCountLabel({
  canBrowseStudents,
  loading,
  error,
  seatsUsed,
}: {
  canBrowseStudents: boolean;
  loading: boolean;
  error: boolean;
  seatsUsed?: number;
}) {
  if (!canBrowseStudents) return "Restricted";
  if (loading) return "Loading";
  if (error || seatsUsed == null) return "Unavailable";
  return String(seatsUsed);
}

function RosterPreview({
  classId,
  students,
  pagination,
  loading,
  canBrowse,
  error,
  onRetry,
}: {
  classId: number;
  students: StudentRow[];
  pagination?: Pagination;
  loading: boolean;
  canBrowse: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const [loadedStudents, setLoadedStudents] = useState<StudentRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(7);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const loadLock = useRef(false);
  const [loadPage, { isFetching: loadingMore }] =
    useLazyGetClassRosterQuery();

  useEffect(() => {
    setLoadedStudents(students);
    setVisibleCount(7);
    setNextPage(
      pagination?.next ? (pagination.currentPage ?? 1) + 1 : null,
    );
    setLoadMoreError(false);
    loadLock.current = false;
  }, [classId, pagination?.currentPage, pagination?.next, students]);

  async function revealMore() {
    if (loadLock.current) return;

    const nextVisible = Math.min(visibleCount + 7, loadedStudents.length);
    if (nextVisible > visibleCount) setVisibleCount(nextVisible);
    if (nextVisible < loadedStudents.length || nextPage == null) return;

    loadLock.current = true;
    setLoadMoreError(false);
    try {
      const response = await loadPage({ classId, page: nextPage }).unwrap();
      setLoadedStudents((current) => {
        const knownIds = new Set(current.map((student) => student.id));
        return [
          ...current,
          ...response.data.filter((student) => !knownIds.has(student.id)),
        ];
      });
      setNextPage(
        response.pagination.next
          ? response.pagination.currentPage + 1
          : null,
      );
    } catch {
      setLoadMoreError(true);
    } finally {
      loadLock.current = false;
    }
  }

  if (!canBrowse) {
    return (
      <p className="px-5 py-10 text-center text-sm text-gray-05">
        You do not have permission to browse student records.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-0 px-4 sm:px-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-border py-3 last:border-0"
          >
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid place-items-center gap-2 px-5 py-10 text-center">
        <p className="text-sm text-gray-05">
          We could not load this class register.
        </p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!students.length) {
    return (
      <p className="px-5 py-10 text-center text-sm text-gray-05">
        No students are assigned to this class yet.
      </p>
    );
  }

  const displayedStudents = loadedStudents.slice(0, visibleCount);
  const hasMore =
    visibleCount < loadedStudents.length || nextPage != null;

  return (
    <div
      className="max-h-96 overflow-y-auto overscroll-contain px-4 sm:px-5"
      aria-label="Class student list"
      tabIndex={0}
      onScroll={(event) => {
        const panel = event.currentTarget;
        const nearBottom =
          panel.scrollHeight - panel.scrollTop - panel.clientHeight < 72;
        if (nearBottom) void revealMore();
      }}
    >
      <ul>
        {displayedStudents.map((student) => (
          <li key={student.id} className="border-b border-border last:border-0">
            <Link
              to={routesPath.PROTECTED.STUDENTS.PROFILE_ID(student.id)}
              className="group flex min-w-0 items-center gap-3 rounded-md py-3 outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <PersonAvatar
                name={student.full_name}
                photoUrl={student.photo_url}
                className="size-9 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-black-01 group-hover:text-primary">
                  {student.full_name}
                </p>
                <p className="mt-0.5 break-words text-xs text-gray-05">
                  {student.student_number || "Admission number not issued"}
                </p>
              </div>
              <Badge
                variant={student.status === "ACTIVE" ? "active" : "inactive"}
                className="shrink-0 rounded-full text-[10px]"
              >
                {student.status_label}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>

      <div
        className="flex min-h-10 items-center justify-center border-t border-border py-2 text-xs text-gray-05"
        aria-live="polite"
      >
        {loadingMore ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading more students
          </span>
        ) : loadMoreError ? (
          <Button size="sm" variant="ghost" onClick={() => void revealMore()}>
            Try loading more
          </Button>
        ) : hasMore ? (
          "Scroll for more students"
        ) : (
          `All ${loadedStudents.length} students loaded`
        )}
      </div>
    </div>
  );
}

function CapacityPanel({
  capacity,
  seatsUsed,
  percent,
  remaining,
  available,
  loading,
}: {
  capacity: number | null;
  seatsUsed?: number;
  percent: number;
  remaining: number | null;
  available: boolean;
  loading: boolean;
}) {
  let detail = "Student numbers are unavailable.";
  if (loading) detail = "Loading class capacity.";
  else if (available && seatsUsed != null && capacity == null) {
    detail = `${seatsUsed} ${seatsUsed === 1 ? "student" : "students"}, with no capacity limit set.`;
  } else if (
    available &&
    seatsUsed != null &&
    capacity != null &&
    remaining != null
  ) {
    detail =
      remaining >= 0
        ? `${seatsUsed} of ${capacity} seats used, ${remaining} remaining.`
        : `${seatsUsed} of ${capacity} seats used, ${Math.abs(remaining)} over capacity.`;
  }

  return (
    <Panel
      as="section"
      className="overflow-hidden"
      aria-labelledby="capacity-heading"
    >
      <div className="border-b border-border px-4 py-3">
        <h2 id="capacity-heading" className="font-semibold text-black-01">
          Class capacity
        </h2>
        <p className="mt-0.5 text-xs text-gray-05">{detail}</p>
      </div>
      <div className="px-4 py-4">
        {capacity != null && available && seatsUsed != null ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-05">Seats used</span>
              <span className="font-semibold text-black-01">{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white-02">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  remaining != null && remaining < 0
                    ? "bg-error-01"
                    : "bg-primary",
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-05">
            {capacity == null
              ? "Set a capacity when the class has a fixed number of seats."
              : "Capacity use appears when the student register is available."}
          </p>
        )}
      </div>
    </Panel>
  );
}

function InformationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
      <dt className="text-gray-05">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-black-01">
        {value}
      </dd>
    </div>
  );
}
