import type { ReactNode } from "react";
import { Link } from "react-router";
import { CalendarClock, TrendingDown, UserRoundCheck } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useGetClassChronicQuery,
  useGetCorrectionsQuery,
  useGetRegisterQuery,
} from "@/redux/services/attendance/attendance-api";
import type { CorrectionRow, NextLesson, TeacherClassCard } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { MARKS, noticeText } from "@/pages/protected/attendance/marks";
import { timeOnDay } from "@/pages/protected/attendance/time-on-day";
import { TeacherHub } from "@/pages/protected/attendance/today/teacher-hub";

import { useTeacherDay } from "./use-teacher-day";

/**
 * The teaching cards at the top of an active teacher's dashboard.
 *
 * "Your day": the next lesson on their timetable, then their registers and
 * lessons for today. "Your class": for each class they lead, who is absent
 * today and who is slipping this term; then the corrections they asked for.
 * Nothing renders for anybody who is not an active teacher.
 */
export function TeacherDayCards() {
  const { active, loading, day } = useTeacherDay();
  const corrections = useMyCorrections(active);
  if (loading) return <Skeleton className="h-36 w-full rounded-3xl" />;
  if (!active || !day) return null;
  const leads = day.classes.length;
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Eyebrow>Your day</Eyebrow>
        <div className="grid gap-3">
          {day.next_lesson && <NextLessonCard lesson={day.next_lesson} />}
          <TeacherHub hub={day} />
        </div>
      </div>
      {(leads > 0 || corrections.any) && (
        <div className="min-w-0 space-y-2">
          <Eyebrow>{leads === 0 ? "Your requests" : leads === 1 ? "Your class" : "Your classes"}</Eyebrow>
          <div className="grid gap-3">
            {day.classes.map((card) => (
              <div key={card.class_id} className="grid gap-3">
                {!day.closed && <AbsentFromClass card={card} date={day.date} />}
                <SlippingInClass classId={card.class_id} className={card.class_name} />
              </div>
            ))}
            {corrections.any && <YourCorrections waiting={corrections.waiting} done={corrections.done} />}
          </div>
        </div>
      )}
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{children}</p>;
}

