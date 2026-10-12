import { useState } from "react";
import { useParams } from "react-router";
import { ClipboardList, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useFillPresentMutation,
  useGetMyAttendanceTodayQuery,
  useGetRegisterQuery,
  useSetMarkMutation,
  useSubmitRegisterMutation,
} from "@/redux/services/attendance/attendance-api";
import type {
  AttendanceMark,
  Register,
  RegisterRow,
  RegisterStatus,
} from "@/redux/services/attendance/attendance-types";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { ClosedDayNotice } from "../components/closed-day-notice";
import { DayPicker } from "../components/day-picker";
import { markLabel } from "../marks";
import { useAttendanceDay } from "../use-attendance-day";
import { MarkDrawers, type MarkDrawer } from "./mark-drawers";
import { RegisterRowItem, type RowMode } from "./register-rows";
import { submitBarNote, submitConfirmText, submittedText } from "./submit-text";

/**
 * One class's morning register for one day.
 *
 * Who may do what is the server's rule, mirrored here so a control is offered
 * only where it would be accepted:
 *
 * - **Marking.** A holder of `mark_any` takes any class's register; a holder
 *   of `mark` takes only the class they lead, which is read from their own
 *   Today list rather than guessed from a name.
 * - **After submission**, rows change in place while the school's edit window
 *   is open (`edit_window_open`), and the server further limits that to the
 *   person who submitted or a `mark_any` holder. Once the window has closed a
 *   row changes only through a correction request, offered to the same two
 *   kinds of reader when they also hold the correction key.
 * - **A closed day** has no register, and says why.
 *
 * Field Access narrows each of these. A reader who may not write the mark sees
 * chips, not buttons; Late needs the arrival time to be writable and Excused
 * the reason, so either button is withheld when its field is not.
 */
export default function ClassRegister() {
  const { classId: rawId } = useParams();
  const classId = Number(rawId);
  const { date, today, setDate } = useAttendanceDay();
  const { data, isLoading, isError, refetch } = useGetRegisterQuery(
    { classId, date },
    { skip: !Number.isFinite(classId) },
  );
  const register = data?.data;

  return (
    <PageShell className="content-start gap-4 pb-28" grid>
      {isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="We could not open this register"
          body="The class may be in a branch you do not work in, or something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !register ? (
        <RegisterSkeleton />
      ) : (
        <RegisterBody register={register} date={date} today={today} setDate={setDate} />
      )}
    </PageShell>
  );
}

function RegisterBody({
  register,
  date,
  today,
  setDate,
}: {
  register: Register;
  date: string;
  today: string;
  setDate: (next: string) => void;
}) {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const [drawer, setDrawer] = useState<MarkDrawer | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [setMark, markState] = useSetMarkMutation();
  const [fillPresent, fillState] = useFillPresentMutation();
  const [submit, submitState] = useSubmitRegisterMutation();

  const classId = register.school_class.id;
  const key = { classId, date };
  const takesAny = hasPermission(P.TAKE_ANY_REGISTER);
  const { data: mine } = useGetMyAttendanceTodayQuery(
    { date: date === today ? undefined : date },
    { skip: takesAny || !hasPermission(P.TAKE_OWN_REGISTER) },
  );
  const leads = !!mine?.data.classes.some((card) => card.class_id === classId);
  const mayTake = takesAny || (hasPermission(P.TAKE_OWN_REGISTER) && leads);
  const mayAskCorrection =
    hasPermission(P.REQUEST_ATTENDANCE_CORRECTION) && (takesAny || leads);

  const submitted = register.status === "SUBMITTED";
  const windowShut = submitted && register.edit_window_open === false;
  const markWritable = !access.isHidden("mark") && !access.isReadOnly("mark");
  const mode: RowMode =
    !register.closed && mayTake && markWritable && !windowShut
      ? "mark"
      : windowShut && mayAskCorrection
        ? "correct"
        : "read";
  const marks: AttendanceMark[] = [
    "P",
    ...(access.isReadOnly("arrived_at") ? [] : (["L"] as const)),
    "A",
    ...(access.isReadOnly("reason_code") ? [] : (["E"] as const)),
  ];

  const unmarked =
    register.counts?.unmarked ?? register.rows.filter((row) => !row.locked && !row.mark).length;
  const markable = register.rows.filter((row) => !row.locked).length;

  const onMark = (row: RegisterRow, mark: AttendanceMark) => {
    if (mark === "L") return setDrawer({ kind: "late", row });
    if (mark === "E") return setDrawer({ kind: "excused", row });
    if (row.mark === mark) return;
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
    const preview = register.submit_preview;
    const result = await submit(key);
    setConfirming(false);
    if ("error" in result) return;
    toast.success(`${register.school_class.name} register submitted`, {
      description: submittedText(preview),
    });
  };

  return (
    <>
      <RegisterHeader register={register} date={date} today={today} setDate={setDate} />

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
                  busy={markState.isLoading && markState.originalArgs?.studentId === row.student_id}
                  onMark={(mark) => onMark(row, mark)}
                  onRequestCorrection={() => setDrawer({ kind: "correction", row })}
                />
              ))}
            </ul>
          </Panel>

          <History register={register} />

          {mode === "mark" && !submitted && (
            <SubmitBar
              unmarked={unmarked}
              note={submitBarNote(register.submit_preview)}
              busy={submitState.isLoading}
              onSubmit={() => setConfirming(true)}
            />
          )}
        </>
      )}

      <MarkDrawers
        drawer={drawer}
        register={key}
        dateLabel={register.date_label}
        onClose={() => setDrawer(null)}
      />
      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onSubmit()}
        title="Submit this register?"
        body={submitConfirmText(register.submit_preview)}
        confirmLabel="Submit register"
        busy={submitState.isLoading}
      />
    </>
  );
}

