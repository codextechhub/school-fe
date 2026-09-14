import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertTriangle, Lock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/custom/surface";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import {
  useGetTeachersQuery,
  useGetTeacherTimetableQuery,
} from "@/redux/services/calendar/calendar-api";
import type { GridCell } from "@/redux/services/calendar/calendar-types";
import { TimetableGrid } from "../components/timetable-grid";
import { warningsFromDays } from "../components/grid-shape";
import { PersonPicker } from "./person-picker";
import { PageShell } from "@/components/layout/page-shell";

/**
 * One teacher's week, derived from the class grids.
 *
 * **Read-only, and not because of a permission.** There is no teacher-timetable
 * table to write to: a person's week is a query over the class grids, and a
 * stored copy would go stale the moment one lesson moved. So this screen shows
 * and links; editing happens where the lesson lives.
 *
 * **The picker is not narrowed by the branch lens**, and that is the one place
 * this module deliberately ignores it. Mr Eze teaches at Lekki on Monday to
 * Wednesday and at Ikeja on Thursday and Friday; a list filtered to the branch
 * being looked at would hide half his week from the person checking whether he
 * is over-booked. What makes it safe is that the clash query is wide too.
 *
 * **Clashes arrive per cell here**, not once at the top as they do on a class
 * grid, and the same double-booking rides on both cells of its pair - so the
 * panel deduplicates or it reports one problem twice.
 */
