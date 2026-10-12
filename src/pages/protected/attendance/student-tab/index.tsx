import { useState } from "react";
import { Link } from "react-router";
import { ClipboardList } from "lucide-react";

import KpiCard from "@/components/custom/kpi-card";
import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useSchoolWeek } from "@/hooks/use-school-week";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { useGetStudentAttendanceQuery } from "@/redux/services/attendance/attendance-api";
import type {
  StudentAttendance,
  StudentDay,
  StudentHistoryEntry,
} from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { ChoiceChips } from "../components/choice-chips";
import { MARKS, markLabel, noticeText } from "../marks";
import { termGrid } from "./term-grid";

/**
 * A student's attendance for one term, on their record.
 *
 * Every day is judged against the class the pupil was in that day, and every
 * day they were on the roll opens that class's register for the day. A grey
 * day is one no register was taken, which is not the same as the pupil being
 * away, so it is counted apart and never as an absence.
 *
 * The term defaults to the current one; the pills open any term the pupil has
 * days in. Field Access removes what the reader may not read: the mark (the
 * days then show only whether they were open, closed or not taken), the
 * counts, the reasons, the notices and the guardian's name or email.
 */
export function StudentAttendanceTab({ studentId }: { studentId: number }) {
  const [term, setTerm] = useState<number | undefined>(undefined);
  const { data, isLoading, isError, refetch } = useGetStudentAttendanceQuery({ studentId, term });
  const body = data?.data;

  if (isError) {
    return (
      <OutlinedNotice
        icon={ClipboardList}
        title="We could not load this student's attendance"
        body="Something went wrong on our side. Try again in a moment."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }
  if (isLoading || !body) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-72 w-full rounded-md" />
      </div>
    );
  }
  if (!body.term) {
    return (
      <OutlinedNotice
        icon={ClipboardList}
        title="No term to show"
        body="This student has no term with school days yet. Attendance appears here once a term begins."
      />
    );
  }
  return <TabBody body={body} term={term ?? body.term.id} onTerm={setTerm} />;
}

