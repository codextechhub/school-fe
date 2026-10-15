import { useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Search,
  Users,
} from "lucide-react";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { PersonAvatar } from "@/pages/protected/students/person-avatar";
import {
  useGetLessonRegisterQuery,
  useGetLessonsQuery,
} from "@/redux/services/attendance/attendance-api";
import type {
  AttendanceMark,
  LessonListRow,
  LessonRegister,
} from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";

import { AttendancePageHeader } from "../components/attendance-page-header";
import { ClosedDayNotice } from "../components/closed-day-notice";
import { DayPicker } from "../components/day-picker";
import { MARKS, markLabel } from "../marks";
import { timeOnDay } from "../time-on-day";
import { useAttendanceDay } from "../use-attendance-day";
import { lessonDirectoryFieldPolicy } from "./lesson-directory-policy";
import {
  type LessonDirectoryFilter,
  lessonMatchesFilter,
  lessonMatchesSearch,
  summarizeLessons,
} from "./lesson-directory-state";

/**
 * The daily lesson queue and one focused register preview.
 *
 * The day endpoint remains the source of the complete queue and its status
 * summary. Only the selected lesson loads its student register, which avoids a
 * separate request for every timetable slot. The preview is read-only; marking
 * and submission remain in the full lesson register where every student is
 * available together.
 */
