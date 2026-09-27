import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  LayoutGrid,
  List,
  Search,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { usePermissions } from "@/hooks/use-permissions";
import { PageShell } from "@/components/layout/page-shell";
import BulkImportDrawer from "@/components/custom/bulk-import-drawer";
import { canRunImport } from "@/components/custom/import-wizard/import-access";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { ExportButton } from "@/components/custom/export-button";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { useStudentsLens } from "@/hooks/use-students-lens";
import { cn } from "@/lib/utils";
import {
  useGetClassSeatsQuery,
  useGetStudentSummaryQuery,
  useGetStudentsQuery,
  useGetUnplacedStudentsQuery,
} from "@/redux/services/students/students-api";
import type {
  StudentRow,
  StudentStatus,
} from "@/redux/services/students/students-types";
import { useGetClassesQuery } from "@/redux/services/academics/academics-api";

import {
  StudentDrawers,
  type DrawerKind,
  type DrawerRequest,
} from "./drawers";
import { ENROL_PERMISSIONS, canOpenStudentDrawer } from "./drawers/access";
import { FiltersPopover } from "./filters-popover";
import { OverviewCard } from "./overview-card";
import { buildWorkQueue, type QueueRow } from "./work-queue";
import { StudentCards } from "./student-cards";
import { PersonAvatar } from "./person-avatar";
import { StudentStatusBadge } from "./status-badge";
import { getDirectoryRecordHealth } from "./profile-completeness";

/**
 * The student directory. The module's front door, and its biggest screen.
 *
 * The summary, work queue, filters, list, card view, and record actions all use
 * the same branch and session lens. The directory endpoint exposes only safe
 * list fields, so its record-health indicator never reads private profile data.
 */