function TabBody({
  body,
  term,
  onTerm,
}: {
  body: StudentAttendance;
  term: number;
  onTerm: (id: number) => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const counts = !access.isHidden("counts") ? body.counts : undefined;
  const guardian = body.primary_guardian;

  return (
    <div className="grid min-w-0 gap-4">
      <Panel as="section" className="space-y-3 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-mont text-base font-semibold text-black-01">
              {body.term?.session_name} · {body.term?.name}
            </h2>
            {counts && (
              <p className="text-sm text-gray-06">
                {counts.rate == null ? "No register taken yet" : `${counts.rate}% present`}
                {` · ${counts.not_taken} day${counts.not_taken === 1 ? "" : "s"} not taken`}
              </p>
            )}
          </div>
          {guardian && (
            <div className="min-w-0 text-sm">
              <p className="text-xs text-gray-05">Primary guardian</p>
              <p className="text-black-01">
                {[guardian.name, guardian.email === null ? "no email on file" : guardian.email]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          )}
        </div>
        {body.terms.length > 1 && (
          <ChoiceChips
            ariaLabel="Term"
            options={body.terms.map((t) => ({ value: t.id, label: `${t.name} ${t.session_name}` }))}
            value={term}
            onChange={onTerm}
          />
        )}
      </Panel>

      {counts && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard label="Days present" value={counts.present} foot={`${counts.late} of them late`} />
          <KpiCard label="Days absent" value={counts.absent} foot="Unexplained" />
          <KpiCard label="Days excused" value={counts.excused} foot="With a reason" />
          <KpiCard label="Days not taken" value={counts.not_taken} foot="No register submitted" />
          <KpiCard label="School opened" value={counts.opened} foot="Days this student was expected" />
        </div>
      )}

      <DayGrid days={body.days} />
      <Absences body={body} />
      <History entries={body.history} />
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The tint of a day, by what it was. */
function dayTone(day: StudentDay): string {
  if (day.state === "MARKED") {
    if (!day.mark) return "bg-primary/10 text-primary";
    return {
      P: "bg-[#EAF3DE] text-[#3B6D11]",
      L: "bg-[#FAEEDA] text-[#854F0B]",
      A: "bg-[#FCEBEB] text-[#A32D2D]",
      E: "bg-[#E6F1FB] text-[#185FA5]",
    }[day.mark];
  }
  if (day.state === "NOT_TAKEN") return "bg-gray-100 text-gray-500";
  if (day.state === "SUSPENDED") return "bg-gray-200 text-gray-500 line-through";
  return "text-gray-300";
}

/** What a day was, in words, for its tooltip and screen readers. */
function dayTitle(day: StudentDay, formatTime: (value: string) => string): string {
  switch (day.state) {
    case "MARKED":
      return day.mark
        ? `${markLabel(day.mark)}${day.arrived_at ? ` · ${formatTime(day.arrived_at)}` : ""}`
        : "Register taken";
    case "NOT_TAKEN":
      return "No register taken";
    case "CLOSED":
      return day.closed_reason ?? "Closed";
    case "SUSPENDED":
      return "Suspended";
    default:
      return "Not on the roll";
  }
}

/**
 * The term as month calendars. A day with a register, taken or not, opens it.
 */
function DayGrid({ days }: { days: StudentDay[] }) {
  const { weekStartsOn } = useSchoolWeek();
  const { formatMonthYear, formatDay, formatTime } = useSchoolDisplay();
  const months = termGrid(days, weekStartsOn);
  const heads = Array.from({ length: 7 }, (_, i) => WEEKDAYS[(weekStartsOn + i) % 7]);

  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <div className="min-w-0">
        <h2 className="font-mont text-base font-semibold text-black-01">The term, day by day</h2>
        <p className="text-sm text-gray-06">
          A grey day is one no register was taken, which is not the same as the student being away.
          Select a day to open that day&apos;s register.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {months.map(({ month, cells }) => (
          <div key={month} className="min-w-0">
            <p className="mb-2 text-sm font-medium text-black-01">
              {formatMonthYear({ year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) }, { month: "long" })}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {heads.map((head) => (
                <span key={head} className="pb-1 text-gray-05">{head}</span>
              ))}
              {cells.map((cell) => {
                if (cell.blank) return <span key={cell.key} aria-hidden="true" />;
                const { day } = cell;
                const title = `${formatDay(day.date, { weekday: "short" })}: ${dayTitle(day, formatTime)}`;
                const tone = cn("grid h-8 place-content-center rounded-md font-medium", dayTone(day));
                const label = Number(day.date.slice(8));
                const opens = day.class_id != null && (day.state === "MARKED" || day.state === "NOT_TAKEN");
                return opens ? (
                  <Link
                    key={cell.key}
                    to={routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(day.class_id!, day.date)}
                    title={title}
                    aria-label={title}
                    className={cn(tone, "transition-shadow hover:ring-2 hover:ring-primary/40")}
                  >
                    {label}
                  </Link>
                ) : (
                  <span key={cell.key} title={title} aria-label={title} className={tone}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-06">
        {(["P", "L", "A", "E"] as const).map((mark) => (
          <span key={mark} className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", dayTone({ date: "", state: "MARKED", class_id: null, mark, closed_reason: null }))} />
            {MARKS[mark].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-gray-100" />
          Not taken
        </span>
      </div>
    </Panel>
  );
}

/** Absent and excused days, newest first, with what the guardian was told. */
function Absences({ body }: { body: StudentAttendance }) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const { formatDay, formatInstantTime } = useSchoolDisplay();
  const lessons = body.lesson_absences ?? [];

  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <h2 className="font-mont text-base font-semibold text-black-01">Absences and their reasons</h2>
      {body.absences.length === 0 ? (
        <p className="text-sm text-gray-06">No absence this term.</p>
      ) : (
        <ul className="divide-y divide-border">
          {body.absences.map((absence) => {
            const notice = noticeText(
              absence.mark,
              absence.notice_state,
              absence.notice_sent_at ? formatInstantTime(absence.notice_sent_at) : null,
            );
            const reason = [
              !access.isHidden("reason_code") ? absence.reason_label : null,
              !access.isHidden("note") ? absence.note : null,
            ].filter(Boolean).join(" · ");
            return (
              <li key={absence.date} className="grid min-w-0 gap-1 py-2.5 sm:grid-cols-[8rem_auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                <span className="text-sm text-black-01">{formatDay(absence.date, { weekday: "short" })}</span>
                {absence.mark && (
                  <Badge variant={MARKS[absence.mark].badge} className="w-fit rounded-full">
                    {MARKS[absence.mark].label}
                  </Badge>
                )}
                <span className="min-w-0 text-sm text-gray-06">{reason || "No reason given"}</span>
                {!access.isHidden("notice_state") && (
                  <span className={cn("text-xs", notice.warn ? "font-medium text-error-text" : "text-gray-05")}>
                    {notice.text}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {lessons.length > 0 && (
        <div className="space-y-2 rounded-md bg-white-05 px-4 py-3">
          <p className="text-sm font-medium text-black-01">Lesson absences, listed separately</p>
          <ul className="space-y-1 text-sm text-gray-06">
            {lessons.map((lesson) => (
              <li key={`${lesson.date}-${lesson.period_label}`}>
                {formatDay(lesson.date, { weekday: "short" })}: {lesson.period_label} · {lesson.subject}
                {lesson.morning_mark ? `, absent though ${markLabel(lesson.morning_mark).toLowerCase()} in the morning register` : ", absent"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/** Every mark that changed: same-day changes and decided corrections. Nothing is deleted. */
function History({ entries }: { entries: StudentHistoryEntry[] }) {
  const { formatDay, formatDateTime } = useSchoolDisplay();
  if (entries.length === 0) return null;
  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="font-mont text-base font-semibold text-black-01">Every mark that changed</h2>
        <p className="text-sm text-gray-06">Same-day changes and decided corrections. Nothing here is ever deleted.</p>
      </div>
      <ul className="space-y-2.5">
        {entries.map((entry, index) => (
          <li key={`${entry.kind}-${entry.at}-${index}`} className="grid min-w-0 gap-0.5 text-sm sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
            <span className="text-gray-05">{formatDateTime(entry.at)}</span>
            <span className="min-w-0 text-gray-06">{historyText(entry, formatDay)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function historyText(entry: StudentHistoryEntry, formatDay: (iso: string) => string): string {
  const change =
    entry.to_mark !== undefined ? `${markLabel(entry.from_mark)} → ${markLabel(entry.to_mark)}` : "Mark changed";
  const day = formatDay(entry.date);
  if (entry.kind === "change") {
    const how = entry.via === "SAME_DAY" ? "the same day" : "by an approved correction";
    return `${day}: ${change}, by ${entry.changed_by_name}, ${how}.${entry.note ? ` ${sentence(entry.note)}` : ""}`;
  }
  const decided = entry.status === "REJECTED" ? "rejected" : "approved";
  return [
    `${day}: ${change}`,
    entry.requested_by_name ? `requested by ${entry.requested_by_name}` : null,
    entry.decided_by_name ? `${decided} by ${entry.decided_by_name}` : decided,
  ].filter(Boolean).join(", ")
    + "."
    + (entry.reason_label || entry.note ? ` Reason: ${sentence([entry.reason_label, entry.note].filter(Boolean).join(", "))}` : "")
    + (entry.decision_note ? ` Decision: ${sentence(entry.decision_note)}` : "");
}

/** Text ending in exactly one full stop, whether or not it was typed with one. */
function sentence(text: string): string {
  return `${text.trim().replace(/[.\s]+$/, "")}.`;
}
