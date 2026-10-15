import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Search,
  Users,
} from "lucide-react";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { Pager } from "@/pages/protected/students/pager";
import { useGetClassesQuery } from "@/redux/services/academics/academics-api";
import type { SchoolClass } from "@/redux/services/academics/academics-types";
import { useLazyGetRegisterQuery } from "@/redux/services/attendance/attendance-api";
import type {
  AttendanceMark,
  Register,
  RegisterStatus,
} from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";

import { AttendancePageHeader } from "../components/attendance-page-header";
import { DayPicker } from "../components/day-picker";
import { markLabel } from "../marks";
import { useAttendanceDay } from "../use-attendance-day";
import { classRegistersFieldPolicy } from "./class-registers-policy";
import {
  type RegisterDirectoryFilter,
  registerMatchesFilter,
  registerProgress,
  summarizeRegisters,
} from "./class-registers-state";

type DirectoryEntry =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; register: Register };

type DirectoryEntries = Record<number, DirectoryEntry>;

/**
 * A day-scoped directory that brings one class register into focus.
 *
 * The academics list remains the source of active classes and pagination. The
 * register reads are shared with the full register cache, so opening a class
 * does not create a second version of its attendance state. Summary figures
 * describe the current page because the class catalogue is paginated.
 *
 * Field Access removes count progress, status filters and student marks at
 * their respective boundaries. A hidden value is not replaced by a derived
 * label in the focused panel.
 */
