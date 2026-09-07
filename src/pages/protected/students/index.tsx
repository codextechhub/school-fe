import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LayoutGrid, List, Search, Upload, UserPlus, Users, X } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { PageShell } from "@/components/layout/page-shell";
import BulkImportDrawer from "@/components/custom/bulk-import-drawer";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { ExportButton } from "@/components/custom/export-button";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { useStudentsLens } from "@/hooks/use-students-lens";
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

import { StudentDrawers, type DrawerRequest } from "./drawers";
import { FiltersPopover } from "./filters-popover";
import { OverviewCard } from "./overview-card";
import { buildWorkQueue, type QueueRow } from "./work-queue";
import { StudentCards } from "./student-cards";
import { PersonAvatar } from "./person-avatar";
import { StudentStatusBadge } from "./status-badge";

/**
 * The student directory. The module's front door, and its biggest screen.
 *
 * Read-only in this phase, deliberately: the whole API contract, the envelope,
 * the pagination shape and the branch lens are proven here before a single
 * mutation is written. The row menu's Edit, Change status and Transfer arrive
 * with the drawer bundle.
 *
 * **The tiles and the table come from two different endpoints and must agree.**
 * Both are given the same branch. They did not use to be: `/students/summary/`
 * took no branch, so the tiles read 87 over a table showing 49, with nothing on
 * the page marking which number was which. If a figure here is ever fed from a
 * call that does not carry `branch`, that gap comes straight back.
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

  /** Send the reader where the row's verb says. */
  function actOnQueueRow(row: QueueRow) {
    if (row.action === "review") {
      navigate(routesPath.PROTECTED.STUDENTS.APPLICANTS);
      return;
    }
    // Place and Move both end in the same drawer, because both are a class
    // assignment - the difference is only whether the student had one.
    if (row.studentId) {
      setDrawer({ kind: "transfer", studentId: row.studentId });
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
          <h2 className="text-lg font-semibold text-black-01">
            Student Directory
          </h2>
          <p className="mt-1 text-sm text-gray-01">
            Every student at {multiBranch ? branchLabel : "this school"}
            {summary?.session ? ` for ${summary.session}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <PermissionGate permission={P.IMPORT_STUDENTS}>
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="inline-flex h-10.5 items-center gap-2 rounded-lg border border-white-02 bg-white px-4 text-sm font-medium text-gray-01 hover:bg-gray-03 hover:text-primary"
            >
              <Upload className="size-4" />
              Bulk import
            </button>
          </PermissionGate>
          <PermissionGate permission={P.ENROLL_STUDENT}>
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

      {/* ── Search, filters, export, view ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-55 max-w-85 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <input
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
                // The two ask different questions of the same column, so one
                // has to give: a class filter and "no class at all" cannot
                // both be true, and leaving the old class on returns nothing.
                if (next.unassignedOnly) setClassId("all");
              }
            })
          }
          onClear={clearAll}
          classes={classes}
          levels={levels}
          statuses={summary?.by_status ?? []}
        />

        {/* The branch goes by NAME, not id: the export filters on the branch's
            name and a translator has no tenant to resolve one into the other.
            Sending it means the file narrows exactly as the table does - which
            a student export can do and a catalogue export cannot, because a
            student belongs to one branch and is never school-wide. */}
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

        {/* The app's toggle, not a ninth copy of it. Its own comment warned
            that five hand-rolled ones existed and a sixth was coming; this
            screen had written the seventh. The sliding marker is the part that
            cannot be reproduced consistently by hand. */}
        <SegmentedToggle
          className="ml-auto"
          ariaLabel="Directory layout"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List", icon: List },
            { value: "cards", label: "Cards", icon: LayoutGrid },
          ]}
        />
      </div>

      {/* Two or more filters is where a reader loses track of what is applied,
          so the chips appear then rather than for every single one. */}
      {chips.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => resetTo(chip.clear)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-04 px-2.5 py-1 text-xs text-black-01 hover:bg-white-02"
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
        <p className="text-xs text-gray-05" aria-live="polite">
          {pagination?.totalItems ?? 0}{" "}
          {pagination?.totalItems === 1 ? "student" : "students"} match
          {pagination?.totalItems === 1 ? "es" : ""} your filters
        </p>
      )}

      {view === "list" ? (
        <CustomTable
          tableHeaderList={[
            "Student",
            "Admission no.",
            "Class",
            "Status",
            "Primary guardian",
            // The row-menu column. CustomTable renders a sixth cell when
            // `dropDown` is set, and without this the header row is one short -
            // so every heading after it sits over the wrong column at the
            // widths where the table stops stretching.
            "",
          ]}
          loading={listLoading || isFetching}
          defaultBodyList={rows}
          dropDown
          dropDownList={[
            {
              label: "Open profile",
              onActionClick: (row: { _id: number }) =>
                navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(row._id)),
            },
            {
              label: "Edit record",
              onActionClick: (row: { _id: number }) =>
                setDrawer({ kind: "edit", studentId: row._id }),
            },
            {
              label: "Change status",
              onActionClick: (row: { _id: number }) =>
                setDrawer({ kind: "status", studentId: row._id }),
            },
            {
              // One item, two words, because the route is the same either way
              // and the difference is only whether the student had a class.
              label: "Assign or transfer class",
              onActionClick: (row: { _id: number }) =>
                setDrawer({ kind: "transfer", studentId: row._id }),
            },
            {
              label: "Link a guardian",
              onActionClick: (row: { _id: number }) =>
                setDrawer({ kind: "guardian", studentId: row._id }),
            },
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
              <span className="flex min-w-0 items-center gap-2.5">
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
                  <span className="block truncate text-xs text-gray-05">
                    {s.level_name || "No level"}
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
            Status: (
              <StudentStatusBadge status={s.status} label={s.status_label} />
            ),
            "Primary guardian": s.primary_guardian || "None linked",
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


