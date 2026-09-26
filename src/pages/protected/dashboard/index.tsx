import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LayoutGrid,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useConsoleDoors } from "@/hooks/use-console-doors";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { useStudentsLens } from "@/hooks/use-students-lens";
import { useAppSelector } from "@/redux/store";
import { selectUser } from "@/redux/features/auth/auth-slice";
import { routesPath } from "@/routes/routesPath";
import { useGetAcademicOverviewQuery } from "@/redux/services/academics/academics-api";
import { useGetCalendarOverviewQuery } from "@/redux/services/calendar/calendar-api";
import { useGetOnboardingStateQuery } from "@/redux/services/onboarding/onboarding-api";
import { useGetStudentSummaryQuery } from "@/redux/services/students/students-api";
import { useGetStaffListQuery } from "@/redux/services/staff/staff-api";
import { useGetPendingApprovalsQuery } from "@/redux/services/dashboard/workflow-api";
import { buildAttention } from "./attention";
import { HeroBuildings } from "./hero-buildings";
import { FocusPanel } from "./focus-panel";

const R = routesPath.PROTECTED;

/**
 * The school dashboard combines live summaries from the operational modules.
 *
 * Every request uses the same branch or academic-year lens as the screen it
 * links to. A count on this page therefore means the same thing after the
 * reader opens its directory. Requests are skipped when the reader lacks the
 * corresponding view permission, so the dashboard never probes a closed API.
 *
 * The page favours decisions over decoration. It opens with the state of the
 * term and the work waiting today, then shows people and calendar summaries,
 * and finally offers the modules this account can actually reach.
 */

const REFRESH = {
  pollingInterval: 180_000,
  skipPollingIfUnfocused: true,
  refetchOnFocus: true,
} as const;

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function plural(count: number, singular: string, pluralWord = `${singular}s`) {
  return count === 1 ? singular : pluralWord;
}

