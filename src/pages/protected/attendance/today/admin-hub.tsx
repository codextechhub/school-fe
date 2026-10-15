import { useState } from "react";
import { Link } from "react-router";
import { ClipboardCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import CustomTable from "@/components/custom/custom-table";
import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import { useRemindClassTeacherMutation } from "@/redux/services/attendance/attendance-api";
import type {
  AdminHub as AdminHubData,
  CorrectionRow,
  HubAbsentRow,
  HubKpis,
  MissedLessonRow,
  NotTakenRow,
} from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { PersonAvatar } from "@/pages/protected/students/person-avatar";

import { ClosedDayNotice } from "../components/closed-day-notice";
import { MARKS, markLabel, noticeText } from "../marks";
import { timeOnDay } from "../time-on-day";
import { FocusedRegister } from "./focused-register";

/**
 * The administrator's view of one day across every class in their branches.
 *
 * What is shown follows the school's shape: at a school with several branches
 * the tables carry a Branch column, at a school with one they carry Level
 * instead (`branch_dimension`). The missed-a-lesson count and cards appear only
 * where a class in scope marks lessons, because the server leaves them out
 * everywhere else.
 *
 * Field Access removes what the reader may not read: the KPIs need the
 * register counts, the not-taken list needs the register status, and each
 * column of the absent table follows the field it shows. A section whose data
 * the server left out is not drawn at all.
 */
export function AdminHub({ hub, isToday }: { hub: AdminHubData; isToday: boolean }) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const lessonAccess = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_LESSON);
  const { hasPermission } = usePermissions();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  if (hub.closed) {
    return <ClosedDayNotice closed={hub.closed} dateLabel={hub.date_label} />;
  }

  const showKpis = !!hub.kpis && !access.isHidden("counts");
  const showNotTaken = !!hub.not_taken && !access.isHidden("status");
  const missed = !lessonAccess.isHidden("mark") ? hub.missed_lessons ?? [] : [];
  const notTaken = showNotTaken ? hub.not_taken ?? [] : [];
  const canTake = hasPermission(P.TAKE_ANY_REGISTER);
  const focusedClassId = canTake
    ? notTaken.some((row) => row.class_id === selectedClassId)
      ? selectedClassId
      : notTaken[0]?.class_id ?? null
    : null;

  const focusClass = (classId: number) => {
    setSelectedClassId(classId);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.requestAnimationFrame(() => {
        document.getElementById("attendance-focused-register")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  return (
    <>
      {hub.classes_without_branch.length > 0 && (
        <ClassesWithoutBranch names={hub.classes_without_branch} />
      )}
      {showKpis && hub.kpis && <HubKpiStrip kpis={hub.kpis} isToday={isToday} />}
      <div
        className={focusedClassId
          ? "grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]"
          : "grid min-w-0 grid-cols-1 gap-4"}
      >
        <div className="grid min-w-0 grid-cols-1 content-start gap-4">
          {showNotTaken && (
            <NotTakenPanel
              rows={notTaken}
              date={hub.date}
              isToday={isToday}
              branchDimension={hub.branch_dimension}
              focusedClassId={focusedClassId}
              onFocusClass={focusClass}
            />
          )}
          {missed.length > 0 && <MissedLessonPanel rows={missed} date={hub.date} />}
          <AbsentPanel rows={hub.absent} isToday={isToday} date={hub.date} dateLabel={hub.date_label} />
          {hub.pending_corrections_preview && (
            <CorrectionPreview correction={hub.pending_corrections_preview} />
          )}
        </div>
        {focusedClassId && (
          <FocusedRegister classId={focusedClassId} date={hub.date} isToday={isToday} />
        )}
      </div>
    </>
  );
}

/** Compact daily figures, with optional lesson and correction counts. */
function HubKpiStrip({ kpis, isToday }: { kpis: HubKpis; isToday: boolean }) {
  const notTaken = kpis.not_taken;
  const cards = [
    {
      label: isToday ? "In school today" : "In school",
      value: kpis.rate == null ? "None yet" : `${kpis.rate}%`,
      foot: `${notTaken} register${notTaken === 1 ? "" : "s"} not ${isToday ? "yet " : ""}taken`,
      tone: "green" as const,
    },
    { label: "Absent", value: kpis.absent, foot: "Students marked absent", tone: "red" as const },
    { label: "Late", value: kpis.late, foot: "Counted as present too", tone: "amber" as const },
    { label: "Excused", value: kpis.excused, foot: "With a reason code", tone: "blue" as const },
    {
      label: isToday ? "Not yet taken" : "Not taken",
      value: notTaken,
      foot: notTaken ? "Chase the class teacher" : "Every class is in",
      tone: notTaken ? ("amber" as const) : ("green" as const),
    },
    ...(kpis.missed_a_lesson !== undefined
      ? [{ label: "Missed a lesson", value: kpis.missed_a_lesson, foot: "In school, absent from a lesson", tone: "violet" as const }]
      : []),
    ...(kpis.corrections_waiting !== undefined
      ? [{
          label: "Corrections waiting",
          value: kpis.corrections_waiting,
          foot: "Needs your decision",
          tone: kpis.corrections_waiting ? ("amber" as const) : ("green" as const),
        }]
      : []),
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {cards.map((card) => (
        <HubMetric key={card.label} {...card} />
      ))}
    </div>
  );
}

const METRIC_TONE = {
  green: { wash: "bg-emerald-50", text: "text-emerald-700" },
  red: { wash: "bg-rose-50", text: "text-rose-700" },
  amber: { wash: "bg-amber-50", text: "text-amber-700" },
  blue: { wash: "bg-blue-50", text: "text-blue-700" },
  violet: { wash: "bg-violet-50", text: "text-violet-700" },
};

function HubMetric({
  label,
  value,
  foot,
  tone,
}: {
  label: string;
  value: string | number;
  foot: string;
  tone: keyof typeof METRIC_TONE;
}) {
  const palette = METRIC_TONE[tone];
  return (
    <Panel className="relative overflow-hidden px-4 py-4">
      <span className={`absolute -right-5 -top-5 size-14 rounded-full ${palette.wash}`} aria-hidden="true" />
      <p className="relative text-xs font-medium text-gray-06">{label}</p>
      <p className="relative mt-3 font-mont text-2xl font-semibold tracking-tight text-black-01">{value}</p>
      <p className={`relative mt-1.5 text-xs ${palette.text}`}>{foot}</p>
    </Panel>
  );
}

function SectionHeading({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <h2 className="font-mont text-base font-semibold text-black-01">{title}</h2>
      <p className="text-sm text-gray-06">{body}</p>
    </div>
  );
}

/**
 * Classes whose register for the day has not been submitted.
 *
 * Remind needs its own key and a class teacher to remind: a class with none is
 * shown as such rather than offered a button the server would refuse.
 */
function NotTakenPanel({
  rows,
  date,
  isToday,
  branchDimension,
  focusedClassId,
  onFocusClass,
}: {
  rows: NotTakenRow[];
  date: string;
  isToday: boolean;
  branchDimension: boolean;
  focusedClassId: number | null;
  onFocusClass: (classId: number) => void;
}) {
  const { hasPermission } = usePermissions();
  const canRemind = hasPermission(P.REMIND_CLASS_TEACHER);
  const canTake = hasPermission(P.TAKE_ANY_REGISTER);
  const showActions = canRemind || canTake;
  const [remind, { isLoading, originalArgs }] = useRemindClassTeacherMutation();
  const scopeHeader = branchDimension ? "Branch" : "Level";

  const send = async (row: NotTakenRow) => {
    const result = await remind({ classId: row.class_id, date });
    if (!("error" in result)) {
      toast.success("Reminder sent", {
        description: `${row.class_teacher_name} gets it in the app and by email.`,
      });
    }
  };

  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <SectionHeading
        title={isToday ? "Not yet taken" : "Not taken"}
        body="Classes with no submitted register for this day."
      />
      {rows.length === 0 ? (
        <EmptyLine text="Every register for this day has been taken." />
      ) : (
        <CustomTable
          tableHeaderList={["Class", "Class teacher", scopeHeader, ...(showActions ? ["Action"] : [])]}
          defaultBodyList={rows}
          tableBodyList={rows.map((row) => ({
            Class: <span className="font-medium text-black-01">{row.class_name}</span>,
            "Class teacher": row.class_teacher_name ?? "No class teacher",
            [scopeHeader]: branchDimension ? row.branch?.name ?? "No branch" : row.level_name,
            ...(showActions
              ? {
                  Action: (
                    <span className="flex flex-wrap items-center justify-end gap-2">
                      {canRemind && <RemindCell row={row} busy={isLoading && originalArgs?.classId === row.class_id} onRemind={() => void send(row)} />}
                      {canTake && (
                        <Button
                          size="sm"
                          variant={focusedClassId === row.class_id ? "outline" : "default"}
                          onClick={(event) => {
                            event.stopPropagation();
                            onFocusClass(row.class_id);
                          }}
                        >
                          {focusedClassId === row.class_id ? "In focus" : "Take register"}
                        </Button>
                      )}
                    </span>
                  ),
                }
              : {}),
          }))}
          onRowClick={canTake ? (row: NotTakenRow) => row && onFocusClass(row.class_id) : undefined}
          cardBreakpoint="lg"
          hidePagination
        />
      )}
    </Panel>
  );
}

/**
 * Remind, or say why not: already reminded today, or nobody to remind
 * because the class has no class teacher (which the server would refuse).
 */
function RemindCell({ row, busy, onRemind }: { row: NotTakenRow; busy: boolean; onRemind: () => void }) {
  if (row.reminded) return <Badge variant="inactive" className="rounded-full">Reminded</Badge>;
  if (!row.class_teacher_name) return <span className="text-xs text-gray-05">Nobody to remind</span>;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={(event) => {
        event.stopPropagation();
        onRemind();
      }}
    >
      Remind
    </Button>
  );
}

