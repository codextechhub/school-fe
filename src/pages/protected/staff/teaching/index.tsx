import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Check, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { Panel as Surface } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { useGetClassesQuery } from "@/redux/services/academics/academics-api";
import {
  useGetStaffListQuery,
  useGetTeachingCoverageQuery,
} from "@/redux/services/staff/staff-api";
import type { SchoolClass } from "@/redux/services/academics/academics-types";
import type { CoverageCell } from "@/redux/services/staff/staff-types";

import { StaffDrawers, type StaffDrawerRequest } from "../drawers";
import { PersonAvatar } from "../../students/person-avatar";
import { ClassTeachers } from "./class-teachers";
import { ClashPanel } from "./clash-panel";
import { CoverageGrid } from "./coverage-grid";
import { PairingDrawer } from "./pairing-drawer";

/**
 * Who teaches which subject to which class this session.
 *
 * **An assignment says WHAT; the timetable says when and where.** Nothing on
 * this screen schedules a lesson, and the only thing it can warn about is a
 * subject with nobody on it, because that is the one question answerable by
 * counting rows. It says nothing about whether the assigned teacher is a good
 * choice, how many periods a subject needs, or whether anybody is overloaded -
 * no specialism, no contract and no weekly frequency is recorded anywhere.
 *
 * **Two lenses over one dataset, one at a time.** The grid answers "is this
 * class covered"; the by-teacher list answers "what does this person carry".
 * Showing both at once was noise, so the toggle picks one.
 *
 * **Two kinds of gap, counted apart.** A subject nobody teaches, and a subject
 * being taught by people assisting with no main teacher over them. The second
 * looks covered until you ask who enters its results, and folding it into the
 * first would hide it.
 *
 * **One vocabulary, because two were being read as one.** The person carrying
 * a subject in a class is its MAIN TEACHER and everybody else on it is
 * ASSISTING; the person looking after the class itself is its CLASS TEACHER.
 * Both were previously described as being responsible for the class, which is
 * how a reader concludes that the two are the same designation.
 */