function Shimmer({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded bg-gray-04", className)} />;
}

const PULSE_TONES = {
  blue: "bg-[#EEF2FF] text-[#5369B1]",
  green: "bg-[#EAF7F2] text-green-02",
  amber: "bg-[#FFF4DF] text-amber-01",
  violet: "bg-[#F3EEFF] text-[#7755B7]",
} as const;

function PulseMetric({
  icon: Icon,
  label,
  value,
  note,
  to,
  tone,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  note: string;
  to: string;
  tone: keyof typeof PULSE_TONES;
  loading?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group min-w-0 rounded-2xl border border-white-02 bg-white p-4 shadow-[0_8px_22px_rgba(29,43,68,0.04)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:p-4.5"
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", PULSE_TONES[tone])}>
          <Icon className="size-4.5" />
        </span>
        <ArrowUpRight className="size-4 text-gray-02 transition-colors group-hover:text-primary" />
      </span>
      {loading ? (
        <Shimmer className="mt-5 h-7 w-16" />
      ) : (
        <span className="mt-5 block font-mont text-2xl font-semibold leading-none tracking-tight text-black-01 tabular-nums sm:text-[28px]">
          {value}
        </span>
      )}
      <span className="mt-2 block truncate text-[13px] font-semibold text-black-01">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-gray-05">
        {note}
      </span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  note,
  action,
}: {
  eyebrow?: string;
  title: string;
  note?: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className={cn("font-mont font-semibold tracking-tight text-black-01", eyebrow ? "mt-1 text-lg" : "text-base")}>
          {title}
        </h2>
        {note && <p className="mt-0.5 text-xs text-gray-05">{note}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
        >
          {action.label}
          <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="grid size-23 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(rgba(255,255,255,.96) ${safePercent}%, rgba(255,255,255,.16) ${safePercent}% 100%)`,
      }}
      role="img"
      aria-label={`${safePercent}% of the term completed`}
    >
      <div className="grid size-17 place-items-center rounded-full bg-[#173D4A] text-center shadow-inner">
        <span className="font-mont text-xl font-semibold leading-none tabular-nums">
          {safePercent}%
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/55">
          taught
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const user = useAppSelector(selectUser);
  const { hasPermission } = usePermissions();
  const { hasCapability } = useCapabilities();
  const consoleDoors = useConsoleDoors();
  const { lens, sessionName } = useAcademicsLens();
  const studentLens = useStudentsLens();

  const canSeeCalendar = hasPermission(P.BROWSE_CALENDAR);
  const canSeeStructure = hasPermission(P.BROWSE_STRUCTURE);
  const canSeeTimetables = hasPermission(P.BROWSE_TIMETABLES);
  const canSeeOnboarding = hasPermission(P.VIEW_ONBOARDING);
  const canSeeStudents = hasPermission(P.BROWSE_STUDENTS) && hasCapability("students");
  const canSeeStaff = hasPermission(P.BROWSE_TEACHERS) && hasCapability("teachers");

  const structure = useGetAcademicOverviewQuery(lens, {
    ...REFRESH,
    skip: !canSeeStructure,
  });
  const calendar = useGetCalendarOverviewQuery(lens, {
    ...REFRESH,
    skip: !canSeeCalendar,
  });
  const onboarding = useGetOnboardingStateQuery(undefined, {
    ...REFRESH,
    skip: !canSeeOnboarding,
  });
  const students = useGetStudentSummaryQuery(studentLens.lens, {
    ...REFRESH,
    skip: !canSeeStudents || studentLens.isLoading,
  });
  const staff = useGetStaffListQuery(
    {
      page: 1,
      branch: typeof studentLens.branch === "number"
        ? String(studentLens.branch)
        : undefined,
    },
    {
      ...REFRESH,
      skip: !canSeeStaff || studentLens.isLoading,
    },
  );
  const approvals = useGetPendingApprovalsQuery(undefined, REFRESH);

  const academicLoading =
    (canSeeStructure && structure.isLoading) ||
    (canSeeCalendar && calendar.isLoading) ||
    (canSeeOnboarding && onboarding.isLoading);
  const operationalLoading =
    academicLoading ||
    (canSeeStudents && (students.isLoading || studentLens.isLoading)) ||
    (canSeeStaff && (staff.isLoading || studentLens.isLoading)) ||
    approvals.isLoading;
  const operationalError =
    (canSeeStructure && structure.isError) ||
    (canSeeCalendar && calendar.isError) ||
    (canSeeOnboarding && onboarding.isError) ||
    (canSeeStudents && students.isError) ||
    (canSeeStaff && staff.isError) ||
    approvals.isError;

  const cal = calendar.data?.data;
  const str = structure.data?.data;
  const studentSummary = students.data?.data;
  const staffCounts = staff.data?.counts;
  const pendingApprovals = approvals.data?.count ?? approvals.data?.results?.length ?? 0;

  const attention = buildAttention({
    alerts: cal?.alerts,
    onboarding: onboarding.data?.data ?? null,
    branchesWithoutSession: str?.branches_without_a_session,
    students: studentSummary,
    staff: staffCounts,
    pendingApprovals,
  });

  const term = cal?.term ?? null;
  const taught = term?.teaching_days_elapsed ?? 0;
  const teachable = term?.teaching_days_total ?? 0;
  const termPercent = teachable > 0 ? Math.round((taught / teachable) * 100) : 0;
  const terms = str?.viewed_session?.terms ?? [];

  const today = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const heroActions = [
    canSeeStudents && {
      label: "Open students",
      to: R.STUDENTS.INDEX,
      primary: true,
    },
    canSeeCalendar && {
      label: "View calendar",
      to: R.ACADEMIC_CALENDAR.INDEX,
      primary: !canSeeStudents,
    },
    !canSeeStudents && !canSeeCalendar && canSeeStaff && {
      label: "Open staff",
      to: R.STAFF.INDEX,
      primary: true,
    },
  ].filter(Boolean) as { label: string; to: string; primary: boolean }[];

  const pulse = [
    canSeeStudents && (
      <PulseMetric
        key="students"
        icon={Users}
        label="Students on roll"
        value={students.isError ? "-" : studentSummary?.on_roll ?? 0}
        note={students.isError
          ? "Could not load this summary"
          : studentSummary
          ? `${studentSummary.applicants} ${plural(studentSummary.applicants, "applicant")}`
          : "Current student roll"}
        to={R.STUDENTS.INDEX}
        tone="blue"
        loading={students.isLoading || studentLens.isLoading}
      />
    ),
    canSeeStaff && (
      <PulseMetric
        key="staff"
        icon={BriefcaseBusiness}
        label="Staff employed"
        value={staff.isError ? "-" : staffCounts?.currently_employed ?? 0}
        note={staff.isError
          ? "Could not load this summary"
          : staffCounts
          ? `${staffCounts.with_teaching_duties} with teaching duties`
          : "Current staff roll"}
        to={R.STAFF.INDEX}
        tone="green"
        loading={staff.isLoading || studentLens.isLoading}
      />
    ),
    canSeeStructure && (
      <PulseMetric
        key="classes"
        icon={GraduationCap}
        label="Classes"
        value={structure.isError ? "-" : str?.counts.classes ?? 0}
        note={structure.isError
          ? "Could not load this summary"
          : str
            ? `${str.counts.levels} ${plural(str.counts.levels, "level")}`
            : "Academic structure"}
        to={R.ACADEMIC_STRUCTURE.CLASSES}
        tone="amber"
        loading={structure.isLoading}
      />
    ),
    <PulseMetric
      key="approvals"
      icon={ClipboardCheck}
      label="Pending approvals"
      value={approvals.isError ? "-" : pendingApprovals}
      note={approvals.isError
        ? "Could not load your queue"
        : pendingApprovals > 0
          ? "Waiting for your decision"
          : "Your queue is clear"}
      to={R.WORKFLOW.APPROVALS}
      tone="violet"
      loading={approvals.isLoading}
    />,
  ].filter(Boolean);

  const modules = [
    {
      label: "Students",
      description: "Roll, applicants and guardians",
      to: R.STUDENTS.INDEX,
      icon: Users,
      tone: "bg-[#EEF2FF] text-[#5369B1]",
      show: canSeeStudents,
    },
    {
      label: "Staff",
      description: "People, duties and leave",
      to: R.STAFF.INDEX,
      icon: BriefcaseBusiness,
      tone: "bg-[#EAF7F2] text-green-02",
      show: canSeeStaff,
    },
    {
      label: "Academic Structure",
      description: "Years, classes and subjects",
      to: R.ACADEMIC_STRUCTURE.INDEX,
      icon: BookOpen,
      tone: "bg-[#FFF4DF] text-amber-01",
      show: canSeeStructure,
    },
    {
      label: "Calendar",
      description: "Terms, events and key dates",
      to: R.ACADEMIC_CALENDAR.INDEX,
      icon: CalendarRange,
      tone: "bg-[#F3EEFF] text-[#7755B7]",
      show: canSeeCalendar && hasCapability("calendar"),
    },
    {
      label: "Timetables",
      description: "Rooms and class schedules",
      to: R.TIMETABLES.CLASSES,
      icon: LayoutGrid,
      tone: "bg-[#E9F5F8] text-[#247287]",
      show: canSeeTimetables && hasCapability("calendar_plus"),
    },
    {
      label: "Branches",
      description: "School operations by branch",
      to: R.BRANCHES.INDEX,
      icon: Building2,
      tone: "bg-[#F9EFEA] text-[#9A5A3C]",
      show: hasPermission(P.BROWSE_BRANCHES),
    },
    {
      label: "Workflow",
      description: "Approvals and submissions",
      to: R.WORKFLOW.APPROVALS,
      icon: ClipboardCheck,
      tone: "bg-[#F3EEFF] text-[#7755B7]",
      show: true,
    },
    {
      label: "Finance",
      description: "Fees, banking and reports",
      to: R.FINANCE.INDEX,
      icon: Wallet,
      tone: "bg-[#EAF7F2] text-green-02",
      show: consoleDoors.finance,
    },
    {
      label: "Procurement",
      description: "Purchases, stock and vendors",
      to: R.PROCUREMENT.INDEX,
      icon: ShoppingCart,
      tone: "bg-[#FFF4DF] text-amber-01",
      show: consoleDoors.procurement,
    },
  ].filter((module) => module.show);

  return (
    <PageShell className="space-y-5 pb-10 sm:space-y-6">
      <section
        className="relative isolate overflow-hidden rounded-3xl px-5 py-6 text-white shadow-[0_18px_45px_rgba(14,49,60,0.18)] sm:px-7 sm:py-7"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
            "radial-gradient(circle at 8% -10%, rgba(120,214,220,.25), transparent 40%)",
            "radial-gradient(circle at 92% 112%, rgba(214,168,90,.28), transparent 40%)",
            "linear-gradient(118deg, #0E313C 0%, #14495A 55%, #0A2029 100%)",
          ].join(", "),
          backgroundSize: "28px 28px, 28px 28px, auto, auto, auto",
        }}
      >
        <div className="hero-ambient pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="hero-ambient-delayed pointer-events-none absolute -bottom-24 left-[34%] size-56 rounded-full bg-white/[0.06] blur-3xl" />
        <HeroBuildings className="pointer-events-none absolute bottom-0 right-3 hidden h-[78%] max-w-[46%] text-white/[0.12] md:block" />
        <HeroBuildings crop="centre" className="pointer-events-none absolute bottom-0 right-1 h-[60%] text-white/[0.08] sm:hidden" />

        <div className="relative grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0 sm:max-w-xl">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/65">
              <CalendarDays className="size-3.5" />
              {today}
            </p>
            <h1 className="mt-2 font-mont text-2xl font-semibold tracking-tight sm:text-[30px]">
              {greeting(new Date().getHours())}
              {user?.first_name ? `, ${user.first_name}` : ""}.
            </h1>
            <p className="mt-2 max-w-lg text-[13px] leading-5 text-white/70 text-pretty">
              {calendar.isError
                ? "Your calendar summary could not be loaded. The rest of your workspace is still available below."
                : term
                ? `${term.name} of ${sessionName ?? "this year"} is underway. You have taught ${taught} of ${teachable} teaching days.`
                : sessionName
                  ? `${sessionName} is selected. No term covers today, so nothing is being taught right now.`
                  : "No academic year is set up yet, so there is nothing to teach into."}
            </p>
            {heroActions.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {heroActions.slice(0, 2).map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                      action.primary
                        ? "bg-white text-[#173D4A] hover:bg-white/90"
                        : "border border-white/20 bg-white/10 text-white hover:bg-white/15",
                    )}
                  >
                    {action.label}
                    <ArrowRight className="size-3.5" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {canSeeCalendar && (
            <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.08] p-3.5 backdrop-blur-sm lg:w-65">
              {academicLoading ? (
                <Shimmer className="size-23 shrink-0 rounded-full bg-white/15" />
              ) : calendar.isError ? (
                <span className="grid size-23 shrink-0 place-items-center rounded-full bg-white/10 text-white/75">
                  <AlertTriangle className="size-6" />
                </span>
              ) : (
                <ProgressRing percent={termPercent} />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  Term progress
                </p>
                <p className="mt-1.5 truncate text-sm font-semibold text-white">
                  {calendar.isError ? "Unavailable" : term?.name ?? "Between terms"}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-white/60">
                  {calendar.isError
                    ? "Refresh to try again"
                    : term
                      ? `${Math.max(0, teachable - taught)} teaching days remain`
                      : "No teaching days are active"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {operationalError && !operationalLoading && (
        <section className="flex items-start gap-3 rounded-2xl border border-yellow-01/30 bg-yellow-01/5 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-01-text" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-black-01">Some dashboard updates could not be checked</p>
            <p className="mt-0.5 text-[11px] leading-4 text-gray-06">
              The information that did load is shown below. Refresh the page to try the missing summaries again.
            </p>
          </div>
        </section>
      )}

      {operationalLoading ? (
        <Shimmer className="h-40 rounded-3xl" />
      ) : attention.length > 0 ? (
        <FocusPanel items={attention} />
      ) : !operationalError ? (
        <section className="flex items-start gap-3 rounded-3xl border border-green-01/15 bg-[linear-gradient(112deg,rgba(22,163,74,.08),rgba(255,255,255,1)_52%)] p-4.5 shadow-[0_10px_30px_rgba(29,43,68,0.04)] sm:items-center sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-01/10 text-green-01-text">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-green-01-text">
              Today&apos;s focus
            </p>
            <h2 className="mt-1 font-mont text-base font-semibold text-black-01">
              Everything is in good shape
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-gray-06 text-pretty">
              No approvals, student placements, account lockouts, or academic setup issues are waiting on you.
            </p>
          </div>
        </section>
      ) : null}

      {pulse.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="School pulse"
            title="Everything important, in one glance"
            note={`${studentLens.multiBranch ? studentLens.label : "This school"}${sessionName ? ` · ${sessionName}` : ""}`}
          />
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {pulse}
          </div>
        </section>
      )}

      {(canSeeCalendar || canSeeStudents) && (
        <section className="grid min-w-0 gap-4 lg:grid-cols-3">
          {canSeeCalendar && (
            <div className="min-w-0 rounded-3xl border border-white-02 bg-white p-4.5 shadow-[0_10px_30px_rgba(29,43,68,0.04)] sm:p-5">
              <SectionHeading
                eyebrow="Academic year"
                title={term?.name ?? "Between terms"}
                action={{ label: "Term view", to: R.ACADEMIC_CALENDAR.TERM_VIEW }}
              />
              {academicLoading ? (
                <Shimmer className="mt-5 h-28" />
              ) : calendar.isError ? (
                <p className="mt-4 text-[13px] leading-5 text-gray-05 text-pretty">
                  The term summary is unavailable right now. Refresh the page to try again.
                </p>
              ) : term ? (
                <>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mont text-3xl font-semibold leading-none text-black-01 tabular-nums">
                        {taught}
                        <span className="text-base font-medium text-gray-05"> / {teachable}</span>
                      </p>
                      <p className="mt-1.5 text-xs text-gray-05">teaching days completed</p>
                    </div>
                    <span className="rounded-full bg-pry-01 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {termPercent}%
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-04">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#4A659D,#6D86BC)] transition-[width] duration-500"
                      style={{ width: `${Math.min(100, termPercent)}%` }}
                    />
                  </div>
                  {terms.length > 0 && (
                    <ul className="mt-5 grid gap-2">
                      {terms.map((row) => (
                        <li key={row.id} className="flex items-center justify-between gap-3 text-[12px]">
                          <span className={cn("min-w-0 truncate", row.state === "ongoing" ? "font-semibold text-black-01" : "text-gray-05")}>
                            {row.name}
                          </span>
                          <span className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            row.state === "ongoing" && "bg-pry-01 text-primary",
                            row.state === "completed" && "bg-gray-04 text-gray-06",
                            row.state === "pending" && "text-gray-05",
                          )}>
                            {row.state === "ongoing" ? "underway" : row.state === "completed" ? "done" : "ahead"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="mt-4 text-[13px] leading-5 text-gray-05 text-pretty">
                  No term covers today. The calendar is ready for the next dated period.
                </p>
              )}
            </div>
          )}

          {canSeeStudents && (
            <div className="min-w-0 rounded-3xl border border-white-02 bg-white p-4.5 shadow-[0_10px_30px_rgba(29,43,68,0.04)] sm:p-5">
              <SectionHeading
                eyebrow="People"
                title="Student body"
                action={{ label: "Directory", to: R.STUDENTS.INDEX }}
              />
              {students.isLoading || studentLens.isLoading ? (
                <Shimmer className="mt-5 h-28" />
              ) : students.isError ? (
                <p className="mt-4 text-[13px] leading-5 text-gray-05 text-pretty">
                  The student summary is unavailable right now. Refresh the page to try again.
                </p>
              ) : (
                <>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mont text-3xl font-semibold leading-none text-black-01 tabular-nums">
                        {studentSummary?.on_roll ?? 0}
                      </p>
                      <p className="mt-1.5 text-xs text-gray-05">currently on the roll</p>
                    </div>
                    <Users className="size-9 text-primary/20" />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { label: "Active", value: studentSummary?.active ?? 0 },
                      { label: "Applicants", value: studentSummary?.applicants ?? 0 },
                      { label: "Need class", value: studentSummary?.unassigned ?? 0 },
                    ].map((row) => (
                      <div key={row.label} className="min-w-0 rounded-xl bg-white-05 px-2.5 py-3 text-center">
                        <p className="font-mont text-lg font-semibold leading-none text-black-01 tabular-nums">{row.value}</p>
                        <p className="mt-1.5 truncate text-[10px] text-gray-05">{row.label}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {canSeeCalendar && (
            <div className="min-w-0 rounded-3xl border border-white-02 bg-white p-4.5 shadow-[0_10px_30px_rgba(29,43,68,0.04)] sm:p-5">
              <SectionHeading
                eyebrow="Schedule"
                title="Coming up"
                action={{ label: "All events", to: R.ACADEMIC_CALENDAR.EVENTS }}
              />
              {calendar.isLoading ? (
                <Shimmer className="mt-5 h-28" />
              ) : calendar.isError ? (
                <p className="mt-4 text-[13px] leading-5 text-gray-05 text-pretty">
                  Upcoming events are unavailable right now. Refresh the page to try again.
                </p>
              ) : (cal?.next_up?.length ?? 0) === 0 ? (
                <div className="mt-5 rounded-2xl bg-white-05 px-4 py-5 text-center">
                  <CalendarDays className="mx-auto size-6 text-gray-02" />
                  <p className="mt-2 text-[12px] leading-5 text-gray-05">
                    Nothing is dated ahead of today.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 grid gap-2.5">
                  {cal!.next_up!.slice(0, 4).map((event) => (
                    <li key={event.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white-05 p-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-center shadow-sm">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-05">
                          {event.days_away === 0 ? "Now" : "In"}
                        </span>
                        <span className="font-mont text-sm font-semibold leading-none text-black-01 tabular-nums">
                          {event.days_away === 0 ? "Today" : `${event.days_away}d`}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-black-01">{event.name}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-gray-05">{event.type_label}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {modules.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="Your workspace"
            title="Go where the work is"
            note="Only modules included in your access are shown."
          />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map(({ label, description, to, icon: Icon, tone }) => (
              <Link
                key={label}
                to={to}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white-02 bg-white p-3.5 shadow-[0_6px_18px_rgba(29,43,68,0.035)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone)}>
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-black-01">{label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-gray-05">{description}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-gray-02 transition-colors group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
