import { useNavigate } from "react-router";
import { AlertTriangle, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { routesPath } from "@/routes/routesPath";
import { useGetTeachersQuery } from "@/redux/services/calendar/calendar-api";

/**
 * Teachers the timetable has double-booked.
 *
 * **Reported, never computed here.** A clash is a fact about two timetable
 * slots and is discovered when a slot is placed, not when a subject is
 * assigned: nothing on this screen could find one, because an assignment says
 * WHAT somebody teaches and carries no day, no period and no room. So this
 * reads the timetable's own answer and adds nothing to it.
 *
 * **Gated on the timetable's key, not on this module's.** Somebody who may read
 * staff records need not be able to read the timetable, and for that reader the
 * panel says where clashes will appear rather than showing an empty list that
 * reads as "there are none". A school told that clashes are reported should be
 * able to see where.
 *
 * What it can say is which teacher is double-booked, which is the half of the
 * question this screen can act on. Which two lessons collide is on their grid,
 * and that is where the link goes.
 */
export function ClashPanel() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canReadTimetable = hasPermission(P.BROWSE_TIMETABLES);

  const { data, isLoading } = useGetTeachersQuery(undefined, {
    skip: !canReadTimetable,
  });
  const clashing = (data?.data ?? []).filter((row) => row.has_clash);

  if (!canReadTimetable) {
    return (
      <p className="text-[13px] text-gray-05">
        Clashes are reported by the timetable, and reading it needs a timetable
        permission this account does not hold. They appear here once somebody
        who has one opens this screen.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-[13px] text-gray-05">Checking the timetable…</p>;
  }

  if (!clashing.length) {
    return (
      <p className="text-[13px] text-gray-05">
        Nobody is double-booked. A clash appears here when the timetable puts
        one teacher in two places at once, and is found when the lesson is
        placed rather than when the subject is assigned.
      </p>
    );
  }

  return (
    <div className="grid gap-2.5">
      <ul className="grid gap-2">
        {clashing.map((teacher) => (
          <li
            key={teacher.id}
            className="flex flex-wrap items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5"
          >
            <AlertTriangle
              className="size-4 shrink-0 text-amber-700"
              aria-hidden
            />
            <span className="text-sm text-black-01">{teacher.name}</span>
            <span className="text-xs text-amber-900">
              is in two places at once
            </span>
            <span className="ml-auto text-xs text-gray-05">
              {teacher.lesson_count}{" "}
              {teacher.lesson_count === 1 ? "lesson" : "lessons"}
            </span>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        className="justify-self-start"
        onClick={() => navigate(routesPath.PROTECTED.TIMETABLES.TEACHERS)}
      >
        <CalendarClock className="size-4" />
        Open the timetable
      </Button>
    </div>
  );
}
