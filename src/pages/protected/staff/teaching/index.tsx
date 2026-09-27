import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarClock,
  Check,
  GraduationCap,
  UserRoundCheck,
} from "lucide-react";

import KpiCard from "@/components/custom/kpi-card";
import PermissionGate from "@/components/custom/permission-gate";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel as Surface } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { Pager } from "@/pages/protected/students/pager";
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
import { teachingSummary } from "./teaching-summary";

type Section = "coverage" | "classTeachers" | "clashes";
type CoverageView = "grid" | "teachers";

/**
 * Who teaches which subject to which class this session.
 *
 * The coverage view answers whether every class subject has a teacher. Class
 * teachers and timetable clashes are separate inner views because they are
 * different facts: one person looks after a class, while a timetable clash
 * means one person has been placed in two lessons at the same time.
 *
 * A subject with nobody teaching it and one taught only by assistants remain
 * separate warnings. The first has no teacher at all; the second has teachers
 * but nobody designated to enter its results.
 */
export default function TeachingDuties() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("coverage");
  const [view, setView] = useState<CoverageView>("grid");
  const [pairing, setPairing] = useState<CoverageCell | null>(null);
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [page, setPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);
  const [classTeacherPage, setClassTeacherPage] = useState(1);
  const [drawer, setDrawer] = useState<StaffDrawerRequest | null>(null);

  // The unfiltered page owns the global total even while the work list below
  // is narrowed to gaps. Without it, "All class subjects" would shrink when
  // the checkbox was pressed and turn a filter into a changed school fact.
  const summaryQuery = useGetTeachingCoverageQuery({ page: 1 });
  const coverage = useGetTeachingCoverageQuery(
    onlyGaps ? { page, only_gaps: true } : { page },
  );
  const { data: classData, isLoading: loadingClasses } = useGetClassesQuery(
    { page: classTeacherPage },
    { skip: section !== "classTeachers" },
  );
  const staffQuery = useGetStaffListQuery(
    { page: teacherPage, teaching: "true" },
    { skip: section !== "coverage" || view !== "teachers" },
  );

  const cells = useMemo(() => coverage.data?.data ?? [], [coverage.data]);
  const classes = useMemo(() => classData?.data ?? [], [classData]);
  const teachers = useMemo(() => staffQuery.data?.data ?? [], [staffQuery.data]);
  const pagination = coverage.data?.pagination;
  const teacherPagination = staffQuery.data?.pagination;
  const classPagination = classData?.pagination;
  const summary = teachingSummary(
    summaryQuery.data?.pagination.totalItems ?? 0,
    summaryQuery.data?.coverage_gaps ?? 0,
    summaryQuery.data?.lead_gaps ?? 0,
  );

  if (summaryQuery.isError || coverage.isError) {
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
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
          Teaching duties
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-01">
          {summaryQuery.data
            ? `See who teaches every class subject in ${summaryQuery.data.session.name}, set class teachers, and follow timetable clashes.`
            : "See who teaches every class subject, set class teachers, and follow timetable clashes."}
        </p>
      </div>

      <div
        data-guide="staff-teaching.summary"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <KpiCard
          label="Class subjects"
          value={summaryQuery.isLoading ? "..." : summary.total}
          foot="Expected this year"
        />
        <KpiCard
          label="Fully covered"
          value={summaryQuery.isLoading ? "..." : summary.covered}
          foot="Teacher and main teacher set"
          tone="live"
        />
        <KpiCard
          label="No teacher"
          value={summaryQuery.isLoading ? "..." : summary.noTeacher}
          foot="Nobody assigned"
          tone={summary.noTeacher ? "alert" : "default"}
        />
        <KpiCard
          label="No main teacher"
          value={summaryQuery.isLoading ? "..." : summary.noMainTeacher}
          foot="Results have no owner"
          tone={summary.noMainTeacher ? "warn" : "default"}
        />
      </div>

      <Surface
        as="section"
        data-guide="staff-teaching.toolbar"
        className="grid gap-4 px-4 py-4 sm:px-5"
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="max-w-full overflow-x-auto">
            <SegmentedToggle
              ariaLabel="Teaching duties section"
              value={section}
              onChange={setSection}
              options={[
                {
                  value: "coverage",
                  label: "Subject coverage",
                  icon: BookOpenCheck,
                },
                {
                  value: "classTeachers",
                  label: "Class teachers",
                  icon: UserRoundCheck,
                },
                {
                  value: "clashes",
                  label: "Timetable clashes",
                  icon: CalendarClock,
                },
              ]}
            />
          </div>
          {summaryQuery.data && (
            <span className="rounded-full bg-gray-04 px-3 py-1.5 text-xs font-medium text-gray-01">
              {summaryQuery.data.session.name}
            </span>
          )}
        </div>

        {section === "coverage" && (
          <div className="flex min-w-0 flex-wrap items-center gap-2.5 border-t border-white-02 pt-4">
            <SegmentedToggle
              ariaLabel="Teaching coverage"
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
                  "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition-colors",
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
            {!summaryQuery.isLoading && (
              <p className="min-w-0 text-xs text-gray-05 sm:ml-auto">
                {summaryQuery.data?.headline}
              </p>
            )}
          </div>
        )}
      </Surface>

      {section === "coverage" && view === "grid" && (
        <Surface
          as="section"
          data-guide="staff-teaching.coverage"
          className="px-4 py-5 sm:px-6"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-black-01">
                Subject coverage
              </h2>
              <p className="mt-1 text-xs text-gray-05">
                Open a subject to add a teacher or change who enters its
                results.
              </p>
            </div>
            {onlyGaps && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                <AlertTriangle className="size-3.5" />
                Attention only
              </span>
            )}
          </div>

          {coverage.isLoading || coverage.isFetching ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : cells.length ? (
            <>
              <CoverageGrid cells={cells} onOpen={setPairing} />
              <div className="mt-5 border-t border-white-02 pt-4">
                <Pager
                  page={pagination?.currentPage ?? 1}
                  totalPages={pagination?.totalPages ?? 1}
                  onGo={setPage}
                />
                {(pagination?.totalPages ?? 1) > 1 && (
                  <p className="mt-2 text-center text-xs text-gray-05">
                    {pagination?.totalItems} class subjects in this view
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-[13px] text-gray-05">
              {onlyGaps
                ? "Every subject has a teacher, and each one has a main teacher."
                : "No classes and subjects yet. They are built in Academic Structure."}
            </p>
          )}
        </Surface>
      )}

      {section === "coverage" && view === "teachers" && (
        <Surface as="section" className="px-4 py-5 sm:px-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-black-01">By teacher</h2>
            <p className="mt-1 text-xs text-gray-05">
              Open a teacher to see and change everything they carry. Assignment
              counts have no workload target to compare against.
            </p>
          </div>

          {staffQuery.isLoading || staffQuery.isFetching ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : teachers.length ? (
            <>
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
                      className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-white-02 px-3.5 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-sm active:scale-[0.99]"
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
                      <span className="shrink-0 text-xs text-gray-05">
                        {person.teaching_load}{" "}
                        {person.teaching_load === 1 ? "duty" : "duties"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-white-02 pt-4">
                <Pager
                  page={teacherPagination?.currentPage ?? 1}
                  totalPages={teacherPagination?.totalPages ?? 1}
                  onGo={setTeacherPage}
                />
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-[13px] text-gray-05">
              Nobody has teaching duties yet.
            </p>
          )}
        </Surface>
      )}

      {section === "classTeachers" && (
        <Surface as="section" className="px-4 py-5 sm:px-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-black-01">
              Class teachers
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-gray-05">
              The person who looks after the class, its register and its day.
              Teaching a subject to that class is a separate duty.
            </p>
          </div>
          {loadingClasses ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
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
              <div className="mt-5 border-t border-white-02 pt-4">
                <Pager
                  page={classPagination?.currentPage ?? 1}
                  totalPages={classPagination?.totalPages ?? 1}
                  onGo={setClassTeacherPage}
                />
              </div>
            </>
          )}
        </Surface>
      )}

      {section === "clashes" && (
        <Surface as="section" className="px-4 py-5 sm:px-6">
          <div className="mb-4">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-black-01">
              Timetable clashes
              <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-05">
                Reported
              </span>
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-gray-05">
              Found when a lesson is placed, not when a subject is assigned.
              Open the affected teacher's timetable to resolve the collision.
            </p>
          </div>
          <ClashPanel />
        </Surface>
      )}

      {section === "coverage" && (
        <PermissionGate permission={P.ASSIGN_TEACHING}>
          <p className="text-xs text-gray-05">
            Open any subject to change who teaches it, or switch to By teacher
            to change everything one person carries.
          </p>
        </PermissionGate>
      )}

      {openPairing && (
        <PairingDrawer cell={openPairing} onClose={() => setPairing(null)} />
      )}

      <StaffDrawers request={drawer} onClose={() => setDrawer(null)} onRequest={setDrawer} />
    </PageShell>
  );
}
