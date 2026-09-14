import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeftRight, BookOpenCheck, LoaderCircle, Users } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { SearchSelect } from "@/components/custom/search-select";
import { Panel as Surface } from "@/components/custom/surface";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { PageShell } from "@/components/layout/page-shell";
import { useStudentsLens } from "@/hooks/use-students-lens";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import {
  useBulkAssignClassMutation,
  useGetClassRosterQuery,
  useGetClassSeatsQuery,
  useGetUnplacedStudentsQuery,
  useLazyGetClassRosterQuery,
} from "@/redux/services/students/students-api";
import type { BulkResultRow, ClassSeats, StudentRow } from "@/redux/services/students/students-types";
import { routesPath } from "@/routes/routesPath";
import { writeErrorMessage } from "@/utils/api-error";

import { EmptyRing } from "../empty-ring";
import { formatDate } from "../format";
import { PersonAvatar } from "../person-avatar";
import { StudentStatusBadge } from "../status-badge";
import { TransferDrawer } from "../drawers/transfer-drawer";
import {
  assignmentImpact,
  loadNote,
  mergeRosterRows,
} from "./class-roster-model";

type View = "unplaced" | "roster";
const ROSTER_BATCH = 7;

/**
 * Placing children, and reading a class register.
 *
 * The unassigned list is a work queue that should empty. The register is a
 * reference list that stays useful afterwards. Both live in the URL so another
 * screen can link directly to the relevant register.
 *
 * A register reveals seven students at a time inside a bounded scroll area.
 * Later API pages load only when the reader reaches the bottom, so a large
 * class does not turn the page into an unbounded list or fetch unseen records.
 */