export default function AttendanceLessons() {
  const { hasPermission } = usePermissions();
  const { date, today, isToday, setDate } = useAttendanceDay();
  const { branch, applies, label } = useBranchLens();
  const { formatDay } = useSchoolDisplay();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_LESSON);
  const allowed = hasPermission(P.TAKE_ANY_REGISTER);
  const [filter, setFilter] = useState<LessonDirectoryFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const fieldPolicy = lessonDirectoryFieldPolicy({
    statusHidden: access.isHidden("status"),
    countsHidden: access.isHidden("counts"),
    markHidden: access.isHidden("mark"),
    morningMarkHidden: access.isHidden("morning_mark"),
    submittedAtHidden: access.isHidden("taken_by"),
  });
  const lessonsQuery = useGetLessonsQuery(
    { date: isToday ? undefined : date, branch },
    { skip: !allowed },
  );
  const list = lessonsQuery.data?.data;
  const lessons = list?.lessons ?? [];
  const visibleLessons = lessons.filter((row) => (
    lessonMatchesSearch(row, search) &&
    (!fieldPolicy.showStatus || lessonMatchesFilter(row, filter))
  ));
  const focused = visibleLessons.find((row) => row.slot_id === selectedSlotId)
    ?? visibleLessons[0]
    ?? null;
  const registerQuery = useGetLessonRegisterQuery(
    { slotId: focused?.slot_id ?? 0, date },
    { skip: !allowed || !focused },
  );

  if (!allowed) {
    return (
      <PageShell>
        <PageAccessDenied message="This list is for administrators who take any class's register. Your own lessons are on your Today screen." />
      </PageShell>
    );
  }

  const summary = summarizeLessons(lessons);
  const selectLesson = (row: LessonListRow) => {
    setSelectedSlotId(row.slot_id);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.requestAnimationFrame(() => {
        document.getElementById("lesson-register-focus")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const changeFilter = (next: LessonDirectoryFilter) => {
    setFilter(next);
    setSelectedSlotId(null);
  };

  return (
    <PageShell className="content-start gap-5" grid>
      <AttendancePageHeader
        title="Lesson registers"
        description="Track every scheduled lesson, follow incomplete registers, and open the lesson that needs attention."
        meta={[formatDay(date, { weekday: "long", month: "long" }), applies ? label : null]}
        actions={<DayPicker date={date} today={today} onChange={setDate} />}
      />

      {lessonsQuery.isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="We could not load the lessons"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => lessonsQuery.refetch()}
        />
      ) : lessonsQuery.isLoading || !list ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-md" />)}
          </div>
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.78fr)]">
            <Skeleton className="h-[32rem] rounded-md" />
            <Skeleton className="h-[32rem] rounded-md" />
          </div>
        </>
      ) : list.closed ? (
        <ClosedDayNotice closed={list.closed} dateLabel={list.date_label} />
      ) : !list.lesson_marking_on ? (
        <LessonMarkingOff />
      ) : lessons.length === 0 ? (
        <Panel as="section" className="grid min-h-72 place-items-center p-6 text-center">
          <div className="max-w-sm">
            <BookOpen className="mx-auto size-8 text-gray-05" aria-hidden="true" />
            <h2 className="mt-3 font-mont text-base font-semibold text-black-01">No lessons on this day</h2>
            <p className="mt-1 text-sm text-gray-06">Published timetable lessons will appear here.</p>
          </div>
        </Panel>
      ) : (
        <>
          <LessonSummary
            total={lessons.length}
            summary={summary}
            showStatus={fieldPolicy.showStatus}
          />
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.78fr)]">
            <Panel as="section" className="overflow-hidden">
              <div className="flex min-w-0 flex-col gap-3 border-b border-border p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block w-full lg:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" aria-hidden="true" />
                  <span className="sr-only">Search lessons</span>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search lessons"
                    className="pl-9"
                  />
                </label>
                {fieldPolicy.showStatus && (
                  <div className="max-w-full overflow-x-auto">
                    <SegmentedToggle<LessonDirectoryFilter>
                      value={filter}
                      options={[
                        { value: "all", label: "All", count: lessons.length },
                        { value: "action", label: "Needs action", count: summary.needsAction },
                        { value: "submitted", label: "Submitted", count: summary.submitted },
                      ]}
                      onChange={changeFilter}
                      ariaLabel="Lesson register filter"
                    />
                  </div>
                )}
              </div>

              <div className={cn(
                "hidden gap-3 bg-white-05 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-05 md:grid",
                fieldPolicy.showStatus
                  ? "grid-cols-[110px_minmax(170px,1fr)_116px_20px]"
                  : "grid-cols-[110px_minmax(170px,1fr)_20px]",
              )}>
                <span>Period</span>
                <span>Lesson</span>
                {fieldPolicy.showStatus && <span>Status</span>}
                <span />
              </div>

              {visibleLessons.length > 0 ? (
                <ul className="max-h-[42rem] divide-y divide-border overflow-y-auto overscroll-contain">
                  {visibleLessons.map((row) => (
                    <li key={row.slot_id}>
                      <LessonQueueRow
                        row={row}
                        selected={row.slot_id === focused?.slot_id}
                        showStatus={fieldPolicy.showStatus}
                        showSubmittedAt={fieldPolicy.showSubmittedAt}
                        date={date}
                        onSelect={() => selectLesson(row)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid min-h-56 place-items-center p-6 text-center">
                  <div>
                    <Search className="mx-auto size-7 text-gray-05" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium text-black-01">No matching lessons</p>
                    <p className="mt-1 text-xs text-gray-06">Try another class, subject, teacher or status.</p>
                  </div>
                </div>
              )}

              <div className="border-t border-border px-4 py-3 text-xs text-gray-05">
                Showing {visibleLessons.length} of {lessons.length} scheduled lessons
              </div>
            </Panel>

            <div id="lesson-register-focus" className="min-w-0 scroll-mt-5 xl:sticky xl:top-5">
              {focused ? (
                <LessonFocus
                  row={focused}
                  register={registerQuery.data?.data}
                  loading={registerQuery.isLoading || registerQuery.isFetching}
                  error={registerQuery.isError}
                  retry={() => registerQuery.refetch()}
                  date={date}
                  policy={fieldPolicy}
                />
              ) : (
                <Panel className="grid min-h-60 place-content-center p-6 text-center">
                  <BookOpen className="mx-auto size-8 text-gray-05" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-black-01">No lesson selected</p>
                  <p className="mt-1 text-sm text-gray-05">Clear the search or choose another filter.</p>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}

function LessonMarkingOff() {
  const { hasPermission } = usePermissions();
  const canTurnOn = hasPermission(P.MANAGE_ATTENDANCE_SETTINGS);
  return (
    <OutlinedNotice
      icon={ClipboardList}
      title="No level marks its lessons"
      body="Every class has one register a day. Lesson marking is switched on a level at a time, in Settings under Attendance."
      {...(canTurnOn
        ? { actionLabel: "Open attendance settings", actionTo: routesPath.PROTECTED.SETTINGS.ATTENDANCE }
        : {})}
    />
  );
}

function LessonSummary({
  total,
  summary,
  showStatus,
}: {
  total: number;
  summary: ReturnType<typeof summarizeLessons>;
  showStatus: boolean;
}) {
  const cards = [
    { label: "Scheduled lessons", value: total, detail: "For this day", icon: BookOpen, tone: "blue" },
    ...(showStatus ? [
      { label: "Submitted", value: summary.submitted, detail: "Registers completed", icon: CheckCircle2, tone: "green" },
      { label: "In progress", value: summary.inProgress, detail: "Started or ready", icon: Clock3, tone: "amber" },
      { label: "Not started", value: summary.notStarted, detail: "Need follow-up", icon: AlertTriangle, tone: "red" },
    ] : []),
  ];

  return (
    <section
      aria-label="Lesson register summary"
      className={cn(
        "grid min-w-0 gap-3",
        cards.length === 1 ? "grid-cols-1 sm:max-w-xs" : "grid-cols-2 xl:grid-cols-4",
      )}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Panel key={card.label} className="flex min-w-0 items-center gap-3 p-3.5">
            <span className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg",
              card.tone === "blue" && "bg-blue-50 text-blue-700",
              card.tone === "green" && "bg-emerald-50 text-emerald-700",
              card.tone === "amber" && "bg-amber-50 text-amber-700",
              card.tone === "red" && "bg-rose-50 text-rose-700",
            )}>
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-gray-06">{card.label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-gray-05">{card.detail}</span>
            </span>
            <strong className="font-mont text-2xl font-semibold tracking-tight text-black-01">{card.value}</strong>
          </Panel>
        );
      })}
    </section>
  );
}

