import { useNavigate } from "react-router";
import { ClipboardList } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import { useGetLessonsQuery } from "@/redux/services/attendance/attendance-api";
import type { LessonListRow } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { ClosedDayNotice } from "../components/closed-day-notice";
import { DayPicker } from "../components/day-picker";
import { useAttendanceDay } from "../use-attendance-day";
import { timeOnDay } from "../time-on-day";

/**
 * The day's lessons, for a reader who takes any class's register.
 *
 * Only levels with lesson marking on have lessons here, and only classes whose
 * timetable is published; breaks and assemblies are not lessons. A teacher's
 * own lessons are on their Today screen, which is why this list needs the key
 * that takes any class. Each row opens that lesson's register for the day.
 */
export default function AttendanceLessons() {
  const { hasPermission } = usePermissions();
  const { date, today, isToday, setDate } = useAttendanceDay();
  const { branch, applies, label } = useBranchLens();
  const { formatDay } = useSchoolDisplay();
  const allowed = hasPermission(P.TAKE_ANY_REGISTER);
  const { data, isLoading, isError, refetch } = useGetLessonsQuery(
    { date: isToday ? undefined : date, branch },
    { skip: !allowed },
  );

  if (!allowed) {
    return (
      <PageShell>
        <PageAccessDenied message="This list is for administrators who take any class's register. Your own lessons are on your Today screen." />
      </PageShell>
    );
  }

  const list = data?.data;
  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">
            {formatDay(date, { weekday: "long", month: "long" })}
          </h1>
          <p className="text-sm text-gray-06">
            {[applies ? label : null, "Lessons in levels that mark them"].filter(Boolean).join(" · ")}
          </p>
        </div>
        <DayPicker date={date} today={today} onChange={setDate} />
      </div>

      {isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="We could not load the lessons"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !list ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : list.closed ? (
        <ClosedDayNotice closed={list.closed} dateLabel={list.date_label} />
      ) : !list.lesson_marking_on ? (
        <LessonMarkingOff />
      ) : (
        <LessonTable rows={list.lessons} date={date} isToday={isToday} branchDimension={list.branch_dimension} />
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

function LessonTable({
  rows,
  date,
  isToday,
  branchDimension,
}: {
  rows: LessonListRow[];
  date: string;
  isToday: boolean;
  branchDimension: boolean;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_LESSON);
  const fmt = useSchoolDisplay();
  const { formatTime } = fmt;
  const navigate = useNavigate();
  const showStatus = !access.isHidden("status");
  const open = (row: LessonListRow) =>
    navigate(routesPath.PROTECTED.ATTENDANCE.LESSON_ID(row.slot_id, isToday ? undefined : date));

  return (
    <CustomTable
      tableHeaderList={["Period", "Class", "Lesson", ...(showStatus ? ["Register"] : []), "Action"]}
      defaultBodyList={rows}
      tableBodyList={rows.map((row) => ({
        Period: (
          <span className="flex flex-col">
            <span className="font-medium text-black-01">{row.period_label}</span>
            <span className="text-xs text-gray-05">
              {formatTime(row.start_time)} to {formatTime(row.end_time)}
            </span>
          </span>
        ),
        Class: (
          <span className="flex flex-col">
            <span className="text-black-01">{row.school_class.name}</span>
            {branchDimension && <span className="text-xs text-gray-05">{row.branch?.name ?? "No branch"}</span>}
          </span>
        ),
        Lesson: (
          <span className="flex flex-col">
            <span className="text-black-01">{row.subject}</span>
            <span className="text-xs text-gray-05">{row.teacher_name ?? "No teacher"}</span>
          </span>
        ),
        ...(showStatus
          ? {
              Register:
                row.status === "SUBMITTED" ? (
                  <Badge variant="active" className="rounded-full">
                    Marked{row.submitted_at ? ` ${timeOnDay(fmt, row.submitted_at, date)}` : ""}
                  </Badge>
                ) : (
                  <Badge variant="pending" className="rounded-full">Not yet marked</Badge>
                ),
            }
          : {}),
        Action: (
          <Button
            variant={row.status === "SUBMITTED" ? "outline" : "default"}
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              open(row);
            }}
          >
            {row.status === "SUBMITTED" ? "Open" : "Mark"}
          </Button>
        ),
      }))}
      onRowClick={(row: LessonListRow) => row && open(row)}
      hidePagination
      emptyText="No lessons on this day"
    />
  );
}