const STATUS_CHIP: Record<RegisterStatus, { text: string; variant: "active" | "pending" | "inactive" }> = {
  SUBMITTED: { text: "Submitted", variant: "active" },
  READY: { text: "Ready to submit", variant: "pending" },
  IN_PROGRESS: { text: "In progress", variant: "pending" },
  NOT_STARTED: { text: "Not started", variant: "pending" },
  CLOSED_DAY: { text: "No register", variant: "inactive" },
};

/** Which class, which day, who leads it, and where the register stands. */
function RegisterHeader({
  register,
  date,
  today,
  setDate,
}: {
  register: Register;
  date: string;
  today: string;
  setDate: (next: string) => void;
}) {
  const { formatDay, formatInstantTime } = useSchoolDisplay();
  const chip = register.status ? STATUS_CHIP[register.status] : null;
  const takenBy = register.taken_by;
  const time = takenBy ? formatInstantTime(takenBy.submitted_at) : "";

  let takenLine: string | null = null;
  if (takenBy?.on_behalf_of) {
    const leave = takenBy.on_leave
      ? `, who is on ${takenBy.on_leave.leave_type_label.toLowerCase()} until ${formatDay(takenBy.on_leave.ends_on)}`
      : "";
    takenLine = `Taken by ${takenBy.submitted_by} at ${time}, on behalf of ${takenBy.on_behalf_of}${leave}.`;
  } else if (takenBy) {
    takenLine = `Submitted ${time} by ${takenBy.submitted_by}.`;
  }
  if (takenLine && register.edit_window_open === false) {
    takenLine += " The day is closed, so a change is a correction request.";
  } else if (takenLine && register.edit_window_open) {
    takenLine += " Rows can still be changed until the register closes.";
  }

  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">
            {register.school_class.name} · morning register
          </h1>
          <p className="text-sm text-gray-06">
            {[formatDay(date, { weekday: "long", month: "long" }), register.school_class.branch?.name]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <DayPicker date={date} today={today} onChange={setDate} />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label="Class teacher" value={register.school_class.class_teacher_name ?? "No class teacher"} />
        {register.counts && <Fact label="Students" value={`${register.counts.total}`} />}
        {chip && (
          <div className="min-w-0">
            <dt className="text-xs text-gray-05">Status</dt>
            <dd className="mt-1">
              <Badge variant={chip.variant} className="rounded-full">
                {register.status === "SUBMITTED" && time ? `Submitted ${time}` : chip.text}
              </Badge>
            </dd>
          </div>
        )}
      </dl>
      {takenLine && <p className="text-sm text-gray-06">{takenLine}</p>}
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-black-01">{value}</dd>
    </div>
  );
}

/** Every change made to a submitted register. Nothing here is ever deleted. */
function History({ register }: { register: Register }) {
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
              {` by ${change.changed_by_name}`}
              {change.via === "CORRECTION" ? ", by an approved correction" : ""}.
              {change.note ? ` ${change.note}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * Pinned to the foot of the screen until the register is submitted, so the
 * button is in reach on a phone however long the class list is.
 */
function SubmitBar({
  unmarked,
  note,
  busy,
  onSubmit,
}: {
  unmarked: number;
  note: string;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="sticky bottom-3 z-10 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white px-4 py-3 shadow-lg">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-black-01">
          {unmarked > 0 ? `${unmarked} row${unmarked === 1 ? "" : "s"} still unmarked` : "Every row is marked"}
        </p>
        {note && <p className="text-xs text-gray-06">{note}</p>}
      </div>
      <Button onClick={onSubmit} disabled={unmarked > 0 || busy}>
        Submit register
      </Button>
    </div>
  );
}

function RegisterSkeleton() {
  return (
    <>
      <Skeleton className="h-36 w-full rounded-md" />
      <Skeleton className="h-96 w-full rounded-md" />
    </>
  );
}