function LessonQueueRow({
  row,
  selected,
  showStatus,
  showSubmittedAt,
  date,
  onSelect,
}: {
  row: LessonListRow;
  selected: boolean;
  showStatus: boolean;
  showSubmittedAt: boolean;
  date: string;
  onSelect: () => void;
}) {
  const { formatTime } = useSchoolDisplay();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.995]",
        "hover:bg-primary/5 md:grid-cols-[110px_minmax(170px,1fr)_116px_20px]",
        !showStatus && "md:grid-cols-[110px_minmax(170px,1fr)_20px]",
        selected && "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-black-01">{row.period_label}</span>
        <span className="mt-0.5 block text-xs text-gray-05">
          {formatTime(row.start_time)} to {formatTime(row.end_time)}
        </span>
      </span>
      <span className="min-w-0 md:col-start-2">
        <span className="block truncate text-sm font-medium text-black-01">{row.subject}</span>
        <span className="mt-0.5 block truncate text-xs text-gray-05">
          {[row.school_class.name, row.teacher_name ?? "No teacher", row.branch?.name].filter(Boolean).join(" · ")}
        </span>
      </span>
      {showStatus && (
        <span className="col-span-2 flex items-center md:col-span-1 md:col-start-3">
          <LessonStatus row={row} showSubmittedAt={showSubmittedAt} date={date} />
        </span>
      )}
      <ChevronRight
        className="col-start-2 row-start-1 size-4 justify-self-end text-gray-05 transition-transform group-hover:translate-x-0.5 md:col-start-auto md:row-start-auto"
        aria-hidden="true"
      />
    </button>
  );
}