/** Where the reader teaches next, from their published timetable. */
function NextLessonCard({ lesson }: { lesson: NextLesson }) {
  const { formatTime, formatDay } = useSchoolDisplay();
  const when = lesson.is_today
    ? `Today at ${formatTime(lesson.start_time)}`
    : `${formatDay(lesson.date, { weekday: "short", year: false })} at ${formatTime(lesson.start_time)}`;
  return (
    <Panel as="section" className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <CalendarClock className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-05">Next lesson · {when}</p>
        <h2 className="font-mont text-base font-semibold text-black-01">
          {lesson.subject} · {lesson.class_name}
        </h2>
        <p className="text-xs text-gray-05">
          {[
            `${lesson.period_label}, ${formatTime(lesson.start_time)} to ${formatTime(lesson.end_time)}`,
            lesson.room_name,
            lesson.branch_name,
          ].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Panel>
  );
}

/**
 * The pupils of one class below the school's chronic-absence line this term,
 * lowest first, each opening their attendance. Counted from the days they
 * spent in this class. Nothing renders when the reader's role may not read
 * the figures.
 */
function SlippingInClass({ classId, className }: { classId: number; className: string }) {
  const { hasPermission } = usePermissions();
  const { data, isLoading } = useGetClassChronicQuery({ classId });
  const body = data?.data;
  if (isLoading) return <Skeleton className="h-24 w-full rounded-md" />;
  if (!body || !body.chronic) return null;
  const rows = body.chronic;
  const canOpen = hasPermission(P.BROWSE_STUDENTS);
  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <TrendingDown className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-mont text-base font-semibold text-black-01">Slipping in {className}</h2>
          <p className="text-xs text-gray-05">
            {rows.length === 0
              ? `Nobody is below ${body.threshold}% this ${body.term ? body.term.name.toLowerCase() : "term"}.`
              : `Below ${body.threshold}% this ${body.term ? body.term.name.toLowerCase() : "term"}, the line your school set.`}
          </p>
        </div>
      </div>
      {rows.length > 0 && (
        <ul className="divide-y divide-border">
          {rows.slice(0, 5).map((row) => (
            <li key={row.student.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                {canOpen ? (
                  <Link
                    to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student.id)}?tab=attendance`}
                    className="truncate font-medium text-primary hover:underline"
                  >
                    {row.student.name}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-black-01">{row.student.name}</span>
                )}
              </span>
              <span className="text-sm font-semibold text-black-01">{row.rate.toFixed(1)}%</span>
              <span className="text-xs text-gray-05">{daysAway(row.absent, row.excused)}</span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 5 && <p className="text-xs text-gray-05">And {rows.length - 5} more.</p>}
    </Panel>
  );
}

/** Both kinds of day away lower the rate, so both are named. */
function daysAway(absent: number, excused: number): string {
  const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  if (excused === 0) return `${days(absent)} absent`;
  if (absent === 0) return `${days(excused)} excused`;
  return `${absent} absent, ${excused} excused`;
}

/**
 * The corrections the reader asked for: those still waiting, and the three
 * most recently decided. Read only for an active teacher whose role may ask.
 */
function useMyCorrections(active: boolean) {
  const { hasPermission } = usePermissions();
  const asks = active && hasPermission(P.REQUEST_ATTENDANCE_CORRECTION);
  const pending = useGetCorrectionsQuery({ status: "pending" }, { skip: !asks });
  const decided = useGetCorrectionsQuery({ status: "decided" }, { skip: !asks });
  const waiting = (pending.data?.data ?? []).filter((row) => row.is_mine);
  const done = (decided.data?.data ?? []).filter((row) => row.is_mine).slice(0, 3);
  return { waiting, done, any: asks && (waiting.length > 0 || done.length > 0) };
}

/** How many of the reader's corrections still wait, and the latest decided, with the decision. */
function YourCorrections({ waiting, done }: { waiting: CorrectionRow[]; done: CorrectionRow[] }) {
  const { formatDay } = useSchoolDisplay();
  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h2 className="font-mont text-base font-semibold text-black-01">Your corrections</h2>
        <Link to={routesPath.PROTECTED.ATTENDANCE.CORRECTIONS} className="shrink-0 text-xs font-semibold text-primary hover:underline">
          All corrections
        </Link>
      </div>
      {waiting.length > 0 && (
        <p className="text-sm text-gray-06">
          {waiting.length} waiting for an administrator&apos;s decision.
        </p>
      )}
      {done.length > 0 && (
        <ul className="divide-y divide-border">
          {done.map((row) => (
            <li key={row.id} className="min-w-0 space-y-1 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-black-01">{row.student.name}</span>
                {row.status === "APPROVED" && <Badge variant="active" className="rounded-full">Approved</Badge>}
                {row.status === "REJECTED" && <Badge variant="rejected" className="rounded-full">Rejected</Badge>}
              </div>
              <p className="text-xs text-gray-05">
                {formatDay(row.date, { weekday: "short", year: false })}
                {row.from_mark && row.to_mark ? ` · ${MARKS[row.from_mark].label} → ${MARKS[row.to_mark].label}` : ""}
              </p>
              {row.decision_note && <p className="text-xs text-gray-05">&ldquo;{row.decision_note}&rdquo;</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Who is absent from one class the reader leads, today.
 *
 * Read from the class's own register, so it says nothing until the register
 * is submitted: before that a missing mark is not an absence. Each child opens
 * their attendance, and each says whether their guardian was told.
 */
function AbsentFromClass({ card, date }: { card: TeacherClassCard; date: string }) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const { hasPermission } = usePermissions();
  const fmt = useSchoolDisplay();
  const { data, isLoading } = useGetRegisterQuery({ classId: card.class_id, date });
  const register = data?.data;
  const absent = (register?.rows ?? []).filter((row) => row.mark === "A" || row.mark === "E");
  const submitted = register?.status === "SUBMITTED";
  const canOpen = hasPermission(P.BROWSE_STUDENTS);

  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <UserRoundCheck className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-mont text-base font-semibold text-black-01">Absent from {card.class_name} today</h2>
          <p className="text-xs text-gray-05">
            {isLoading
              ? "Checking the register…"
              : !submitted
                ? "Shown once the register is submitted."
                : absent.length === 0
                  ? "Everyone is in school."
                  : `${absent.length} of ${register?.counts?.total ?? register?.rows.length} not in school.`}
          </p>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-12 w-full rounded-md" />
      ) : !submitted ? (
        <Link
          to={routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(card.class_id)}
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Take the register
        </Link>
      ) : absent.length > 0 && !access.isHidden("mark") ? (
        <ul className="divide-y divide-border">
          {absent.map((row) => {
            const notice = noticeText(
              row.mark ?? undefined,
              row.notice_state,
              row.notice_sent_at ? timeOnDay(fmt, row.notice_sent_at, date) : null,
            );
            const name = canOpen ? (
              <Link
                to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student_id)}?tab=attendance`}
                className="truncate font-medium text-primary hover:underline"
              >
                {row.name}
              </Link>
            ) : (
              <span className="truncate font-medium text-black-01">{row.name}</span>
            );
            return (
              <li key={row.student_id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="min-w-0 basis-full sm:basis-auto sm:flex-1">{name}</span>
                {row.mark && (
                  <Badge variant={MARKS[row.mark].badge} className="rounded-full">{MARKS[row.mark].label}</Badge>
                )}
                {!access.isHidden("notice_state") && (
                  <span className={notice.warn ? "text-xs font-medium text-error-text" : "text-xs text-gray-05"}>
                    {notice.text}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Panel>
  );
}