export default function StudentDirectory() {
  const navigate = useNavigate();
  const { lens, multiBranch, label: branchLabel, sessionName, pastYear } =
    useStudentsLens();

  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("all");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState<StudentStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "cards">("list");
  const [importing, setImporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [drawer, setDrawer] = useState<DrawerRequest | null>(null);
  const { hasPermission } = usePermissions();
  const canOpen = (kind: DrawerKind) =>
    canOpenStudentDrawer(kind, hasPermission, { pastYear });

  const listArgs = {
    ...lens,
    search: search.trim() || undefined,
    // "unassigned" is not a class id: the server reads it as "on the roll with
    // no class", which is a different query from any particular class.
    class: unassignedOnly ? "unassigned" : classId === "all" ? undefined : classId,
    level: level === "all" ? undefined : level,
    status: status === "all" ? undefined : status,
    page,
  };

  const {
    data: listData,
    isLoading: listLoading,
    isFetching,
    isError: listError,
    refetch,
  } = useGetStudentsQuery(listArgs);
  // The same lens the table gets, on both axes. These two used to disagree.
  const { data: summaryData, isLoading: summaryLoading } =
    useGetStudentSummaryQuery(lens);
  // The filter dropdowns' options. Classes are Academic Structure's, not ours.
  const { data: classesData } = useGetClassesQuery();

  // The three sources the work queue is composed from. All three are already
  // cached by other screens - the nav badge fetches unplaced, the applicants
  // board fetches applicants - so this costs a request only on a cold page.
  const { data: unplacedData } = useGetUnplacedStudentsQuery(lens);
  const { data: applicantsData } = useGetStudentsQuery({
    ...lens,
    status: "APPLICANT",
  });
  const { data: seatsData } = useGetClassSeatsQuery(lens);

  const rows = useMemo(() => listData?.data ?? [], [listData]);
  const pagination = listData?.pagination;
  const summary = summaryData?.data;
  const classes = useMemo(() => classesData?.data ?? [], [classesData]);

  const { rows: queue, overflow } = useMemo(
    () =>
      buildWorkQueue({
        summary: summaryData?.data,
        unplaced: unplacedData?.data ?? [],
        applicants: applicantsData?.data ?? [],
        seats: seatsData?.data ?? [],
      }),
    [summaryData, unplacedData, applicantsData, seatsData],
  );

  /**
   * Send the reader where the row's verb says.
   *
   * Place and Move both open the class drawer, because both are a class
   * assignment and differ only in whether the student had one. A reader who
   * may not assign a class, or who is reading a past year, is taken to the
   * student's profile instead, where the record says what is missing.
   */
  function actOnQueueRow(row: QueueRow) {
    if (row.action === "review") {
      navigate(routesPath.PROTECTED.STUDENTS.APPLICANTS);
      return;
    }
    if (row.studentId) {
      if (canOpen("transfer")) {
        setDrawer({ kind: "transfer", studentId: row.studentId });
      } else {
        navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.studentId));
      }
      return;
    }
    navigate(routesPath.PROTECTED.STUDENTS.ASSIGN);
  }

  // Levels come from the classes the school actually runs, so the filter can
  // never offer a level with no class behind it.
  const levels = useMemo(() => {
    const seen = new Map<number, string>();
    for (const c of classes) {
      if (c.level && c.level_name) seen.set(c.level, c.level_name);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [classes]);

  const facets =
    (classId !== "all" ? 1 : 0) +
    (level !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (unassignedOnly ? 1 : 0);
  const anyFilter = facets > 0 || search.trim().length > 0;

  const chips = [
    search.trim() && { label: `"${search.trim()}"`, clear: () => setSearch("") },
    classId !== "all" && {
      label: classes.find((c) => String(c.id) === classId)?.name ?? "Class",
      clear: () => setClassId("all"),
    },
    level !== "all" && {
      label: levels.find((l) => String(l.id) === level)?.name ?? "Level",
      clear: () => setLevel("all"),
    },
    status !== "all" && {
      label: summary?.by_status.find((s) => s.status === status)?.label ?? status,
      clear: () => setStatus("all"),
    },
    unassignedOnly && {
      label: "Unassigned class",
      clear: () => setUnassignedOnly(false),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  function resetTo(next: () => void) {
    next();
    setPage(1);
  }

  function clearAll() {
    setSearch("");
    setClassId("all");
    setLevel("all");
    setStatus("all");
    setUnassignedOnly(false);
    setPage(1);
  }

  if (listError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Users}
          title="We could not load your students"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      {/* ── Who this page is about, and the two ways in ──────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
            Student Directory
          </h1>
          <p className="mt-1 text-sm text-gray-01">
            Every student at {multiBranch ? branchLabel : "this school"}
            {summary?.session ? ` for ${summary.session}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {canRunImport("students", hasPermission) && (
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="inline-flex h-10.5 items-center gap-2 rounded-lg border border-white-02 bg-white px-4 text-sm font-medium text-gray-01 hover:bg-gray-03 hover:text-primary"
            >
              <Upload className="size-4" />
              Import
            </button>
          )}
          <PermissionGate permission={ENROL_PERMISSIONS} mode="all">
            <button
              type="button"
              onClick={() => navigate(routesPath.PROTECTED.STUDENTS.ENROL)}
              className="inline-flex h-10.5 items-center gap-2 rounded-lg bg-primary px-4.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              <UserPlus className="size-4" />
              Enrol student
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Under a past year the roll and the classes are that year's, and the
          status chips are not - status has no year to read. Said plainly,
          because a Graduated chip beside a 2026 register otherwise looks like
          a claim about 2026. */}
      {pastYear && (
        <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
          Showing the {sessionName} roll and the classes held that year.
          Statuses are current: the school records one status per student, not
          one per year.
        </p>
      )}

      <OverviewCard
        summary={summary}
        loading={summaryLoading}
        queue={queue}
        overflow={overflow}
        onPickStatus={(next) => resetTo(() => setStatus(next))}
        onAct={actOnQueueRow}
        onOpenApplicants={() =>
          navigate(routesPath.PROTECTED.STUDENTS.APPLICANTS)
        }
      />

      <div className="rounded-xl border border-border bg-white p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-55 flex-[1_1_20rem] lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              data-guide="students-directory.search"
              value={search}
              onChange={(e) => resetTo(() => setSearch(e.target.value))}
              placeholder="Search name or admission no."
              aria-label="Search students"
              className="h-10.5 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <FiltersPopover
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            value={{ classId, level, status, unassignedOnly }}
            onChange={(next) =>
              resetTo(() => {
                if (next.classId !== undefined) setClassId(next.classId);
                if (next.level !== undefined) setLevel(next.level);
                if (next.status !== undefined) setStatus(next.status);
                if (next.unassignedOnly !== undefined) {
                  setUnassignedOnly(next.unassignedOnly);
                  if (next.unassignedOnly) setClassId("all");
                }
              })
            }
            onClear={clearAll}
            classes={classes}
            levels={levels}
            statuses={summary?.by_status ?? []}
          />

          <ExportButton
            screen="students.directory"
            params={{
              search: search.trim() || undefined,
              status: status === "all" ? undefined : status,
              class: classId === "all" ? undefined : classId,
              level: level === "all" ? undefined : level,
              branch_name: lens.branch !== undefined ? branchLabel : undefined,
              session_name: sessionName ?? undefined,
            }}
          />

          <SegmentedToggle
            className="sm:ml-auto"
            ariaLabel="Directory layout"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List", icon: List },
              { value: "cards", label: "Cards", icon: LayoutGrid },
            ]}
          />
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => resetTo(chip.clear)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/15"
              >
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {anyFilter && !listLoading && (
          <p className="mt-2 text-xs text-gray-05" aria-live="polite">
            {pagination?.totalItems ?? 0}{" "}
            {pagination?.totalItems === 1 ? "student" : "students"} match
            {pagination?.totalItems === 1 ? "es" : ""} your filters
          </p>
        )}
      </div>

      {view === "list" ? (
        <CustomTable
          tableHeaderList={[
            "Student",
            "Admission no.",
            "Class",
            "Primary guardian",
            "Record",
            "",
          ]}
          loading={listLoading || isFetching}
          cardBreakpoint="lg"
          defaultBodyList={rows}
          dropDown
          dropDownList={[
            {
              label: "Open profile",
              onActionClick: (row: { _id: number }) =>
                navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(row._id)),
            },
            ...(
              [
                { kind: "edit", label: "Edit record" },
                { kind: "status", label: "Change status" },
                // One item, two words: the route is the same either way.
                { kind: "transfer", label: "Assign or transfer class" },
                { kind: "guardian", label: "Link a guardian" },
              ] as const
            )
              .filter(({ kind }) => canOpen(kind))
              .map(({ kind, label }) => ({
                label,
                onActionClick: (row: { _id: number }) =>
                  setDrawer({ kind, studentId: row._id }),
              })),
          ]}
          tableBodyList={rows.map((s) => ({
            // Carried so the row menu can find the student back; CustomTable
            // hands the DISPLAY row to onActionClick, not the source record.
            _id: s.id,
            // Avatar, name, and the level UNDER the name rather than in a
            // column of its own. A level is a property of the class, so a
            // separate column repeated a fact already on the row and pushed
            // the guardian off the fold on a laptop.
            Student: (
              <span
                data-guide="students-directory.row"
                className="flex min-w-0 items-center gap-2.5"
              >
                <PersonAvatar
                  name={s.full_name}
                  photoUrl={s.photo_url}
                  className="size-8.5 shrink-0"
                  textClassName="text-xs"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-black-01">
                    {s.full_name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs text-gray-05">
                      {s.level_name || "No level"}
                    </span>
                    <StudentStatusBadge
                      status={s.status}
                      label={s.status_label}
                    />
                  </span>
                </span>
              </span>
            ),
            // "Not issued" rather than a dash: an applicant legitimately has no
            // number yet, which is a different thing from a missing value.
            "Admission no.": s.student_number || "Not issued",
            // A chip, and amber when there is none: a student with no class is
            // the one row on this table somebody has to act on, so it should
            // not read like ordinary text.
            Class: s.class_name ? (
              <span className="inline-flex rounded-full bg-white-03 px-2 py-0.5 text-xs font-medium text-primary">
                {s.class_name}
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                Unassigned
              </span>
            ),
            "Primary guardian": s.primary_guardian || "None linked",
            Record: <RecordHealth student={s} />,
          }))}
          onRowClick={(student: StudentRow) => {
            if (student?.id) {
              navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(student.id));
            }
          }}
          currentPage={pagination?.currentPage ?? 1}
          totalPage={pagination?.totalPages ?? 1}
          onPageChange={(next) => setPage(Number(next) || 1)}
          emptyText={
            anyFilter ? "No students match your filters" : "No students yet"
          }
        />
      ) : (
        <StudentCards
          loading={listLoading || isFetching}
          rows={rows}
          onOpen={(id) =>
            navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(id))
          }
          page={pagination?.currentPage ?? 1}
          totalPages={pagination?.totalPages ?? 1}
          onPageChange={setPage}
          emptyText={
            anyFilter ? "No students match your filters" : "No students yet"
          }
        />
      )}

      <StudentDrawers request={drawer} onClose={() => setDrawer(null)} />
      {/* The console component, not a second implementation of it.
          Bulk import is a THING YOU DO TO the directory, not a place you go -
          so it is a drawer over this screen rather than a nav item and a page
          of its own. That is also how console launches it, from the list the
          rows will land in. */}
      <BulkImportDrawer
        open={importing}
        datasetType="students"
        title="Import students"
        description="Load a roll from a spreadsheet. Nothing is written until you confirm."
        returnLabel="Back to students"
        onClose={() => setImporting(false)}
        onFinished={() => {
          void refetch();
        }}
      />
    </PageShell>
  );
}

function RecordHealth({ student }: { student: StudentRow }) {
  const health = getDirectoryRecordHealth(student);

  return (
    <span className="block min-w-28">
      <span className="block h-1.5 overflow-hidden rounded-full bg-gray-04">
        <span
          className={cn(
            "block h-full rounded-full",
            health.gaps === 0 ? "bg-emerald-600" : "bg-amber-500",
          )}
          style={{ width: `${health.percentage}%` }}
        />
      </span>
      <span className="mt-1 block text-[11px] text-gray-05">
        {health.gaps === 0
          ? "Ready"
          : `${health.gaps} ${health.gaps === 1 ? "gap" : "gaps"}`}
      </span>
    </span>
  );
}
