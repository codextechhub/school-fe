import { Link } from "react-router";
import { ClipboardCheck } from "lucide-react";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { P } from "@/permissions";
import {
  useGetAttendanceTodayQuery,
  useGetMyAttendanceTodayQuery,
} from "@/redux/services/attendance/attendance-api";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { DayPicker } from "../components/day-picker";
import { useAttendanceDay } from "../use-attendance-day";
import { AdminHub } from "./admin-hub";
import { TeacherHub } from "./teacher-hub";

/**
 * Attendance, Today.
 *
 * One address, two screens, chosen by what the reader may do. Somebody who
 * takes any class's register or decides corrections works the whole school
 * and gets the administrator's hub; everybody else gets their own registers.
 * The server draws the same line (`today/` refuses the second kind), so asking
 * for the hub and falling back on the refusal would only cost a round trip.
 *
 * The day comes from the address (`?date=`), so another day can be linked to.
 */
export default function AttendanceToday() {
  const { hasPermission } = usePermissions();
  const { date, today, isToday, setDate } = useAttendanceDay();

  if (!hasPermission(P.VIEW_ATTENDANCE)) {
    return (
      <PageShell>
        <PageAccessDenied message="Your role does not include attendance. Ask your school administrator if you need it." />
      </PageShell>
    );
  }

  const worksWholeSchool =
    hasPermission(P.TAKE_ANY_REGISTER) || hasPermission(P.DECIDE_ATTENDANCE_CORRECTION);

  return (
    <PageShell className="content-start gap-5" grid>
      {worksWholeSchool ? (
        <AdminToday date={date} today={today} isToday={isToday} setDate={setDate} />
      ) : (
        <TeacherToday date={date} today={today} setDate={setDate} />
      )}
    </PageShell>
  );
}

type DayProps = { date: string; today: string; setDate: (next: string) => void };

function AdminToday({ date, today, isToday, setDate }: DayProps & { isToday: boolean }) {
  const { hasPermission } = usePermissions();
  const { branch, applies, label } = useBranchLens();
  const { formatInstantTime } = useSchoolDisplay();
  const { data, isLoading, isError, refetch, fulfilledTimeStamp } = useGetAttendanceTodayQuery({
    date: isToday ? undefined : date,
    branch,
  });
  const hub = data?.data;
  const scope = applies ? label : null;
  const readAt = fulfilledTimeStamp ? `read at ${formatInstantTime(new Date(fulfilledTimeStamp).toISOString())}` : null;

  return (
    <>
      <DayHeader
        title="Attendance at a glance"
        date={date}
        today={today}
        setDate={setDate}
        sub={[scope, isToday ? readAt : null]}
        action={hasPermission(P.VIEW_STAFF_REGISTER) ? (
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to={`${routesPath.PROTECTED.ATTENDANCE.STAFF}${isToday ? "" : `?date=${date}`}`}>Staff register</Link>
          </Button>
        ) : null}
      />
      {isError ? (
        <LoadError onRetry={refetch} />
      ) : isLoading || !hub ? (
        <HubSkeleton />
      ) : (
        <AdminHub hub={hub} isToday={isToday} />
      )}
    </>
  );
}

function TeacherToday({ date, today, setDate }: DayProps) {
  const { data, isLoading, isError, refetch } = useGetMyAttendanceTodayQuery({
    date: date === today ? undefined : date,
  });
  const hub = data?.data;
  return (
    <>
      <DayHeader
        title="Your attendance day"
        date={date}
        today={today}
        setDate={setDate}
        sub={["Your class register and lessons for the day"]}
      />
      {isError ? (
        <LoadError onRetry={refetch} />
      ) : isLoading || !hub ? (
        <Skeleton className="h-40 w-full rounded-md" />
      ) : (
        <TeacherHub hub={hub} />
      )}
    </>
  );
}

/**
 * The Today heading. The day picker always sits in the actions, after any
 * page action. On the current day the scope line opens with "Today", so the
 * reader can tell the live day from a past one picked in the date control.
 */
function DayHeader({
  title,
  date,
  today,
  setDate,
  sub,
  action,
}: DayProps & { title: string; sub: Array<string | null>; action?: React.ReactNode }) {
  const line = [date === today ? "Today" : null, ...sub].filter(Boolean).join(" · ");
  return (
    <PageHeader
      title={title}
      description={line || undefined}
      actions={
        <>
          {action}
          <DayPicker date={date} today={today} onChange={setDate} />
        </>
      }
    />
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <OutlinedNotice
      icon={ClipboardCheck}
      title="We could not load the registers"
      body="Something went wrong on our side. Try again in a moment."
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}

function HubSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-26 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
    </>
  );
}