function LessonFocus({
  row,
  register,
  loading,
  error,
  retry,
  date,
  policy,
}: {
  row: LessonListRow;
  register?: LessonRegister;
  loading: boolean;
  error: boolean;
  retry: () => void;
  date: string;
  policy: ReturnType<typeof lessonDirectoryFieldPolicy>;
}) {
  const { formatTime } = useSchoolDisplay();
  const rows = register?.rows ?? [];
  const preview = rows.slice(0, 3);
  const counts = policy.showCounts ? register?.counts : undefined;
  const markable = rows.filter((student) => !student.locked).length;
  const marked = counts
    ? counts.present + counts.late + counts.absent
    : rows.filter((student) => !student.locked && student.mark).length;
  const percent = markable > 0 ? Math.round((marked / markable) * 100) : 0;

  return (
    <Panel className="overflow-hidden">
      <div className="bg-primary/[0.055] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {policy.showStatus && <LessonStatus row={row} showSubmittedAt={policy.showSubmittedAt} date={date} />}
          <span className="text-xs text-gray-05">{formatTime(row.start_time)} to {formatTime(row.end_time)}</span>
        </div>
        <div className="mt-4 flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-gray-05">{row.period_label}</p>
            <h2 className="truncate font-mont text-lg font-semibold text-black-01">{row.subject}</h2>
            <p className="truncate text-xs text-gray-05">
              {[row.school_class.name, row.branch?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3 rounded-md border border-border p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white-05 text-primary">
            <Users className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-gray-05">Lesson teacher</span>
            <span className="block truncate text-sm font-medium text-black-01">{row.teacher_name ?? "No teacher"}</span>
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-44 rounded-md" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-white-05 p-4 text-sm text-gray-06">
            <p>We could not load this lesson preview.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={retry}>Try again</Button>
          </div>
        ) : register ? (
          <>
            {counts && (
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-mont text-2xl font-semibold text-black-01">{percent}%</p>
                    <p className="text-xs text-gray-05">Register complete</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-black-01">{marked}/{markable}</p>
                    <p className="text-xs text-gray-05">Students marked</p>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white-05">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border sm:grid-cols-4">
                  <Count label="Present" value={counts.present} tone="text-emerald-700" />
                  <Count label="Late" value={counts.late} tone="text-amber-700" />
                  <Count label="Absent" value={counts.absent} tone="text-rose-700" />
                  <Count label="Unmarked" value={counts.unmarked} />
                </div>
              </div>
            )}

            {preview.length > 0 && (policy.showMark || policy.showMorningMark) && (
              <div className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-black-01">Student preview</h3>
                  <span className="text-xs text-gray-05">First {preview.length} of {rows.length}</span>
                </div>
                <ul className="mt-2 divide-y divide-border">
                  {preview.map((student) => (
                    <li key={student.student_id} className="flex min-w-0 items-center gap-2 py-2.5">
                      <PersonAvatar name={student.name} className="size-8 shrink-0" textClassName="text-[10px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-black-01">{student.name}</span>
                        {policy.showMorningMark && student.morning_mark !== undefined && (
                          <span className="mt-0.5 block text-[11px] text-gray-05">
                            Morning: {markLabel(student.morning_mark)}
                          </span>
                        )}
                      </span>
                      {policy.showMark && student.mark !== undefined && (
                        <MarkBadge mark={student.mark} locked={student.locked} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}

        <Button className="w-full" asChild>
          <Link to={routesPath.PROTECTED.ATTENDANCE.LESSON_ID(row.slot_id, date)}>
            Open full lesson register
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Panel>
  );
}

function LessonStatus({
  row,
  showSubmittedAt,
  date,
}: {
  row: LessonListRow;
  showSubmittedAt: boolean;
  date: string;
}) {
  const fmt = useSchoolDisplay();
  if (row.status === "SUBMITTED") {
    const time = showSubmittedAt && row.submitted_at ? ` ${timeOnDay(fmt, row.submitted_at, date)}` : "";
    return <Badge variant="active" className="rounded-full">Submitted{time}</Badge>;
  }
  if (row.status === "READY") return <Badge variant="blue" className="rounded-full">Ready to submit</Badge>;
  if (row.status === "IN_PROGRESS") return <Badge variant="pending" className="rounded-full">In progress</Badge>;
  if (row.status === "CLOSED_DAY") return <Badge variant="inactive" className="rounded-full">Closed</Badge>;
  return <Badge variant="rejected" className="rounded-full">Not started</Badge>;
}

function MarkBadge({ mark, locked }: { mark?: AttendanceMark | null; locked: boolean }) {
  if (locked) return <Badge variant="inactive" className="rounded-full">Locked</Badge>;
  if (!mark) return <Badge variant="inactive" className="rounded-full">Unmarked</Badge>;
  return <Badge variant={MARKS[mark].badge} className="rounded-full">{MARKS[mark].label}</Badge>;
}

function Count({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0 border-l border-t border-border p-2.5 odd:border-l-0 first:border-t-0 [&:nth-child(2)]:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0">
      <p className="text-[10px] text-gray-05">{label}</p>
      <p className={cn("mt-1 font-semibold text-black-01", tone)}>{value}</p>
    </div>
  );
}