export default function ClassRegisters() {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const { date, today, setDate } = useAttendanceDay();
  const { branch, applies, label } = useBranchLens();
  const { formatDay } = useSchoolDisplay();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RegisterDirectoryFilter>("all");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [loadedDirectory, setLoadedDirectory] = useState<{ key: string; entries: DirectoryEntries }>({
    key: "",
    entries: {},
  });
  const [loadRegister] = useLazyGetRegisterQuery();
  const allowed = hasPermission(P.VIEW_ATTENDANCE) && hasPermission(P.BROWSE_CLASSES);
  const fieldPolicy = classRegistersFieldPolicy({
    countsHidden: access.isHidden("counts"),
    statusHidden: access.isHidden("status"),
    markHidden: access.isHidden("mark"),
  });

  const { data, isLoading, isError, refetch } = useGetClassesQuery(
    { branch, page },
    { skip: !allowed },
  );
  const classes = useMemo(() => data?.data ?? [], [data?.data]);
  const directoryKey = `${date}:${classes.map((schoolClass) => schoolClass.id).join(",")}`;
  const entries = loadedDirectory.key === directoryKey
    ? loadedDirectory.entries
    : Object.fromEntries(classes.map((schoolClass) => [schoolClass.id, { state: "loading" } as DirectoryEntry]));

  useEffect(() => {
    if (!classes.length) return;

    let active = true;

    void Promise.all(classes.map(async (schoolClass): Promise<[number, DirectoryEntry]> => {
      try {
        const response = await loadRegister({ classId: schoolClass.id, date }, true).unwrap();
        return [schoolClass.id, { state: "ready", register: response.data }];
      } catch {
        return [schoolClass.id, { state: "error" }];
      }
    })).then((loaded) => {
      if (active) {
        setLoadedDirectory({ key: directoryKey, entries: Object.fromEntries(loaded) });
      }
    });

    return () => {
      active = false;
    };
  }, [classes, date, directoryKey, loadRegister]);

  if (!allowed) {
    return (
      <PageShell>
        <PageAccessDenied message="Reading every class's register needs both attendance and the class list. Ask your school administrator if you need them." />
      </PageShell>
    );
  }

  const normalizedSearch = search.trim().toLowerCase();
  const visibleClasses = classes.filter((schoolClass) => {
    const entry = entries[schoolClass.id];
    const register = entry?.state === "ready" ? entry.register : undefined;
    const matchesSearch = !normalizedSearch || [
      schoolClass.name,
      schoolClass.class_teacher?.name,
      schoolClass.branch_name,
      schoolClass.level_name,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    const matchesStatus = !fieldPolicy.showStatus || registerMatchesFilter(register, filter);
    return matchesSearch && matchesStatus;
  });
  const focusedClass = visibleClasses.find((schoolClass) => schoolClass.id === selectedClassId)
    ?? visibleClasses[0]
    ?? null;
  const focusedEntry = focusedClass ? entries[focusedClass.id] : undefined;
  const pageRegisters = classes.map((schoolClass) => {
    const entry = entries[schoolClass.id];
    return entry?.state === "ready" ? entry.register : undefined;
  });
  const directoryLoading = classes.some((schoolClass) => entries[schoolClass.id]?.state === "loading");
  const summary = summarizeRegisters(pageRegisters);
  const pagination = data?.pagination;
  const firstItem = pagination?.totalItems
    ? (pagination.currentPage - 1) * pagination.pageSize + 1
    : 0;
  const lastItem = pagination?.totalItems
    ? Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)
    : 0;

  const focusClass = (classId: number) => {
    setSelectedClassId(classId);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.requestAnimationFrame(() => {
        document.getElementById("class-register-focus")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  return (
    <PageShell className="content-start gap-5" grid>
      <AttendancePageHeader
        title="Class registers"
        description="See every class at a glance, follow incomplete registers, and open the class that needs attention."
        meta={[formatDay(date, { weekday: "long", month: "long" }), applies ? label : null]}
        actions={<DayPicker date={date} today={today} onChange={setDate} />}
      />

      {!isLoading && !isError && (
        <RegisterSummary
          total={pagination?.totalItems ?? classes.length}
          pageSize={classes.length}
          summary={summary}
          showStatus={fieldPolicy.showStatus}
          loadingStatus={directoryLoading}
        />
      )}

      {isError ? (
        <OutlinedNotice
          icon={Users}
          title="We could not load the classes"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.72fr)]">
          <Skeleton className="h-[34rem] w-full rounded-md" />
          <Skeleton className="h-[34rem] w-full rounded-md" />
        </div>
      ) : classes.length === 0 ? (
        <Panel as="section" className="grid min-h-72 place-items-center p-6 text-center">
          <div className="max-w-sm">
            <Users className="mx-auto size-8 text-gray-05" aria-hidden="true" />
            <h2 className="mt-3 font-mont text-base font-semibold text-black-01">No classes in this school year yet</h2>
            <p className="mt-1 text-sm text-gray-06">Create an active class before taking its attendance register.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.72fr)]">
          <Panel as="section" className="overflow-hidden">
            <div className="flex min-w-0 flex-col gap-3 border-b border-border p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative block w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search class or teacher"
                  className="pl-9"
                />
              </label>
              {fieldPolicy.showStatus && (
                <div className="max-w-full overflow-x-auto">
                  <SegmentedToggle<RegisterDirectoryFilter>
                    value={filter}
                    options={[
                      { value: "all", label: "All", count: classes.length },
                      {
                        value: "action",
                        label: "Needs action",
                        count: directoryLoading ? "…" : summary.inProgress + summary.notStarted,
                      },
                      {
                        value: "submitted",
                        label: "Submitted",
                        count: directoryLoading ? "…" : summary.submitted,
                      },
                    ]}
                    onChange={setFilter}
                    ariaLabel="Register status filter"
                  />
                </div>
              )}
            </div>

            <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(130px,0.85fr)_110px_20px] gap-3 bg-white-05 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-05 md:grid">
              <span>Class and teacher</span>
              {fieldPolicy.showCounts ? <span>Attendance</span> : <span />}
              {fieldPolicy.showStatus ? <span>Status</span> : <span />}
              <span />
            </div>

            {visibleClasses.length > 0 ? (
              <ul className="divide-y divide-border">
                {visibleClasses.map((schoolClass) => (
                  <li key={schoolClass.id}>
                    <ClassRegisterRow
                      schoolClass={schoolClass}
                      entry={entries[schoolClass.id]}
                      selected={schoolClass.id === focusedClass?.id}
                      showCounts={fieldPolicy.showCounts}
                      showStatus={fieldPolicy.showStatus}
                      onSelect={() => focusClass(schoolClass.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid min-h-56 place-items-center p-6 text-center">
                <div>
                  <Search className="mx-auto size-7 text-gray-05" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-black-01">No matching registers</p>
                  <p className="mt-1 text-xs text-gray-06">Try another name or status.</p>
                </div>
              </div>
            )}

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-gray-05">
                {pagination?.totalItems
                  ? `Showing ${firstItem}-${lastItem} of ${pagination.totalItems} classes`
                  : "No classes to show"}
              </p>
              <Pager
                page={pagination?.currentPage ?? page}
                totalPages={pagination?.totalPages ?? 1}
                onGo={(nextPage) => {
                  setPage(nextPage);
                  setSelectedClassId(null);
                }}
              />
            </div>
          </Panel>

          <RegisterFocus
            schoolClass={focusedClass}
            entry={focusedEntry}
            date={date}
            isToday={date === today}
            canTake={hasPermission(P.TAKE_ANY_REGISTER)}
            showCounts={fieldPolicy.showCounts}
            showStatus={fieldPolicy.showStatus}
            showStudentMarks={fieldPolicy.showStudentMarks}
          />
        </div>
      )}
    </PageShell>
  );
}

function RegisterSummary({
  total,
  pageSize,
  summary,
  showStatus,
  loadingStatus,
}: {
  total: number;
  pageSize: number;
  summary: ReturnType<typeof summarizeRegisters>;
  showStatus: boolean;
  loadingStatus: boolean;
}) {
  const cards = [
    { label: "All classes", value: total, detail: "Across your branch reach", icon: Users, tone: "blue" },
    ...(showStatus ? [
      { label: "Submitted", value: summary.submitted, detail: `On this page of ${pageSize}`, icon: CheckCircle2, tone: "green" },
      { label: "In progress", value: summary.inProgress, detail: "Need completion", icon: Clock3, tone: "amber" },
      { label: "Not started", value: summary.notStarted, detail: "Need follow-up", icon: AlertTriangle, tone: "red" },
    ] : []),
  ];

  return (
    <section
      aria-label="Class register summary"
      className={cn(
        "grid min-w-0 gap-3",
        cards.length === 1 ? "grid-cols-1 sm:max-w-xs" : "grid-cols-2 xl:grid-cols-4",
      )}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Panel key={card.label} className="flex min-w-0 items-center gap-3 p-3.5">
            <span className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg",
              card.tone === "blue" && "bg-blue-50 text-blue-700",
              card.tone === "green" && "bg-emerald-50 text-emerald-700",
              card.tone === "amber" && "bg-amber-50 text-amber-700",
              card.tone === "red" && "bg-rose-50 text-rose-700",
            )}>
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-gray-06">{card.label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-gray-05">{card.detail}</span>
            </span>
            {loadingStatus && card.label !== "All classes" ? (
              <Skeleton className="h-7 w-7" />
            ) : (
              <strong className="font-mont text-2xl font-semibold tracking-tight text-black-01">{card.value}</strong>
            )}
          </Panel>
        );
      })}
    </section>
  );
}