/** Children in school in the morning and absent from a lesson. Both marks stand. */
function MissedLessonPanel({ rows, date }: { rows: MissedLessonRow[]; date: string }) {
  const fmt = useSchoolDisplay();
  return (
    <Panel as="section" className="space-y-4 border-amber-200 bg-amber-50/40 p-4 sm:p-5">
      <SectionHeading
        title="In school this morning, missed a lesson"
        body="Both marks are true. Neither overwrites the other."
      />
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <li
            key={`${row.student.id}-${row.period_label}`}
            className="min-w-0 space-y-3 rounded-md border border-border bg-white p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-black-01">{row.student.name}</p>
              <p className="text-xs text-gray-05">
                {[row.class_name, row.student.student_number].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {row.morning_mark !== undefined && (
                <MiniMark title="Morning register" text={markLabel(row.morning_mark)} mark={row.morning_mark} />
              )}
              <MiniMark
                title={`${row.period_label} · ${row.subject}`}
                text={`Absent · ${timeOnDay(fmt, row.lesson_submitted_at, date)}`}
                mark="A"
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function MiniMark({ title, text, mark }: { title: string; text: string; mark: keyof typeof MARKS | null }) {
  return (
    <div className="min-w-0 rounded-md bg-white-05 px-3 py-2">
      <p className="truncate text-xs text-gray-05">{title}</p>
      <Badge variant={mark ? MARKS[mark].badge : "inactive"} className="mt-1 rounded-full">
        {text}
      </Badge>
    </div>
  );
}

/** Children marked absent or excused on a submitted register. */
function AbsentPanel({
  rows,
  isToday,
  date,
  dateLabel,
}: {
  rows: HubAbsentRow[];
  isToday: boolean;
  date: string;
  dateLabel: string;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const { hasPermission } = usePermissions();
  const fmt = useSchoolDisplay();
  const canOpenStudent = hasPermission(P.BROWSE_STUDENTS);

  const showMark = !access.isHidden("mark");
  const showReason = !access.isHidden("reason_code") || !access.isHidden("note");
  const showNotice = !access.isHidden("notice_state");

  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <SectionHeading
        title={isToday ? "Absent today" : `Absent on ${dateLabel}`}
        body="A notice goes when a register is submitted, once per child per day, to the primary guardian's email. Late and Excused send nothing."
      />
      {rows.length === 0 ? (
        <EmptyLine text={isToday ? "Nobody is marked absent so far today." : "Nobody was marked absent that day."} />
      ) : (
        <CustomTable
          tableHeaderList={[
            "Student",
            "Class",
            ...(showMark ? ["Mark"] : []),
            ...(showReason ? ["Reason"] : []),
            ...(showNotice ? ["Guardian notice"] : []),
          ]}
          defaultBodyList={rows}
          tableBodyList={rows.map((row) => {
            const notice = noticeText(
              row.mark,
              row.notice_state,
              row.notice_sent_at ? timeOnDay(fmt, row.notice_sent_at, date) : null,
            );
            const reason = [row.reason_label, row.note].filter(Boolean).join(" · ");
            return {
              Student: (
                <span className="flex min-w-0 items-center gap-2.5">
                  <PersonAvatar name={row.student.name} className="size-8" />
                  <span className="flex min-w-0 flex-col">
                    {canOpenStudent ? (
                      <Link
                        to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student.id)}?tab=attendance`}
                        className="truncate font-medium text-primary hover:underline"
                      >
                        {row.student.name}
                      </Link>
                    ) : (
                      <span className="truncate font-medium text-black-01">{row.student.name}</span>
                    )}
                    {row.student.student_number && (
                      <span className="text-xs text-gray-05">{row.student.student_number}</span>
                    )}
                  </span>
                </span>
              ),
              Class: row.class_name,
              ...(showMark
                ? {
                    Mark: row.mark ? (
                      <Badge variant={MARKS[row.mark].badge} className="rounded-full">
                        {MARKS[row.mark].label}
                      </Badge>
                    ) : null,
                  }
                : {}),
              ...(showReason ? { Reason: reason || "No reason given" } : {}),
              ...(showNotice
                ? {
                    "Guardian notice": (
                      <span className={notice.warn ? "font-medium text-error-text" : "text-gray-06"}>
                        {notice.text}
                      </span>
                    ),
                  }
                : {}),
            };
          })}
          cardBreakpoint="lg"
          hidePagination
        />
      )}
    </Panel>
  );
}

/** The oldest correction waiting for this reader's decision. */
function CorrectionPreview({ correction }: { correction: CorrectionRow }) {
  const { formatDay } = useSchoolDisplay();
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <SectionHeading
          title="Corrections waiting"
          body="A mark on a closed day can only change with your decision."
        />
        <Button asChild variant="outline" size="sm">
          <Link to={routesPath.PROTECTED.ATTENDANCE.CORRECTIONS}>Open queue</Link>
        </Button>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3">
        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
          <p className="truncate font-medium text-black-01">{correction.student.name}</p>
          <p className="text-xs text-gray-05">
            {[
              correction.class_name,
              formatDay(correction.date),
              correction.requested_by_name ? `requested by ${correction.requested_by_name}` : "",
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        {correction.from_mark && correction.to_mark && (
          <span className="flex items-center gap-1.5 text-sm">
            <Badge variant={MARKS[correction.from_mark].badge} className="rounded-full">
              {MARKS[correction.from_mark].label}
            </Badge>
            <span aria-label="to">→</span>
            <Badge variant={MARKS[correction.to_mark].badge} className="rounded-full">
              {MARKS[correction.to_mark].label}
            </Badge>
          </span>
        )}
        <Badge variant="pending" className="rounded-full">Awaiting decision</Badge>
      </div>
    </Panel>
  );
}

/**
 * Classes that cannot take a register because they have no branch.
 *
 * At a school with several branches every register names one, and a class
 * with none is refused until it is given one. Listed so the reason a class
 * never appears as "not taken" is visible rather than silent.
 */
function ClassesWithoutBranch({ names }: { names: string[] }) {
  return (
    <div
      role="status"
      className="flex min-w-0 items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3.5"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
      <p className="min-w-0 text-sm text-amber-900">
        {names.join(", ")} {names.length === 1 ? "has" : "have"} no branch, so no register can be
        taken for {names.length === 1 ? "it" : "them"}. Give each class a branch in Classes.
      </p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-white-05 px-4 py-3.5 text-sm text-gray-06">
      <ClipboardCheck className="size-4 shrink-0 text-green-01" aria-hidden="true" />
      {text}
    </div>
  );
}
