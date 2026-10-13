import { Link } from "react-router";
import { UserRoundCheck } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import { useGetRegisterQuery } from "@/redux/services/attendance/attendance-api";
import type { TeacherClassCard } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { MARKS, noticeText } from "@/pages/protected/attendance/marks";
import { timeOnDay } from "@/pages/protected/attendance/time-on-day";
import { TeacherHub } from "@/pages/protected/attendance/today/teacher-hub";

import { useTeacherDay } from "./use-teacher-day";

/**
 * The two teaching cards at the top of an active teacher's dashboard: their
 * registers and lessons for today, and who is absent from the class they lead.
 * Nothing renders for anybody else.
 */
export function TeacherDayCards() {
  const { active, loading, day } = useTeacherDay();
  if (loading) return <Skeleton className="h-36 w-full rounded-3xl" />;
  if (!active || !day) return null;
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Your day</p>
        <TeacherHub hub={day} />
      </div>
      {!day.closed && day.classes.length > 0 && (
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Your class</p>
          <div className="grid gap-3">
            {day.classes.map((card) => (
              <AbsentFromClass key={card.class_id} card={card} date={day.date} />
            ))}
          </div>
        </div>
      )}
    </section>
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