export default function TeacherTimetables() {
  const { lens, multiBranch } = useAcademicsLens();
  const navigate = useNavigate();
  const [teacherId, setTeacherId] = useState<number | null>(null);

  // The LIST reads the branch lens; the GRID below never does. A branch
  // administrator should not scroll past another branch's staff to find their
  // own, but Mr Eze teaches at Lekki on Monday to Wednesday and at Ikeja on
  // Thursday and Friday, and a week filtered to one of them shows three
  // lessons and two empty days - which is how Lekki books him for a Thursday
  // that Ikeja already has.
  const { data: listData, isLoading: listLoading } = useGetTeachersQuery({
    session: lens.session,
    branch: lens.branch,
  });
  const teachers = useMemo(() => listData?.data ?? [], [listData]);

  const current = teacherId ?? teachers[0]?.id ?? null;
  const currentRow = teachers.find((t) => t.id === current) ?? null;

  const { data: weekData, isLoading: weekLoading } = useGetTeacherTimetableQuery(
    current ? { id: current, session: lens.session } : { id: 0 },
    { skip: !current },
  );
  const week = weekData?.data;

  const warnings = useMemo(
    () => (week ? warningsFromDays(week.days) : []),
    [week],
  );

  const openClassTimetable = (cell: GridCell) => {
    const classId = cell?.slot?.school_class;
    if (!classId) return;
    navigate(`${routesPath.PROTECTED.TIMETABLES.CLASSES}?class=${classId}`);
  };

  if (listLoading) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <Skeleton className="h-14 w-72 max-w-full rounded-md" />
        <Skeleton className="h-[28rem] w-full rounded-md" />
      </PageShell>
    );
  }

  // Not "no timetables": there is nobody to have one. A school whose staff have
  // not been given the teacher role yet needs sending there, not to a grid.
  if (!teachers.length) {
    return (
      <PageShell className="content-start gap-5" grid>
        <PageHeading />
        <OutlinedNotice
          icon={Users}
          title="Nobody carries the teacher role yet"
          body="A timetable names a person, so somebody has to carry the teacher role before there is a week to show. Grant it on Roles & Invitations, then come back."
          actionLabel="Go to Roles & Invitations"
          onAction={() => {
            window.location.assign(routesPath.PROTECTED.ONBOARDING.ROLES);
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <PageHeading />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PersonPicker
          people={teachers}
          current={current}
          onPick={setTeacherId}
        />
        <Badge
          variant="inactive"
          className="shrink-0 gap-1 rounded-full py-0.5 text-[11px]"
        >
          <Lock className="size-3" /> Read-only
        </Badge>
      </div>

      {weekLoading || !week ? (
        <Skeleton className="h-[28rem] w-full rounded-md" />
      ) : (
        <>
          {/* Plain counts. No threshold, no colour, no comparison: nothing in
              the platform records a maximum teaching load, so a figure shown
              as good or bad would be an opinion with nothing behind it. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure value={week.summary.teaching_periods} label="Teaching periods" />
            <Figure value={week.summary.free_periods} label="Free periods" />
            <Figure
              value={week.summary.busiest_day ?? "-"}
              label="Busiest day"
            />
            {multiBranch && (week.summary.branches?.length ?? 0) > 1 && (
              <Figure
                value={String(week.summary.branches!.length)}
                label="Branches"
                hint={week.summary.branches!.join(", ")}
              />
            )}
          </div>

          {/* No paragraph for the cross-branch case: the Branches figure above
              already names them, and a sentence repeating a number the reader
              can see is one more thing to read past on every teacher who works
              at two branches. */}

          {warnings.length > 0 && (
            <Panel className="border-error-text/30 bg-error-text/5 px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-error-text">
                <AlertTriangle className="size-3.5 shrink-0" />
                {warnings.length} clash
                {warnings.length === 1 ? "" : "es"} in this week
              </p>
              <ul className="mt-1.5 grid gap-1">
                {warnings.map((w, i) => (
                  <li
                    key={`${w.code}-${i}`}
                    className="text-xs text-gray-06 text-pretty"
                  >
                    {w.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-05 text-pretty">
                Fix these on the class timetable the lesson belongs to.
              </p>
            </Panel>
          )}

          {/* The two figures on this screen can disagree, and when they do it
              needs saying. The picker counts LESSONS; the grid counts PERIODS,
              and a cell can only draw one lesson - so a teacher booked into
              three classes at 9am holds three lessons in one period and the
              grid shows one of them. The hidden ones are exactly the clashes
              listed above, which is why this only appears alongside them. */}
          {currentRow &&
            currentRow.lesson_count > week.summary.teaching_periods && (
              <p className="mt-3 text-xs text-gray-05 text-pretty">
                {week.teacher.name} holds {currentRow.lesson_count} lessons
                across {week.summary.teaching_periods} period
                {week.summary.teaching_periods === 1 ? "" : "s"}. A cell can
                only draw one, so the{" "}
                {currentRow.lesson_count - week.summary.teaching_periods} not
                shown are the double-bookings above.
              </p>
            )}

          {week.summary.teaching_periods === 0 && (
            <p className="rounded-lg border border-primary/10 bg-pry-01/25 px-4 py-3 text-[13px] text-gray-06 text-pretty">
              {week.teacher.name} holds no lessons this year. A teacher's week
              fills in as classes are timetabled.
            </p>
          )}

          <Panel className="overflow-hidden">
            <TimetableGrid
              days={week.days}
              variant="teacher"
              emptyLabel="Free"
              onCellClick={openClassTimetable}
            />
          </Panel>
        </>
      )}

      <p className="text-xs text-gray-05 text-pretty">
        This week is read from the class grids and cannot be edited here.{" "}
        <Link
          to={routesPath.PROTECTED.TIMETABLES.CLASSES}
          className="font-medium text-primary hover:underline"
        >
          Edit a class timetable
        </Link>
      </p>
    </PageShell>
  );
}

function Figure({
  value,
  label,
  hint,
}: {
  value: number | string;
  label: string;
  hint?: string;
}) {
  return (
    <Panel className="min-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="truncate text-xs text-gray-05">{label}</p>
      <p className="mt-1 truncate font-mont text-xl font-semibold text-black-01 sm:text-2xl">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[11px] text-gray-05" title={hint}>
          {hint}
        </p>
      )}
    </Panel>
  );
}

function PageHeading() {
  return (
    <div className="min-w-0">
      <h1 className="font-mont text-lg font-semibold text-black-01">
        Teacher Timetables
      </h1>
      <p className="mt-1 text-sm text-gray-06 text-pretty">
        Derived from the class timetables. Edits happen there.
      </p>
    </div>
  );
}