export default function ClassesAndTransfers() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { lens, multiBranch, label: branchLabel, sessionName } = useStudentsLens();
  const view = params.get("tab") === "roster" ? "roster" : "unplaced";
  const classParam = params.get("class") ?? "";

  const [unplacedPage, setUnplacedPage] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [target, setTarget] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [refusals, setRefusals] = useState<BulkResultRow[]>([]);
  const [moving, setMoving] = useState<StudentRow | null>(null);

  const { data: classesData } = useGetClassSeatsQuery(lens);
  const classes = useMemo(() => classesData?.data ?? [], [classesData]);
  const unplacedQuery = useGetUnplacedStudentsQuery({ ...lens, page: unplacedPage });
  const unplaced = useMemo(() => unplacedQuery.data?.data ?? [], [unplacedQuery.data]);
  const unplacedPagination = unplacedQuery.data?.pagination;
  const unplacedTotal = unplacedPagination?.totalItems ?? unplaced.length;

  const rosterClassId = Number(classParam) || classes[0]?.id;
  const {
    currentData: rosterData,
    isLoading: rosterInitialLoading,
    isFetching: rosterFetching,
    isError: rosterError,
    refetch: refetchRoster,
  } = useGetClassRosterQuery(
    { classId: rosterClassId as number, page: 1 },
    { skip: view !== "roster" || !rosterClassId },
  );
  const [loadRosterPage, { isFetching: loadingMore }] = useLazyGetClassRosterQuery();
  const [loadedRoster, setLoadedRoster] = useState<StudentRow[]>([]);
  const [visibleRosterCount, setVisibleRosterCount] = useState(ROSTER_BATCH);
  const [nextRosterPage, setNextRosterPage] = useState<number | null>(null);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const rosterLoadLock = useRef(false);
  const activeRosterClass = useRef<number | undefined>(rosterClassId);

  useEffect(() => {
    activeRosterClass.current = rosterClassId;
    setLoadedRoster([]);
    setVisibleRosterCount(ROSTER_BATCH);
    setNextRosterPage(null);
    setLoadMoreError(false);
    rosterLoadLock.current = false;
  }, [rosterClassId]);

  useEffect(() => {
    if (!rosterData || !rosterClassId) return;
    setLoadedRoster(rosterData.data);
    setVisibleRosterCount(ROSTER_BATCH);
    setNextRosterPage(
      rosterData.pagination.next ? rosterData.pagination.currentPage + 1 : null,
    );
    setLoadMoreError(false);
    rosterLoadLock.current = false;
  }, [rosterClassId, rosterData]);

  const [bulkAssign, { isLoading: assigning }] = useBulkAssignClassMutation();

  function selectView(next: View) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("tab", next);
    if (next === "unplaced") nextParams.delete("class");
    setParams(nextParams, { replace: true });
  }

  function setRosterClass(id: string) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("tab", "roster");
    nextParams.set("class", id);
    setParams(nextParams, { replace: true });
  }

  const pickedBranches = new Set(
    unplaced.filter((student) => picked.includes(student.id)).map((student) => student.branch),
  );
  const classFits = (schoolClass: ClassSeats) =>
    schoolClass.branch == null ||
    pickedBranches.size === 0 ||
    (pickedBranches.size === 1 && pickedBranches.has(schoolClass.branch));
  const targetClass = classes.find((schoolClass) => String(schoolClass.id) === target);
  const rosterClass = classes.find((schoolClass) => schoolClass.id === rosterClassId);
  const classOptions = useMemo(
    () =>
      classes.map((schoolClass) => ({
        value: String(schoolClass.id),
        label:
          schoolClass.capacity == null
            ? `${schoolClass.name} · ${schoolClass.used} enrolled`
            : `${schoolClass.name} · ${schoolClass.used}/${schoolClass.capacity} · ${loadNote(schoolClass)}`,
      })),
    [classes],
  );

  async function assign(allowOver = false) {
    if (!target || picked.length === 0) return;
    setRefusals([]);
    try {
      const result = await bulkAssign({
        student_ids: picked,
        school_class: Number(target),
        allow_over_capacity: allowOver,
      }).unwrap();
      const failed = (result.data.results ?? []).filter((row) => !row.ok);
      setPicked([]);
      setAcknowledged(false);
      setUnplacedPage(1);
      if (failed.length === 0) toast.success(result.message);
      else {
        setRefusals(failed);
        toast.warning(result.message);
      }
    } catch (error) {
      const message = writeErrorMessage(error, "We could not assign those students.");
      if (/capacit/i.test(message) && !allowOver) {
        setAcknowledged(true);
        toast.warning(`${message} Press Assign again to go ahead anyway.`);
        return;
      }
      toast.error(message);
    }
  }

  async function revealMoreRoster() {
    if (rosterLoadLock.current) return;
    if (visibleRosterCount < loadedRoster.length) {
      setVisibleRosterCount((current) =>
        Math.min(current + ROSTER_BATCH, loadedRoster.length),
      );
      return;
    }
    if (!rosterClassId || nextRosterPage == null) return;

    const requestedClass = rosterClassId;
    rosterLoadLock.current = true;
    setLoadMoreError(false);
    try {
      const response = await loadRosterPage({
        classId: requestedClass,
        page: nextRosterPage,
      }).unwrap();
      if (activeRosterClass.current !== requestedClass) return;
      setLoadedRoster((current) => {
        const merged = mergeRosterRows(current, response.data);
        setVisibleRosterCount((visible) =>
          Math.min(visible + ROSTER_BATCH, merged.length),
        );
        return merged;
      });
      setNextRosterPage(
        response.pagination.next ? response.pagination.currentPage + 1 : null,
      );
    } catch {
      if (activeRosterClass.current === requestedClass) setLoadMoreError(true);
    } finally {
      rosterLoadLock.current = false;
    }
  }

  if (unplacedQuery.isError && view === "unplaced") {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Users}
          title="We could not load the students waiting for a class"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => unplacedQuery.refetch()}
        />
      </PageShell>
    );
  }

  const visibleRoster = loadedRoster.slice(0, visibleRosterCount);
  const rosterHasMore = visibleRosterCount < loadedRoster.length || nextRosterPage != null;

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
          Classes &amp; transfers
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-01">
          Place students who have no class, and move students between classes
          {multiBranch
            ? branchLabel === "All branches"
              ? " across all branches"
              : ` at ${branchLabel}`
            : " in this school"}
          {sessionName ? ` during ${sessionName}` : ""}.
        </p>
      </div>

      <ViewSwitch value={view} unplacedCount={unplacedTotal} onChange={selectView} />

      {refusals.length > 0 && (
        <RefusalNotice rows={refusals} onDismiss={() => setRefusals([])} />
      )}

      {view === "unplaced" ? (
        <section className="grid min-w-0 gap-3" aria-labelledby="unplaced-heading">
          <div className="min-w-0">
            <h2 id="unplaced-heading" className="font-semibold text-black-01">
              {unplacedTotal === 1
                ? "1 student has no class"
                : `${unplacedTotal} students have no class`}
            </h2>
            <p className="mt-0.5 text-xs text-gray-05">
              Select one or more students, then choose the class they are joining.
            </p>
          </div>

          {picked.length > 0 && (
            <AssignmentBar
              count={picked.length}
              classes={classes}
              target={target}
              targetClass={targetClass}
              assigning={assigning}
              acknowledged={acknowledged}
              classFits={classFits}
              onTargetChange={(value) => {
                setTarget(value);
                setAcknowledged(false);
              }}
              onAssign={() => void assign(acknowledged)}
              onClear={() => {
                setPicked([]);
                setAcknowledged(false);
              }}
            />
          )}

          {unplacedTotal === 0 && !unplacedQuery.isLoading ? (
            <EmptyRing>Every student has a class</EmptyRing>
          ) : (
            <CustomTable
              tableHeaderList={[
                "",
                "Student",
                "Admission no.",
                "Status",
                "Level applied for",
                "Primary guardian",
                "Admitted",
              ]}
              loading={unplacedQuery.isLoading || unplacedQuery.isFetching}
              defaultBodyList={unplaced}
              tableBodyList={unplaced.map((student) => ({
                "": (
                  <Checkbox
                    aria-label={`Select ${student.full_name}`}
                    checked={picked.includes(student.id)}
                    onCheckedChange={() =>
                      setPicked((current) =>
                        current.includes(student.id)
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id],
                      )
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                ),
                Student: <StudentName student={student} />,
                "Admission no.": student.student_number || "Not issued",
                Status: (
                  <StudentStatusBadge status={student.status} label={student.status_label} />
                ),
                "Level applied for": student.level_name || "Not set",
                "Primary guardian": student.primary_guardian || "None linked",
                Admitted: student.enrolment_date
                  ? formatDate(student.enrolment_date)
                  : "Not recorded",
              }))}
              onRowClick={(student: StudentRow) =>
                navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(student.id))
              }
              currentPage={unplacedPagination?.currentPage ?? 1}
              totalPage={unplacedPagination?.totalPages ?? 1}
              onPageChange={(page) => {
                setPicked([]);
                setUnplacedPage(Number(page) || 1);
              }}
              hidePagination={(unplacedPagination?.totalPages ?? 1) < 2}
              cardBreakpoint="lg"
              emptyText="Nobody is waiting for a class"
            />
          )}
        </section>
      ) : (
        <section className="grid min-w-0 gap-3" aria-labelledby="roster-heading">
          <Surface className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
              <div className="min-w-0 flex-1 basis-64 sm:max-w-sm">
                <SearchSelect
                  label="Class"
                  options={classOptions}
                  value={rosterClassId ? String(rosterClassId) : ""}
                  onChange={(event) => setRosterClass(event.target.value)}
                  placeholder="Search for a class"
                />
              </div>
              {rosterClass && <ClassLoad schoolClass={rosterClass} />}
            </div>
          </Surface>

          <Surface as="section" className="overflow-hidden" aria-labelledby="roster-heading">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h2 id="roster-heading" className="font-semibold text-black-01">
                {rosterClass?.name ?? "Class register"}
              </h2>
              <p className="mt-0.5 text-xs text-gray-05">
                {rosterData?.pagination.totalItems ?? rosterClass?.used ?? 0}{" "}
                {(rosterData?.pagination.totalItems ?? rosterClass?.used ?? 0) === 1
                  ? "student"
                  : "students"}
                {rosterClass?.level_name ? ` · ${rosterClass.level_name}` : ""}
              </p>
            </div>

            <div
              className="max-h-[28rem] min-w-0 overflow-y-auto overscroll-contain"
              aria-label="Class student list"
              tabIndex={0}
              onScroll={(event) => {
                const panel = event.currentTarget;
                const nearBottom =
                  panel.scrollHeight - panel.scrollTop - panel.clientHeight < 80;
                if (nearBottom) void revealMoreRoster();
              }}
            >
              {rosterError ? (
                <div className="grid place-items-center gap-2 px-5 py-12 text-center">
                  <p className="text-sm text-gray-05">We could not load this class register.</p>
                  <Button size="sm" variant="outline" onClick={() => refetchRoster()}>
                    Try again
                  </Button>
                </div>
              ) : (
                <CustomTable
                  tableHeaderList={["Student", "Admission no.", "Status", "Primary guardian", ""]}
                  loading={rosterInitialLoading || (rosterFetching && !rosterData)}
                  defaultBodyList={visibleRoster}
                  tableBodyList={visibleRoster.map((student) => ({
                    Student: <StudentName student={student} />,
                    "Admission no.": student.student_number || "Not issued",
                    Status: (
                      <StudentStatusBadge status={student.status} label={student.status_label} />
                    ),
                    "Primary guardian": student.primary_guardian || "None linked",
                    "": (
                      <PermissionGate permission={P.ASSIGN_CLASS}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMoving(student);
                          }}
                        >
                          <ArrowLeftRight className="size-3.5" />
                          Move out
                        </Button>
                      </PermissionGate>
                    ),
                  }))}
                  onRowClick={(student: StudentRow) =>
                    navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(student.id))
                  }
                  hidePagination
                  cardBreakpoint="lg"
                  emptyText="Nobody is in this class yet"
                />
              )}
            </div>

            {!rosterError && loadedRoster.length > 0 && (
              <div
                className="flex min-h-11 items-center justify-center border-t border-border px-4 py-2 text-xs text-gray-05"
                aria-live="polite"
              >
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Loading more students
                  </span>
                ) : loadMoreError ? (
                  <Button size="sm" variant="ghost" onClick={() => void revealMoreRoster()}>
                    Try loading more
                  </Button>
                ) : rosterHasMore ? (
                  <Button size="sm" variant="ghost" onClick={() => void revealMoreRoster()}>
                    Load 7 more students
                  </Button>
                ) : (
                  `All ${loadedRoster.length} students loaded`
                )}
              </div>
            )}
          </Surface>
        </section>
      )}

      {moving && <TransferDrawer student={moving} open onClose={() => setMoving(null)} />}
    </PageShell>
  );
}

