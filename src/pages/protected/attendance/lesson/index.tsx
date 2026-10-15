import { useState } from "react";
import { useParams } from "react-router";
import { ClipboardList, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useFillLessonPresentMutation,
  useGetLessonRegisterQuery,
  useGetMyAttendanceTodayQuery,
  useSetLessonMarkMutation,
  useSubmitLessonRegisterMutation,
} from "@/redux/services/attendance/attendance-api";
import type {
  AttendanceMark,
  LessonRegister,
  LessonRow,
} from "@/redux/services/attendance/attendance-types";
import { writeErrorMessage } from "@/utils/api-error";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { ClosedDayNotice } from "../components/closed-day-notice";
import { DayPicker } from "../components/day-picker";
import { MARKS, markLabel } from "../marks";
import { SubmitBar } from "../register";
import { LateArrivalDrawer } from "../register/mark-drawers";
import { RegisterRowItem, type RowMode } from "../register/register-rows";
import { useAttendanceDay } from "../use-attendance-day";
import { timeOnDay } from "../time-on-day";

const LESSON_MARKS: AttendanceMark[] = ["P", "L", "A"];

/**
 * One lesson's register for one day.
 *
 * Present, Late or Absent, with each child's morning mark beside the row. It
 * has no Excused, sends nothing to anyone, and has no correction request:
 * rows change in place while the school's edit window is open, and after that
 * the lesson's marks are frozen. A child present in the morning and absent
 * here is listed as having missed a lesson; neither mark overwrites the other.
 *
 * The lesson's timetable teacher marks it, and so does a reader who takes any
 * class's register; whether this reader teaches it is read from their own
 * Today list. A day the lesson does not happen, a level with lesson marking
 * off or an unpublished timetable is refused by the server, and its sentence
 * is shown as it is.
 */
export default function LessonRegisterPage() {
  const { slotId: raw } = useParams();
  const slotId = Number(raw);
  const { date, today, setDate } = useAttendanceDay();
  const { data, isLoading, isError, error, refetch } = useGetLessonRegisterQuery(
    { slotId, date },
    { skip: !Number.isFinite(slotId) },
  );
  const register = data?.data;

  return (
    <PageShell className="content-start gap-4 pb-28" grid>
      {isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="This lesson has no register to show"
          body={writeErrorMessage(error, "Something went wrong on our side. Try again in a moment.")}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !register ? (
        <>
          <Skeleton className="h-36 w-full rounded-md" />
          <Skeleton className="h-96 w-full rounded-md" />
        </>
      ) : (
        <LessonBody register={register} date={date} today={today} setDate={setDate} />
      )}
    </PageShell>
  );
}

