import { useState } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  GraduationCap,
  LayoutList,
  Layers,
  ListTree,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { cn, formatMonthYearShort } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { useGetAcademicOverviewQuery } from "@/redux/services/academics/academics-api";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import type {
  AcademicOverview,
  OverviewSession,
  TermState,
} from "@/redux/services/academics/academics-types";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { StructureTree } from "./structure-tree";
import { PageShell } from "@/components/layout/page-shell";

/**
 * Academic Structure - the overview.
 *
 * One call, `/v1/academics/overview/`, because it is one screen: composing it
 * from the five list endpoints would make a page of numbers cost five round
 * trips and paginate lists nobody is reading.
 *
 * The counts answer to both pills. `OverviewView` reads the branch and the
 * year, so switching either changes the numbers rather than leaving a total
 * sitting under a filter it ignores.
 */
export default function AcademicStructureOverview() {
  const { lens, branch, multiBranch } = useAcademicsLens();
  const [view, setView] = useState<"list" | "tree">("list");

  const { data, isLoading, isError, refetch } = useGetAcademicOverviewQuery(lens);
  const overview = data?.data;

  if (isLoading) {
    return (
      <PageShell className="content-start gap-6" grid>
        <Skeleton className="h-44 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-md" />
      </PageShell>
    );
  }

  if (isError || !overview) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={GraduationCap}
          title="We could not load your academic structure"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  // The year being READ, not the year being run - the counts below are its.
  // They are the same block until somebody looks back at last year.
  const {
    viewed_session: viewed,
    active_session: active,
    counts,
    branches_without_a_session: orphans,
  } = overview;
  const session = viewed ?? active;

  return (
    <PageShell className="content-start gap-6" grid>
      <SessionHero session={session} departments={counts.departments} />

      {/* Only reachable once a school has split its calendar by branch. There is
          no correct year to guess for a branch opened afterwards, so the server
          reports it and the school answers it. */}
      {orphans.length > 0 && (
        <OutlinedNotice
          icon={CalendarRange}
          title={
            orphans.length === 1
              ? `${orphans[0].name} is in no academic session`
              : `${orphans.length} branches are in no academic session`
          }
          body={`${orphans
            .map((b) => b.name)
            .join(", ")} ${orphans.length === 1 ? "runs" : "run"} no year at the moment, because every live session names the branches it applies to. Add ${orphans.length === 1 ? "it" : "them"} to a session so the branch has a calendar.`}
          actionLabel="Open sessions"
          onAction={() => {
            window.location.href = routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS;
          }}
        />
      )}

      <CountSpine counts={counts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium text-black-01">The structure</h2>
        <SegmentedToggle
          ariaLabel="Structure view"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List", icon: LayoutList },
            { value: "tree", label: "Tree", icon: ListTree },
          ]}
        />
      </div>

      {view === "list" ? (
        <SpineList counts={counts} multiBranch={multiBranch} branch={branch} />
      ) : (
        <StructureTree />
      )}
    </PageShell>
  );
}

// ── The hero: one year, stated once ─────────────────────────────────────────

const TERM_TONE: Record<TermState, string> = {
  completed: "bg-green-01/10 text-green-01-text",
  ongoing: "bg-yellow-01/10 text-yellow-01-text",
  pending: "border border-white-02 text-gray-05",
};

