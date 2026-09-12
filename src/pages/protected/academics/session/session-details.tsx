import { useState } from "react";
import { useParams } from "react-router";
import {
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  Clock3,
  Globe2,
  Lock,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { cn, formatMonthYearShort } from "@/lib/utils";
import { useGetSessionQuery } from "@/redux/services/academics/academics-api";
import type { Term } from "@/redux/services/academics/academics-types";
import { Panel } from "@/components/custom/surface";
import { SessionDrawer } from "./session-drawer";
import { SessionStatusChip } from "./session-chips";
import {
  scopeOf,
  teachingWeeks,
  TERM_LABEL,
  TERM_TONE,
  termState,
  weeksBetween,
} from "./session-format";
import { PageShell } from "@/components/layout/page-shell";

/**
 * One school year and the ordered terms inside it.
 *
 * The timeline and cards use the session's own term dates. Events remain in
 * Academic Calendar, and no assessment figures appear here because neither is
 * part of an academic session record.
 */
export default function SessionDetails() {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);

  const sessionId = Number(id);
  const { data, isLoading, isError, refetch } = useGetSessionQuery(sessionId, {
    skip: !Number.isFinite(sessionId),
  });
  const session = data?.data;

  if (isLoading) {
    return (
      <PageShell className="content-start gap-5 pb-10" grid>
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-44 w-full rounded-md" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-md" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError || !session) {
    return (
      <PageShell className="pb-10">
        <OutlinedNotice
          icon={CalendarRange}
          title="We could not load this session"
          body="It may have been removed, or something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  const archived = session.status === "ARCHIVED";
  const weeks = teachingWeeks(session.terms);

  return (
    <PageShell className="content-start gap-5 pb-10" grid>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-black-01">
              {session.name} Academic Session
            </h1>
            <SessionStatusChip status={session.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-05">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {formatMonthYearShort(session.start_date)} -{" "}
              {formatMonthYearShort(session.end_date)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Globe2 className="size-3.5 shrink-0" />
              <span className="truncate">Applies to {scopeOf(session)}</span>
            </span>
          </div>
        </div>

        {!archived && (
          <PermissionGate permission={P.MODIFY_SESSION}>
            <Button
              variant="outline"
              className="shrink-0 border-primary text-primary"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
              Edit session
            </Button>
          </PermissionGate>
        )}
      </div>

      {archived && (
        <Panel className="flex items-start gap-2.5 bg-white-05 px-4 py-3 text-xs text-gray-05">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <p className="text-pretty">
            This session is archived and read-only. Make it active before changing its dates or terms.
          </p>
        </Panel>
      )}

      <Panel as="section" className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <SummaryItem
          icon={Clock3}
          label="Teaching weeks"
          value={`${weeks} ${weeks === 1 ? "week" : "weeks"}`}
        />
        <SummaryItem
          icon={BookOpenCheck}
          label="Terms"
          value={`${session.term_count} ${session.term_count === 1 ? "term" : "terms"}`}
        />
      </Panel>

      <Panel as="section" className="min-w-0 overflow-hidden" aria-labelledby="progress-heading">
        <div className="border-b border-white-02 px-4 py-3 sm:px-5">
          <h2 id="progress-heading" className="font-semibold text-black-01">
            Session progress
          </h2>
          <p className="mt-0.5 text-xs text-gray-05">
            Follow the school year from the first teaching day to the last.
          </p>
        </div>
        <SessionProgress terms={session.terms} />
      </Panel>

      <section className="grid gap-3" aria-labelledby="terms-heading">
        <div>
          <h2 id="terms-heading" className="font-semibold text-black-01">
            Terms
          </h2>
          <p className="mt-0.5 text-xs text-gray-05">
            Dates and teaching weeks for this session.
          </p>
        </div>

        {session.terms.length ? (
          <div className="grid items-start gap-4 md:grid-cols-3">
            {session.terms.map((term, index) => (
              <TermCard key={term.id} term={term} index={index} />
            ))}
          </div>
        ) : (
          <Panel className="px-4 py-6 text-center text-sm text-gray-05">
            This session has no terms yet. Edit it to add them.
          </Panel>
        )}
      </section>

      <SessionDrawer
        open={editing}
        session={session}
        onClose={() => setEditing(false)}
      />
    </PageShell>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-05">{label}</p>
        <p className="truncate text-base font-semibold text-black-01">{value}</p>
      </div>
    </div>
  );
}

function SessionProgress({ terms }: { terms: Term[] }) {
  if (!terms.length) {
    return (
      <p className="px-5 py-8 text-sm text-gray-05">
        Add terms to build the session timeline.
      </p>
    );
  }

  return (
    <>
    <div className="grid gap-0 px-4 py-5 sm:px-5 lg:hidden">
      {terms.map((term, index) => {
        const state = termState(term);
        return (
          <div key={term.id} className="relative flex min-w-0 gap-3 pb-5 last:pb-0">
            {index < terms.length - 1 && (
              <span
                className={cn(
                  "absolute bottom-0 left-[15px] top-8 w-0.5",
                  state === "completed" ? "bg-green-01" : "bg-gray-02",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-content-center rounded-full border text-xs font-semibold",
                state === "completed" && "border-green-01 bg-green-01 text-white",
                state === "ongoing" &&
                  "border-yellow-01 bg-yellow-01/10 text-yellow-01-text",
                state === "pending" && "border-gray-02 bg-white text-gray-05",
              )}
            >
              {state === "completed" ? <Check className="size-4" /> : index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-black-01">{term.name}</p>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-[11px]",
                    TERM_TONE[state],
                  )}
                >
                  {TERM_LABEL[state]}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-05">
                {formatMonthYearShort(term.start_date)} -{" "}
                {formatMonthYearShort(term.end_date)}
              </p>
            </div>
          </div>
        );
      })}
    </div>

    <div className="hidden max-w-full overflow-x-auto px-4 py-5 sm:px-5 lg:block">
      <div
        className="grid min-w-[36rem]"
        style={{ gridTemplateColumns: `repeat(${terms.length}, minmax(0, 1fr))` }}
      >
        {terms.map((term, index) => {
          const state = termState(term);
          return (
            <div key={term.id} className="relative min-w-0 px-2 text-center">
              {index > 0 && (
                <span
                  className={cn(
                    "absolute left-0 top-4 h-0.5 w-1/2",
                    state === "completed" ? "bg-green-01" : "bg-gray-02",
                  )}
                />
              )}
              {index < terms.length - 1 && (
                <span
                  className={cn(
                    "absolute right-0 top-4 h-0.5 w-1/2",
                    state === "completed" ? "bg-green-01" : "bg-gray-02",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 mx-auto grid size-8 place-content-center rounded-full border text-xs font-semibold",
                  state === "completed" && "border-green-01 bg-green-01 text-white",
                  state === "ongoing" &&
                    "border-yellow-01 bg-yellow-01/10 text-yellow-01-text",
                  state === "pending" && "border-gray-02 bg-white text-gray-05",
                )}
              >
                {state === "completed" ? <Check className="size-4" /> : index + 1}
              </span>
              <p className="mt-2 truncate text-sm font-semibold text-black-01">
                {term.name}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-05">
                {formatMonthYearShort(term.start_date)} -{" "}
                {formatMonthYearShort(term.end_date)}
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px]",
                  TERM_TONE[state],
                )}
              >
                {TERM_LABEL[state]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}

function TermCard({ term, index }: { term: Term; index: number }) {
  const state = termState(term);
  const weeks = weeksBetween(term.start_date, term.end_date);

  return (
    <Panel className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
          {index + 1}
        </span>
        <span
          className={cn(
            "h-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px]",
            TERM_TONE[state],
          )}
        >
          {TERM_LABEL[state]}
        </span>
      </div>
      <h3 className="mt-3 truncate font-semibold text-black-01">{term.name}</h3>
      <p className="mt-1 text-xs text-gray-05">
        {formatMonthYearShort(term.start_date)} -{" "}
        {formatMonthYearShort(term.end_date)}
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-01">
        <Clock3 className="size-3.5 text-gray-05" />
        {weeks} teaching {weeks === 1 ? "week" : "weeks"}
      </p>
    </Panel>
  );
}