function ClassRegisterRow({
  schoolClass,
  entry,
  selected,
  showCounts,
  showStatus,
  onSelect,
}: {
  schoolClass: SchoolClass;
  entry?: DirectoryEntry;
  selected: boolean;
  showCounts: boolean;
  showStatus: boolean;
  onSelect: () => void;
}) {
  const register = entry?.state === "ready" ? entry.register : undefined;
  const progress = registerProgress(register?.counts);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-all",
        "hover:bg-primary/5 active:scale-[0.995] md:grid-cols-[minmax(180px,1.4fr)_minmax(130px,0.85fr)_110px_20px]",
        selected && "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
          {classInitials(schoolClass.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-black-01">{schoolClass.name}</span>
          <span className="mt-0.5 block truncate text-xs text-gray-05">
            {schoolClass.class_teacher?.name ?? "No class teacher"}
            {schoolClass.branch_name ? ` · ${schoolClass.branch_name}` : ` · ${schoolClass.level_name}`}
          </span>
        </span>
      </span>

      {showCounts && (
        <span className="order-3 min-w-0 md:order-none">
          {entry?.state === "loading" || !entry ? (
            <Skeleton className="h-7 w-full" />
          ) : progress ? (
            <span className="block">
              <span className="block h-1.5 overflow-hidden rounded-full bg-gray-03">
                <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${progress.percent}%` }} />
              </span>
              <span className="mt-1.5 block text-[11px] text-gray-05">
                {progress.marked} of {progress.markable} marked
              </span>
            </span>
          ) : (
            <span className="text-xs text-gray-05">Counts unavailable</span>
          )}
        </span>
      )}

      {showStatus && (
        <span className="justify-self-end md:justify-self-start">
          {entry?.state === "loading" || !entry ? (
            <Skeleton className="h-6 w-20 rounded-full" />
          ) : entry.state === "error" ? (
            <span className="text-xs text-gray-05">Unavailable</span>
          ) : (
            <RegisterStatusBadge register={entry.register} />
          )}
        </span>
      )}

      <ChevronRight className="size-4 justify-self-end text-gray-05" aria-hidden="true" />
    </button>
  );
}

function RegisterFocus({
  schoolClass,
  entry,
  date,
  isToday,
  canTake,
  showCounts,
  showStatus,
  showStudentMarks,
}: {
  schoolClass: SchoolClass | null;
  entry?: DirectoryEntry;
  date: string;
  isToday: boolean;
  canTake: boolean;
  showCounts: boolean;
  showStatus: boolean;
  showStudentMarks: boolean;
}) {
  if (!schoolClass) {
    return (
      <Panel id="class-register-focus" as="section" className="grid min-h-64 scroll-mt-4 place-items-center p-6 text-center">
        <div>
          <CircleDashed className="mx-auto size-7 text-gray-05" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-black-01">Choose a class</p>
          <p className="mt-1 text-xs text-gray-06">Its register summary will appear here.</p>
        </div>
      </Panel>
    );
  }

  if (!entry || entry.state === "loading") {
    return (
      <Panel id="class-register-focus" as="section" className="scroll-mt-4 overflow-hidden xl:sticky xl:top-4">
        <div className="space-y-3 bg-primary/10 p-5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="space-y-3 p-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Panel>
    );
  }

  if (entry.state === "error") {
    return (
      <Panel id="class-register-focus" as="section" className="grid min-h-64 scroll-mt-4 place-items-center p-6 text-center xl:sticky xl:top-4">
        <div>
          <AlertTriangle className="mx-auto size-7 text-amber-600" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-black-01">This register did not load</p>
          <p className="mt-1 text-xs text-gray-06">Choose another class or refresh the page.</p>
        </div>
      </Panel>
    );
  }

  const register = entry.register;
  const progress = registerProgress(register.counts);
  const submitted = register.status === "SUBMITTED";
  const href = routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(schoolClass.id, isToday ? undefined : date);
  const primaryLabel = !canTake
    ? "Open register"
    : submitted
      ? "Review register"
      : register.status === "NOT_STARTED"
        ? "Start register"
        : "Continue register";

  return (
    <Panel
      id="class-register-focus"
      as="section"
      className="scroll-mt-4 overflow-hidden border-primary/20 shadow-[0_18px_45px_-32px_rgba(37,99,235,0.55)] xl:sticky xl:top-4"
    >
      <div className="border-b border-border bg-gradient-to-br from-primary/10 to-indigo-50 p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-semibold text-white shadow-md shadow-primary/20">
              {classInitials(schoolClass.name)}
            </span>
            <span className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-05">Selected register</span>
              <h2 className="mt-0.5 truncate font-mont text-lg font-semibold text-black-01">{schoolClass.name}</h2>
            </span>
          </div>
          {showStatus && <RegisterStatusBadge register={register} />}
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-05">Class teacher</p>
            <p className="mt-1 truncate text-sm font-medium text-black-01">
              {register.school_class.class_teacher_name ?? "No class teacher"}
            </p>
          </div>
          <p className="text-xs text-gray-05">
            {register.school_class.branch?.name ?? schoolClass.level_name}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {showCounts && progress && register.counts && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mont text-2xl font-semibold tracking-tight text-black-01">{progress.percent}%</p>
                <p className="text-xs text-gray-05">Register complete</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-black-01">{progress.marked}/{progress.markable}</p>
                <p className="text-[11px] text-gray-05">Students marked</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-03">
              <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
              <CountCell label="Present" value={register.counts.present} className="text-emerald-700" />
              <CountCell label="Late" value={register.counts.late} className="text-amber-700" />
              <CountCell label="Absent" value={register.counts.absent} className="text-rose-700" />
              <CountCell label="Unmarked" value={register.counts.unmarked} className="text-gray-06" />
            </div>
            {register.counts.unmarked > 0 ? (
              <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    {register.counts.unmarked} student{register.counts.unmarked === 1 ? "" : "s"} still need a mark
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-700">Complete the register before it closes.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Every student has a mark</p>
                  <p className="mt-0.5 text-[11px] text-emerald-700">
                    {submitted ? "This register has been submitted." : "This register is ready to submit."}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {!register.closed && !register.roster_empty && register.rows.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold text-black-01">Student preview</h3>
              <span className="text-[11px] text-gray-05">First {Math.min(3, register.rows.length)}</span>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border px-3">
              {register.rows.slice(0, 3).map((row) => (
                <li key={row.student_id} className="flex min-w-0 items-center gap-2.5 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white-05 text-[10px] font-semibold text-gray-06">
                    {personInitials(row.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-black-01">{row.name}</span>
                  </span>
                  {showStudentMarks && (
                    row.mark
                      ? <MarkBadge mark={row.mark} />
                      : <span className="text-[10px] text-gray-05">Unmarked</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {register.closed && (
          <p className="rounded-lg bg-white-05 p-3 text-xs text-gray-06">{register.closed.reason}</p>
        )}
        {register.roster_empty && (
          <p className="rounded-lg bg-white-05 p-3 text-xs text-gray-06">No student is placed in this class on this day.</p>
        )}

        <Button asChild className="w-full">
          <Link to={href}>
            {primaryLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </Panel>
  );
}

function CountCell({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="border-b border-r border-border p-2.5 last:border-r-0 sm:border-b-0 xl:border-b xl:[&:nth-child(2)]:border-r-0 2xl:border-b-0 2xl:[&:nth-child(2)]:border-r">
      <p className="text-[10px] text-gray-05">{label}</p>
      <p className={cn("mt-1 text-base font-semibold", className)}>{value}</p>
    </div>
  );
}

function RegisterStatusBadge({ register }: { register: Register }) {
  if (register.closed) return <Badge variant="inactive" className="rounded-full">Closed</Badge>;
  if (register.roster_empty) return <Badge variant="inactive" className="rounded-full">Nobody placed</Badge>;
  return <StatusBadge status={register.status} />;
}

function StatusBadge({ status }: { status?: RegisterStatus }) {
  switch (status) {
    case "SUBMITTED":
      return <Badge variant="active" className="rounded-full">Submitted</Badge>;
    case "READY":
      return <Badge variant="pending" className="rounded-full">Ready to submit</Badge>;
    case "IN_PROGRESS":
      return <Badge variant="pending" className="rounded-full">In progress</Badge>;
    case "CLOSED_DAY":
      return <Badge variant="inactive" className="rounded-full">Closed</Badge>;
    default:
      return <Badge variant="inactive" className="rounded-full">Not started</Badge>;
  }
}

function MarkBadge({ mark }: { mark: AttendanceMark }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-1 text-[10px] font-semibold",
      mark === "P" && "bg-emerald-50 text-emerald-700",
      mark === "L" && "bg-amber-50 text-amber-700",
      mark === "A" && "bg-rose-50 text-rose-700",
      mark === "E" && "bg-blue-50 text-blue-700",
    )}>
      {markLabel(mark)}
    </span>
  );
}

function classInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts.at(-1)?.charAt(0) ?? ""}`.toUpperCase();
}

function personInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
}
