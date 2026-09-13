import { useNavigate } from "react-router";
import { CalendarRange } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import {
  useGetCalendarOverviewQuery,
  useGetCalendarYearQuery,
} from "@/redux/services/calendar/calendar-api";

import { CalendarOverviewLayout } from "./overview-layout";

/**
 * Loads the calendar overview for the selected branch and school year.
 *
 * The populated layout lives separately so error, loading, and first-year
 * states stay explicit rather than being hidden among the dashboard panels.
 */
export default function CalendarOverview() {
  const { lens, sessionName } = useAcademicsLens();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } =
    useGetCalendarOverviewQuery(lens);
  const { data: yearData, isLoading: yearLoading } =
    useGetCalendarYearQuery({ session: lens.session });

  const overview = data?.data;
  const year = yearData?.data ?? {};

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CalendarRange}
          title="We could not load your calendar"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  if (isLoading || yearLoading) {
    return (
      <PageShell className="content-start gap-5" grid>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,.65fr)]">
          <Skeleton className="h-64 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-md" />
      </PageShell>
    );
  }

  if (!overview?.session) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CalendarRange}
          title="No school year yet"
          body="A calendar hangs off a school year: every holiday, break and exam period is dated inside one. Start a year on Sessions & Terms and this fills in."
          actionLabel="Go to Sessions & Terms"
          onAction={() =>
            navigate(routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS)
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <CalendarOverviewLayout
        overview={{ ...overview, session: overview.session }}
        year={year}
        sessionName={sessionName}
        canSeeSessions={hasPermission(P.BROWSE_SESSIONS)}
        canSeeTimetables={hasPermission(P.BROWSE_TIMETABLES)}
        canCreateEvent={
          hasPermission(P.CREATE_CALENDAR_EVENT) &&
          overview.session.status !== "ARCHIVED" &&
          !year.session?.read_only
        }
      />
    </PageShell>
  );
}