export default function TeachingDuties() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "teachers">("grid");
  // Held as the cell that was pressed, but READ from the live list below, so a
  // change made in the drawer shows in the drawer as well as behind it. The
  // captured one is the fallback for the moment a filled square leaves a
  // "Only gaps" list: the drawer stays open on what it was opened on rather
  // than closing itself the instant the work succeeds.
  const [pairing, setPairing] = useState<CoverageCell | null>(null);
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<StaffDrawerRequest | null>(null);

  const coverage = useGetTeachingCoverageQuery({ page, only_gaps: onlyGaps });
  const { data: classData } = useGetClassesQuery();
  // Everybody who carries a duty, plus what they carry. The directory already
  // counts assignments per person, so the by-teacher lens is one call rather
  // than one per teacher.
  const { data: staffData } = useGetStaffListQuery(
    { page: 1, teaching: "true" },
    { skip: view !== "teachers" },
  );

  const cells = useMemo(() => coverage.data?.data ?? [], [coverage.data]);
  const classes = useMemo(() => classData?.data ?? [], [classData]);
  const teachers = useMemo(() => staffData?.data ?? [], [staffData]);
  const pagination = coverage.data?.pagination;

  // The session is closed to a school still being set up, and to one whose year
  // has been archived. Both are refusals rather than errors.
  if (coverage.isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={GraduationCap}
          title="There is no year to show duties for"
          body="Teaching duties belong to an academic year. They open when the school goes live and a year is running."
          actionLabel="Back to the directory"
          onAction={() => navigate(routesPath.PROTECTED.STAFF.INDEX)}
        />
      </PageShell>
    );
  }

  const openPairing =
    pairing &&
    (cells.find(
      (cell) =>
        cell.class_id === pairing.class_id &&
        cell.subject_id === pairing.subject_id,
    ) ??
      pairing);

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-black-01">Teaching duties</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-01">
          Who teaches which subject to which class
          {coverage.data ? ` in ${coverage.data.session.name}` : ""}. Each
          subject in a class has one main teacher, who enters its results, and
          may have others assisting. This says what is taught; the timetable
          says when and where.
        </p>
      </div>

      <Surface as="section" className="px-6 py-5">
        {coverage.isLoading ? (
          <Skeleton className="h-5 w-72" />
        ) : (
          <>
            <p className="text-sm text-black-01">{coverage.data?.headline}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Figure
                count={coverage.data?.coverage_gaps ?? 0}
                label="with no teacher at all"
                tone={coverage.data?.coverage_gaps ? "alert" : "plain"}
              />
              <Figure
                count={coverage.data?.lead_gaps ?? 0}
                label="taught, but with no main teacher"
                tone={coverage.data?.lead_gaps ? "warn" : "plain"}
              />
            </div>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-white-02 pt-4">
          <SegmentedToggle
            ariaLabel="Teaching duties view"
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: "By class" },
              { value: "teachers", label: "By teacher" },
            ]}
          />
          {view === "grid" && (
            <button
              type="button"
              onClick={() => {
                setOnlyGaps((current) => !current);
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13.5px] font-medium",
                onlyGaps
                  ? "border-primary bg-white-03 text-primary"
                  : "border-white-02 bg-white text-gray-01 hover:bg-gray-03",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-4 place-content-center rounded-[4px] border-[1.5px] text-white",
                  onlyGaps ? "border-primary bg-primary" : "border-gray-02",
                )}
              >
                {onlyGaps && <Check className="size-2.5" />}
              </span>
              Only gaps
            </button>
          )}
        </div>
      </Surface>

      {view === "grid" ? (
        <Surface as="section" className="px-6 py-5">
          {coverage.isLoading || coverage.isFetching ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : cells.length ? (
            <>
              <CoverageGrid
                cells={cells}
                // Every square opens the square that was pressed, empty or
                // not. It used to open the main teacher's own duties where
                // there was one and jump to the list of teachers where there
                // was not - so the press that most needed answering, on a
                // subject nobody teaches, was the one that threw away which
                // subject in which class had just been chosen.
                onOpen={setPairing}
              />
              {(pagination?.totalPages ?? 1) > 1 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white-02 pt-4">
                  <p className="text-xs text-gray-05">
                    Page {pagination?.currentPage} of {pagination?.totalPages},{" "}
                    {pagination?.totalItems} class subjects in all
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={(pagination?.currentPage ?? 1) <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        (pagination?.currentPage ?? 1) >=
                        (pagination?.totalPages ?? 1)
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="py-6 text-center text-[13px] text-gray-05">
              {onlyGaps
                ? "Every subject has a teacher, and each one has a main teacher."
                : "No classes and subjects yet. They are built in Academic Structure."}
            </p>
          )}
        </Surface>
      ) : (
        <Surface as="section" className="px-6 py-5">
          <h3 className="mb-1 text-sm font-semibold text-black-01">
            By teacher
          </h3>
          <p className="mb-4 text-xs text-gray-05">
            A count of assignments. There is no target to compare it against.
          </p>
          {teachers.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {teachers.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setDrawer({
                        kind: "duties",
                        staffId: person.id,
                        personName: person.full_name,
                      })
                    }
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-white-02 px-3.5 py-2.5 text-left hover:border-primary"
                  >
                    <PersonAvatar
                      name={person.full_name}
                      className="size-8.5 shrink-0"
                      textClassName="text-xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-black-01">
                        {person.full_name}
                      </span>
                      <span className="block truncate text-xs text-gray-05">
                        {person.job_title || "No job title"}
                      </span>
                    </span>
                    <span className="text-xs text-gray-05">
                      {person.teaching_load}{" "}
                      {person.teaching_load === 1 ? "class" : "classes"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-gray-05">
              Nobody has teaching duties yet.
            </p>
          )}
        </Surface>
      )}

      <Surface as="section" className="px-6 py-5">
        <h3 className="mb-1 text-sm font-semibold text-black-01">
          Class teachers
        </h3>
        <p className="mb-4 text-xs text-gray-05">
          The person who looks after the class itself, its register and its day.
          Teaching a subject to that class is a separate job, set above.
        </p>
        <ClassTeachers
          classes={classes}
          onSet={(row: SchoolClass) =>
            setDrawer({
              kind: "classTeacher",
              schoolClassId: row.id,
              className: row.name,
              currentStaffId: row.class_teacher?.staff_id ?? null,
            })
          }
        />
      </Surface>

      <Surface as="section" className="px-6 py-5">
        <h3 className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-black-01">
          Timetable clashes
          <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-05">
            Reported
          </span>
        </h3>
        <p className="mb-4 text-xs text-gray-05">
          Found when a lesson is placed, not when a subject is assigned. Nothing
          on this screen can discover one.
        </p>
        <ClashPanel />
      </Surface>

      <PermissionGate permission={P.ASSIGN_TEACHING}>
        <p className="text-xs text-gray-05">
          Open any subject above to change who teaches it, or a teacher to
          change everything they carry.
        </p>
      </PermissionGate>

      {openPairing && (
        <PairingDrawer cell={openPairing} onClose={() => setPairing(null)} />
      )}

      <StaffDrawers request={drawer} onClose={() => setDrawer(null)} />
    </PageShell>
  );
}

function Figure({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "plain" | "warn" | "alert";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]",
        tone === "alert"
          ? "bg-destructive/10 text-error-text"
          : tone === "warn"
            ? "bg-amber-50 text-amber-900"
            : "bg-gray-04 text-gray-01",
      )}
    >
      <span className="font-semibold">{count}</span>
      {label}
    </span>
  );
}