function ViewSwitch({ value, unplacedCount, onChange }: {
  value: View;
  unplacedCount: number;
  onChange: (next: View) => void;
}) {
  const options = [
    { value: "unplaced" as const, label: "Unassigned students", icon: BookOpenCheck, count: unplacedCount },
    { value: "roster" as const, label: "Class roster", icon: Users },
  ];
  return (
    <div role="tablist" aria-label="Classes and transfers views" className="max-w-full overflow-x-auto">
      <div className="relative inline-grid min-w-max grid-cols-2 rounded-lg border border-border bg-white p-1">
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-md bg-pry-01 shadow-sm",
            "transition-transform duration-300 ease-out motion-reduce:transition-none",
            value === "roster" && "translate-x-full",
          )}
        />
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative z-10 inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "font-medium text-primary"
                  : "text-gray-06 hover:bg-gray-04 hover:text-black-01 active:scale-[0.98]",
              )}
            >
              <option.icon className="size-4" />
              {option.label}
              {option.count != null && option.count > 0 && (
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AssignmentBar({ count, classes, target, targetClass, assigning, acknowledged, classFits, onTargetChange, onAssign, onClear }: {
  count: number;
  classes: ClassSeats[];
  target: string;
  targetClass?: ClassSeats;
  assigning: boolean;
  acknowledged: boolean;
  classFits: (schoolClass: ClassSeats) => boolean;
  onTargetChange: (value: string) => void;
  onAssign: () => void;
  onClear: () => void;
}) {
  const wouldOverfill = Boolean(
    targetClass?.capacity != null && targetClass.used + count > targetClass.capacity,
  );
  return (
    <Surface className="flex flex-wrap items-center gap-3 px-4 py-3 shadow-sm">
      <span className="shrink-0 text-sm font-medium text-black-01">
        {count} {count === 1 ? "student" : "students"} picked
      </span>
      <div className="min-w-0 flex-1 basis-52 sm:max-w-xs">
        <NativeSelect
          aria-label="Target class"
          value={target}
          onChange={(event) => onTargetChange(event.target.value)}
          className="h-9"
        >
          <option value="">Assign into...</option>
          {classes.map((schoolClass) => {
            const fits = classFits(schoolClass);
            return (
              <option key={schoolClass.id} value={schoolClass.id} disabled={!fits}>
                {schoolClass.name}
                {schoolClass.capacity == null
                  ? ` · ${schoolClass.used} enrolled`
                  : ` · ${schoolClass.used}/${schoolClass.capacity}`}
                {!fits && schoolClass.branch_name
                  ? ` · ${schoolClass.branch_name} only`
                  : ""}
              </option>
            );
          })}
        </NativeSelect>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
        <PermissionGate permission={P.ASSIGN_CLASS}>
          <Button size="sm" disabled={!target || assigning} onClick={onAssign}>
            {assigning ? "Assigning..." : acknowledged ? "Assign anyway" : "Assign"}
          </Button>
        </PermissionGate>
      </div>
      {targetClass && (
        <p className={cn("w-full text-xs", wouldOverfill ? "text-amber-700" : "text-gray-05")}>
          {assignmentImpact(targetClass, count)}
        </p>
      )}
    </Surface>
  );
}

function RefusalNotice({ rows, onDismiss }: { rows: BulkResultRow[]; onDismiss: () => void }) {
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-900">
          {rows.length} {rows.length === 1 ? "student was" : "students were"} not placed
        </h2>
        <button type="button" onClick={onDismiss} className="text-xs text-amber-900 underline-offset-2 hover:underline">
          Dismiss
        </button>
      </div>
      <ul className="mt-2 grid gap-1.5">
        {rows.map((row) => (
          <li key={row.student} className="text-sm text-amber-900">
            <span className="font-medium">{row.name || `Student ${row.student}`}</span>
            {row.message ? ` - ${row.message}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudentName({ student }: { student: StudentRow }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <PersonAvatar name={student.full_name} photoUrl={student.photo_url} className="size-8.5 shrink-0" textClassName="text-xs" />
      <span className="min-w-0">
        <span className="block break-words text-sm font-medium text-black-01">{student.full_name}</span>
        <span className="mt-0.5 block text-xs text-gray-05">{student.level_name || "No level set"}</span>
      </span>
    </span>
  );
}

function ClassLoad({ schoolClass }: { schoolClass: ClassSeats }) {
  const isOver = schoolClass.capacity != null && schoolClass.used > schoolClass.capacity;
  const isFull = schoolClass.remaining === 0;
  const percent = schoolClass.capacity
    ? Math.min(100, Math.round((schoolClass.used / schoolClass.capacity) * 100))
    : 0;
  return (
    <div className="min-w-0 flex-1 basis-52 pb-1 sm:max-w-xs">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-black-01">{schoolClass.level_name || "Level not set"}</span>
        <span className={cn("shrink-0 text-xs", isOver ? "text-red-600" : isFull ? "text-amber-700" : "text-gray-05")}>
          {schoolClass.capacity == null
            ? `${schoolClass.used} enrolled`
            : `${schoolClass.used} of ${schoolClass.capacity} · ${loadNote(schoolClass)}`}
        </span>
      </div>
      {schoolClass.capacity != null && (
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white-02">
          <span
            className={cn("block h-full rounded-full", isOver ? "bg-red-500" : isFull ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${isOver ? 100 : percent}%` }}
          />
        </span>
      )}
    </div>
  );
}