function LessonBody({
  register,
  date,
  today,
  setDate,
}: {
  register: LessonRegister;
  date: string;
  today: string;
  setDate: (next: string) => void;
}) {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_LESSON);
  const [late, setLate] = useState<LessonRow | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [setMark, markState] = useSetLessonMarkMutation();
  const [fillPresent, fillState] = useFillLessonPresentMutation();
  const [submit, submitState] = useSubmitLessonRegisterMutation();

  const slotId = register.lesson.slot_id;
  const key = { slotId, date };
  const takesAny = hasPermission(P.TAKE_ANY_REGISTER);
  // A teacher's right to mark rests on their own Today list; until it has
  // answered, the register is not shown rather than shown read-only.
  const { data: mine, isLoading: mineLoading } = useGetMyAttendanceTodayQuery(
    { date: date === today ? undefined : date },
    { skip: takesAny || !hasPermission(P.TAKE_OWN_REGISTER) },
  );
  const teaches = !!mine?.data.lessons?.some((card) => card.slot_id === slotId);
  const mayMark = takesAny || (hasPermission(P.TAKE_OWN_REGISTER) && teaches);

  const submitted = register.status === "SUBMITTED";
  const frozen = submitted && register.edit_window_open === false;
  const mode: RowMode =
    !register.closed && mayMark && !frozen && !access.isHidden("mark") && !access.isReadOnly("mark")
      ? "mark"
      : "read";
  const marks = LESSON_MARKS.filter((mark) => mark !== "L" || !access.isReadOnly("arrived_at"));
  const unmarked =
    register.counts?.unmarked ?? register.rows.filter((row) => !row.locked && !row.mark).length;
  const markable = register.rows.filter((row) => !row.locked).length;
  const title = `${register.lesson.period_label} · ${register.lesson.subject}`;

  const onMark = (row: LessonRow, mark: AttendanceMark) => {
    if (mark === "L") return setLate(row);
    if (row.mark === mark || mark === "E") return;
    void setMark({ ...key, studentId: row.student_id, body: { mark } });
  };

  const onFill = async () => {
    const result = await fillPresent(key);
    if ("error" in result || !result.data) return;
    const filled = result.data.data.filled;
    toast.success(filled ? `${filled} marked Present` : "Nothing left to fill", {
      description: filled ? "Nothing has been submitted yet." : "Every row already carries a mark.",
    });
  };

  const onSubmit = async () => {
    const result = await submit(key);
    setConfirming(false);
    if ("error" in result) return;
    toast.success(`${title} submitted`, { description: "A lesson register sends nothing to anyone." });
  };

  if (mineLoading) return <>
        <Skeleton className="h-36 w-full rounded-md" />
        <Skeleton className="h-96 w-full rounded-md" />
      </>;

  return (
    <>
      <LessonHeader register={register} date={date} today={today} setDate={setDate} />

      {register.closed ? (
        <ClosedDayNotice closed={register.closed} dateLabel={register.date_label} />
      ) : register.roster_empty ? (
        <OutlinedNotice
          icon={UsersRound}
          title="No register to take"
          body="No student is placed in this class on this day, so there is no register to take."
        />
      ) : (
        <>
          {mode === "mark" && unmarked > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => void onFill()} disabled={fillState.isLoading}>
                Everyone else present
              </Button>
              <span className="text-sm text-gray-06">
                {unmarked} of {markable} still unmarked
              </span>
            </div>
          )}

          <Panel as="section" className="overflow-hidden">
            <ul className="divide-y divide-border">
              {register.rows.map((row) => (
                <RegisterRowItem
                  key={row.student_id}
                  row={row}
                  mode={mode}
                  marks={marks}
                  offered={LESSON_MARKS}
                  fieldResource={FIELD_RESOURCE.ATTENDANCE_LESSON}
                  aside={!row.locked && row.morning_mark !== undefined ? <MorningMark mark={row.morning_mark} /> : null}
                  busy={markState.isLoading && markState.originalArgs?.studentId === row.student_id}
                  onMark={(mark) => onMark(row, mark)}
                />
              ))}
            </ul>
          </Panel>

          <LessonHistory register={register} />

          {mode === "mark" && !submitted && (
            <SubmitBar
              unmarked={unmarked}
              note="A lesson register sends nothing to anyone."
              busy={submitState.isLoading}
              onSubmit={() => setConfirming(true)}
            />
          )}
        </>
      )}

      {late && (
        <LateArrivalDrawer
          name={late.name}
          subtitle={`${late.name} · ${title}`}
          arrivedAt={late.mark === "L" ? late.arrived_at : null}
          note={late.note}
          fieldResource={FIELD_RESOURCE.ATTENDANCE_LESSON}
          onSave={async (body) =>
            !("error" in (await setMark({ ...key, studentId: late.student_id, body: { mark: "L", ...body } })))
          }
          onClose={() => setLate(null)}
        />
      )}
      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onSubmit()}
        title="Submit this lesson register?"
        body="A lesson register sends nothing to anyone. Rows can still be changed until the register closes."
        confirmLabel="Submit register"
        busy={submitState.isLoading}
      />
    </>
  );
}

