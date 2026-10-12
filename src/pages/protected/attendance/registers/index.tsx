import { useState } from "react";
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
import { useGetClassesQuery } from "@/redux/services/academics/academics-api";
import type { SchoolClass } from "@/redux/services/academics/academics-types";
import { useGetRegisterQuery } from "@/redux/services/attendance/attendance-api";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { DayPicker } from "../components/day-picker";
import { useAttendanceDay } from "../use-attendance-day";
import { timeOnDay } from "../time-on-day";

/**
 * Every class's register for one day.
 *
 * The way into a register that is not waiting on anyone: Today lists only the
 * classes whose register is still to come, so a register submitted on time
 * is reached from here. The classes are the school's active ones in the
 * branches the reader works in, and each row asks for its own register's
 * status, because only the register knows whether its class was closed that
 * day, had nobody placed in it, or was taken. Opening a row reuses the answer
 * already fetched.
 */
export default function ClassRegisters() {
  const { hasPermission } = usePermissions();
  const { date, today, setDate } = useAttendanceDay();
  const { branch, applies, label } = useBranchLens();
  const { formatDay } = useSchoolDisplay();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const allowed = hasPermission(P.VIEW_ATTENDANCE) && hasPermission(P.BROWSE_CLASSES);

  const { data, isLoading, isError, refetch } = useGetClassesQuery(
    { branch, page },
    { skip: !allowed },
  );

  if (!allowed) {
    return (
      <PageShell>
        <PageAccessDenied message="Reading every class's register needs both attendance and the class list. Ask your school administrator if you need them." />
      </PageShell>
    );
  }

  const classes = data?.data ?? [];
  const scopeHeader = applies ? "Branch" : "Level";
  const open = (schoolClass: SchoolClass) =>
    navigate(routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(schoolClass.id, date === today ? undefined : date));

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">
            {formatDay(date, { weekday: "long", month: "long" })}
          </h1>
          <p className="text-sm text-gray-06">
            {[applies ? label : null, "Every class's morning register"].filter(Boolean).join(" · ")}
          </p>
        </div>
        <DayPicker date={date} today={today} onChange={setDate} />
      </div>

      {isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="We could not load the classes"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <Skeleton className="h-72 w-full rounded-md" />
      ) : (
        <CustomTable
          tableHeaderList={["Class", "Class teacher", scopeHeader, "Register", "Action"]}
          defaultBodyList={classes}
          tableBodyList={classes.map((schoolClass) => ({
            Class: <span className="font-medium text-black-01">{schoolClass.name}</span>,
            "Class teacher": schoolClass.class_teacher?.name ?? "No class teacher",
            [scopeHeader]: applies ? schoolClass.branch_name ?? "No branch" : schoolClass.level_name,
            Register: <RegisterState classId={schoolClass.id} date={date} />,
            Action: (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  open(schoolClass);
                }}
              >
                Open
              </Button>
            ),
          }))}
          onRowClick={(schoolClass: SchoolClass) => schoolClass && open(schoolClass)}
          currentPage={page}
          totalPage={data?.pagination?.totalPages ?? 1}
          onPageChange={(next) => setPage(Number(next) || 1)}
          emptyText="No classes in this school year yet"
        />
      )}
    </PageShell>
  );
}

/** Where one class's register stands on the day, as the register itself says. */
function RegisterState({ classId, date }: { classId: number; date: string }) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const fmt = useSchoolDisplay();
  const { data, isLoading, isError } = useGetRegisterQuery({ classId, date });
  const register = data?.data;

  if (isLoading) return <Skeleton className="h-5 w-24 rounded-full" />;
  if (isError || !register) return <span className="text-xs text-gray-05">Not available</span>;
  if (register.closed) return <Badge variant="inactive" className="rounded-full">Closed: {register.closed.reason}</Badge>;
  if (register.roster_empty) return <span className="text-xs text-gray-05">Nobody placed</span>;
  if (access.isHidden("status") || !register.status) return null;

  switch (register.status) {
    case "SUBMITTED":
      return (
        <Badge variant="active" className="rounded-full">
          Submitted{register.taken_by ? ` ${timeOnDay(fmt, register.taken_by.submitted_at, date)}` : ""}
        </Badge>
      );
    case "READY":
      return <Badge variant="pending" className="rounded-full">Ready to submit</Badge>;
    case "IN_PROGRESS":
      return <Badge variant="pending" className="rounded-full">In progress</Badge>;
    default:
      return <Badge variant="pending" className="rounded-full">Not taken</Badge>;
  }
}