function SessionHero({
  session,
  departments,
}: {
  session: OverviewSession | null;
  departments: number;
}) {
  if (!session) {
    return (
      <OutlinedNotice
        icon={CalendarRange}
        title="No active academic session"
        body="The academic structure hangs off a school year. Create one and make it active, and everything below starts to mean something."
        actionLabel="Go to sessions"
        onAction={() => {
          window.location.href = routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS;
        }}
      />
    );
  }

  const termLine = session.current_term
    ? `${session.current_term} underway`
    : session.next_term
      ? `${session.next_term} is next`
      : "Session complete";

  // The green edge would be a lie on a draft or archived year, and the counts
  // underneath are that year's.
  const live = session.status === "ACTIVE";
  const tone = live
    ? "border-green-01"
    : session.status === "ARCHIVED"
      ? "border-gray-04"
      : "border-yellow-01";

  return (
    <section className={cn("rounded-md border-l-4 bg-white px-5 py-4", tone)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-medium text-black-01">
            {session.name} Academic Session
          </h1>
          <p className="text-xs text-gray-01">
            {formatMonthYearShort(session.start_date)} -{" "}
            {formatMonthYearShort(session.end_date)} · {termLine}
          </p>
        </div>
        <Badge
          variant={live ? "active" : "secondary"}
          className="h-fit rounded-full py-0 text-[11px] uppercase"
        >
          {live ? "Active" : session.status === "ARCHIVED" ? "Archived" : "Draft"}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-04">
          <div
            className={cn("h-full rounded-full", live ? "bg-green-01" : "bg-gray-01")}
            style={{ width: `${session.percent_elapsed}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-05">
          {session.percent_elapsed}% elapsed
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {session.terms.map((term) => (
          <span
            key={term.id}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs",
              TERM_TONE[term.state],
            )}
          >
            {term.name.replace(" Term", "")}
            {term.state === "ongoing" && " · ongoing"}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white-02 pt-3">
        <p className="text-xs text-gray-05">
          {departments} {departments === 1 ? "department" : "departments"}
        </p>
        <Link
          to={routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Sessions &amp; terms
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

// ── The count spine ─────────────────────────────────────────────────────────

type Counts = AcademicOverview["counts"];

function CountSpine({ counts }: { counts: Counts }) {
  const cards = [
    { label: "Programmes", value: counts.programs, icon: Layers },
    { label: "Levels", value: counts.levels, icon: ListTree },
    { label: "Classes", value: counts.classes, icon: Users },
    { label: "Subjects", value: counts.subjects, icon: BookOpen },
  ];
  return (
    // Two columns on a phone: four single-digit counts side by side would be
    // four slivers.
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Panel key={card.label} className="px-4 py-3">
          <div className="flex items-center gap-2 text-gray-05">
            <card.icon className="size-4 shrink-0" />
            <p className="min-w-0 truncate text-xs">{card.label}</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-black-01">{card.value}</p>
        </Panel>
      ))}
    </div>
  );
}

// ── The list view ───────────────────────────────────────────────────────────


/**
 * The six things the structure is made of.
 *
 * A row links only when its screen exists. The other rows still carry their
 * real count - "5 departments" is a true fact from the overview - but they are
 * not drawn as doors, because a nav item that leads nowhere is worse than one
 * that is not there yet. Each phase turns its own row into a link.
 */
function SpineList({
  counts,
  multiBranch,
  branch,
}: {
  counts: Counts;
  multiBranch: boolean;
  branch: number | "all";
}) {
  const P = routesPath.PROTECTED.ACADEMIC_STRUCTURE;
  const scoped = multiBranch && branch !== "all" ? " in this branch" : "";

  const rows: {
    title: string;
    body: string;
    count: string;
    icon: React.ElementType;
    to?: string;
  }[] = [
    {
      title: "Sessions & Terms",
      body: "The school year and the terms inside it.",
      count: `${counts.sessions} ${counts.sessions === 1 ? "session" : "sessions"}`,
      icon: CalendarRange,
      to: P.SESSIONS,
    },
    {
      title: "Departments",
      body: "Faculty groupings that programmes and subjects hang off.",
      count: `${counts.departments}${scoped}`,
      icon: Layers,
      to: P.DEPARTMENTS,
    },
    {
      title: "Programmes & Levels",
      body: "The programmes pupils move through, and the levels in each.",
      count: `${counts.programs} ${counts.programs === 1 ? "programme" : "programmes"}`,
      icon: ListTree,
      to: P.PROGRAMS,
    },
    {
      title: "Classes & Arms",
      body: "The classes pupils sit in, with their arms or streams.",
      count: `${counts.classes}${scoped}`,
      icon: Users,
      to: P.CLASSES,
    },
    {
      title: "Subjects",
      body: "What is taught, and the levels it is offered at.",
      count: `${counts.subjects}${scoped}`,
      icon: BookOpen,
      to: P.SUBJECTS,
    },
  ];

  return (
    <Panel as="section" className="divide-y divide-border overflow-hidden">
      {rows.map((row) => {
        const inner = (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-9 shrink-0 place-content-center rounded-md bg-gray-04 text-gray-06">
              <row.icon className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-black-01">{row.title}</p>
              <p className="truncate text-xs text-gray-05">{row.body}</p>
            </div>
            <span className="hidden shrink-0 text-xs text-gray-05 sm:block">
              {row.count}
            </span>
            {row.to && <ChevronRight className="size-4 shrink-0 text-gray-06" />}
          </div>
        );
        return row.to ? (
          <Link key={row.title} to={row.to} className="block hover:bg-white-05">
            {inner}
          </Link>
        ) : (
          <div key={row.title}>{inner}</div>
        );
      })}
    </Panel>
  );
}