/** The class register's mark that morning, beside the lesson's own. */
function MorningMark({ mark }: { mark: AttendanceMark | null }) {
  return (
    <span className="mt-1 flex items-center gap-1.5 text-xs text-gray-05">
      Morning register
      <Badge variant={mark ? MARKS[mark].badge : "inactive"} className="rounded-full py-0 text-[11px]">
        {markLabel(mark)}
      </Badge>
    </span>
  );
}

function LessonHeader({
  register,
  date,
  today,
  setDate,
}: {
  register: LessonRegister;
  date: string;
  today: string;
  setDate: (next: string) => void;
}) {
  const fmt = useSchoolDisplay();
  const { formatDay, formatTime } = fmt;
  const takenBy = register.taken_by;
  const time = takenBy ? timeOnDay(fmt, takenBy.submitted_at, date) : "";
  const status = register.status === "SUBMITTED"
    ? { text: `Submitted ${time}`, variant: "active" as const }
    : register.status === "CLOSED_DAY"
      ? { text: "No register", variant: "inactive" as const }
      : register.status
        ? { text: register.status === "READY" ? "Ready to submit" : register.status === "IN_PROGRESS" ? "In progress" : "Not started", variant: "pending" as const }
        : null;
  let takenLine = takenBy ? `Submitted ${time} by ${takenBy.submitted_by}.` : null;
  if (takenLine && register.edit_window_open === false) takenLine += " The lesson's marks are now final.";
  else if (takenLine && register.edit_window_open) takenLine += " Rows can still be changed until the register closes.";

  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Lesson register</p>
          <h1 className="mt-1 font-mont text-2xl font-semibold tracking-tight text-black-01 sm:text-3xl">
            {register.lesson.period_label} · {register.lesson.subject}
          </h1>
          <p className="mt-1 text-sm text-gray-06">
            {[
              register.school_class.name,
              formatDay(date, { weekday: "long", month: "long" }),
              `${formatTime(register.lesson.start_time)} to ${formatTime(register.lesson.end_time)}`,
            ].join(" · ")}
          </p>
        </div>
        <DayPicker date={date} today={today} onChange={setDate} />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-xs text-gray-05">Lesson teacher</dt>
          <dd className="mt-1 truncate text-sm font-medium text-black-01">{register.lesson.teacher_name ?? "No teacher"}</dd>
        </div>
        {register.counts && (
          <div className="min-w-0">
            <dt className="text-xs text-gray-05">Students</dt>
            <dd className="mt-1 text-sm font-medium text-black-01">{register.counts.total}</dd>
          </div>
        )}
        {status && (
          <div className="min-w-0">
            <dt className="text-xs text-gray-05">Status</dt>
            <dd className="mt-1"><Badge variant={status.variant} className="rounded-full">{status.text}</Badge></dd>
          </div>
        )}
      </dl>
      {takenLine && <p className="text-sm text-gray-06">{takenLine}</p>}
    </Panel>
  );
}

function LessonHistory({ register }: { register: LessonRegister }) {
  const { formatInstantTime } = useSchoolDisplay();
  if (register.history.length === 0) return null;
  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <h2 className="font-mont text-base font-semibold text-black-01">Changes to this register</h2>
      <ul className="space-y-2">
        {register.history.map((change, index) => (
          <li key={`${change.student_id}-${change.changed_at}-${index}`} className="flex min-w-0 gap-3 text-sm">
            <span className="w-16 shrink-0 text-gray-05">{formatInstantTime(change.changed_at)}</span>
            <span className="min-w-0 text-gray-06">
              {change.student_name}
              {change.to_mark !== undefined
                ? ` changed from ${markLabel(change.from_mark)} to ${markLabel(change.to_mark)}`
                : " changed"}
              {` by ${change.changed_by_name}.`}
              {change.note ? ` ${change.note}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
