import { useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  GraduationCap,
  LayoutGrid,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/custom/surface";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import type {
  AlertCode,
  CalendarOverview,
  CalendarSession,
  CalendarYear,
  TimelineTerm,
  UpcomingEvent,
} from "@/redux/services/calendar/calendar-types";
import { eventVariant } from "../components/event-kind";
import {
  formatRange,
  localDate,
  monthLabel,
  parts,
  relativeDays,
  toIso,
} from "../components/dates";

const C = routesPath.PROTECTED.ACADEMIC_CALENDAR;
const T = routesPath.PROTECTED.TIMETABLES;
const S = routesPath.PROTECTED.ACADEMIC_STRUCTURE;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type ReadyOverview = CalendarOverview & { session: CalendarSession };

/**
 * The populated calendar overview.
 *
 * The API owns every count and warning. This component only arranges those
 * facts into today, what exists, what happens next, and what needs action.
 */
export function CalendarOverviewLayout({
  overview,
  year,
  sessionName,
  canSeeSessions,
  canSeeTimetables,
  canCreateEvent,
}: {
  overview: ReadyOverview;
  year: CalendarYear;
  sessionName: string | null;
  canSeeSessions: boolean;
  canSeeTimetables: boolean;
  canCreateEvent: boolean;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const term = overview.term ?? null;
  const counts = overview.counts;
  const nextUp = overview.next_up ?? [];
  const alerts = overview.alerts ?? [];
  const terms = year.terms ?? [];
  const today = year.on || term?.start_date || overview.session.start_date;
  const taught = term?.teaching_days_elapsed ?? 0;
  const total = term?.teaching_days_total ?? 0;
  const progress = total > 0 ? Math.round((taught / total) * 100) : 0;
  const nextEvent = nextUp[0];

  return (
    <>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,.65fr)]">
        <Panel as="section" className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-black-01">
                <span className="grid size-8 place-content-center rounded-full bg-pry-01 text-primary">
                  <CalendarDays className="size-4" />
                </span>
                Today at school
              </p>
              <h2 className="mt-5 font-mont text-2xl font-semibold tracking-tight text-black-01 sm:text-3xl">
                {longDate(today)}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-black-01">
                  {term?.name ?? "Between terms"}
                </span>
                <span className="text-xs text-gray-05">
                  {overview.session.name}
                </span>
                {year.session?.read_only && (
                  <Badge variant="inactive" className="rounded-full py-0 text-[11px]">
                    Read-only
                  </Badge>
                )}
              </div>
            </div>

            {canCreateEvent && (
              <Button size="sm" asChild>
                <Link to={`${C.EVENTS}?action=new`}>
                  <Plus className="size-4" /> Add event
                </Link>
              </Button>
            )}
          </div>

          {term && total > 0 ? (
            <div className="mt-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] text-gray-06">
                  Day {taught} of {total} teaching days
                </p>
                <p className="text-[13px] font-semibold text-black-01">
                  {progress}%
                </p>
              </div>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white-02"
                role="progressbar"
                aria-label={`${term.name} teaching-day progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-05">
                School-closed days do not count.
              </p>
            </div>
          ) : (
            <p className="mt-7 rounded-lg border border-white-02 bg-white-05 px-3 py-2.5 text-sm text-gray-05">
              No term covers today.
            </p>
          )}

          <div className="mt-5 border-t border-white-02 pt-4">
            {nextEvent ? (
              <Link
                to={C.EVENTS}
                className="group flex min-w-0 items-center justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="min-w-0 text-sm text-gray-06">
                  Next: <strong className="font-medium text-black-01">{nextEvent.name}</strong>{" "}
                  <span className="text-gray-05">
                    {relativeDays(nextEvent.days_away).toLowerCase()}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-gray-05 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ) : (
              <p className="text-sm text-gray-05">Nothing dated ahead.</p>
            )}
          </div>

          {terms.length > 0 && <TermChips terms={terms} className="mt-4" />}
        </Panel>

        <MiniMonth
          anchor={today}
          monthOffset={monthOffset}
          events={nextUp}
          onMove={setMonthOffset}
        />
      </div>

      {counts && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            icon={CalendarRange}
            value={counts.terms}
            label="Terms"
            to={canSeeSessions ? S.SESSIONS : undefined}
          />
          <MetricCard
            icon={CalendarDays}
            value={counts.events_in_term}
            label={term ? `Events in ${term.name}` : "Events this year"}
            to={C.EVENTS}
            tone="green"
          />
          <MetricCard
            icon={GraduationCap}
            value={counts.classes_timetabled}
            label="Classes timetabled"
            to={canSeeTimetables ? T.CLASSES : undefined}
            tone="amber"
          />
          <MetricCard
            icon={DoorOpen}
            value={counts.rooms}
            label="Rooms"
            to={canSeeTimetables ? T.ROOMS : undefined}
            tone="violet"
          />
        </div>
      )}

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
        <UpcomingPanel events={nextUp} />
        <div className="grid min-w-0 content-start gap-5">
          <AttentionPanel
            alerts={alerts}
            sessionName={sessionName}
            canSeeSessions={canSeeSessions}
            canSeeTimetables={canSeeTimetables}
          />
          <Panel as="section" className="p-5">
            <h3 className="text-[15px] font-semibold text-black-01">Quick links</h3>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <QuickLink to={C.EVENTS} icon={CalendarDays} label="Events" description="Create and manage dates" />
              <QuickLink to={C.TERM_VIEW} icon={LayoutGrid} label="Term view" description="Browse the school year" />
              {canSeeTimetables && (
                <>
                  <QuickLink to={T.ROOMS} icon={DoorOpen} label="Rooms" description="Manage teaching spaces" />
                  <QuickLink to={T.BELL_SCHEDULE} icon={Bell} label="Bell schedule" description="Set lesson periods" />
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function longDate(iso: string) {
  const date = localDate(iso);
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
  }).format(date);
  const dayAndMonth = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(date);
  return `${weekday}, ${dayAndMonth}`;
}

function TermChips({ terms, className }: { terms: TimelineTerm[]; className?: string }) {
  return (
    <div className={cn("flex max-w-full gap-1.5 overflow-x-auto", className)}>
      {terms.map((term) => (
        <span
          key={term.id}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
            term.state === "ongoing"
              ? "border-primary bg-pry-01 font-medium text-primary"
              : term.state === "completed"
                ? "border-white-02 bg-white-05 text-gray-05"
                : "border-white-02 bg-white text-gray-06",
          )}
        >
          {term.state === "completed" && <Check className="size-3" />}
          {term.name}{term.state === "ongoing" && " · now"}
        </span>
      ))}
    </div>
  );
}

function MiniMonth({ anchor, monthOffset, events, onMove }: {
  anchor: string;
  monthOffset: number;
  events: UpcomingEvent[];
  onMove: (offset: number) => void;
}) {
  const base = localDate(anchor);
  const visible = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = visible.getFullYear();
  const month = visible.getMonth() + 1;
  const leading = (visible.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7;

  return (
    <Panel as="section" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => onMove(monthOffset - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <h3 className="text-sm font-semibold text-black-01">{monthLabel(year, month)}</h3>
        <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => onMove(monthOffset + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day) => <span key={day} className="text-[10px] font-medium uppercase tracking-wide text-gray-05">{day}</span>)}
        {Array.from({ length: cellCount }).map((_, index) => {
          const date = new Date(year, month - 1, index - leading + 1);
          const iso = toIso(date);
          const inMonth = date.getMonth() + 1 === month;
          const isToday = iso === anchor;
          const hasEvent = events.some((event) => event.start_date <= iso && event.end_date >= iso);
          return (
            <span
              key={iso}
              className={cn(
                "relative mx-auto grid size-8 place-content-center rounded-full text-xs",
                inMonth ? "text-gray-06" : "text-gray-02",
                isToday && "bg-primary font-semibold text-white",
              )}
            >
              {date.getDate()}
              {hasEvent && !isToday && <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />}
            </span>
          );
        })}
      </div>
      <Link to={C.TERM_VIEW} className="mt-4 flex items-center justify-between gap-2 border-t border-white-02 pt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        Open term view <ArrowRight className="size-3.5" />
      </Link>
    </Panel>
  );
}

function MetricCard({ icon: Icon, value, label, to, tone = "blue" }: {
  icon: typeof CalendarDays;
  value: number;
  label: string;
  to?: string;
  tone?: "blue" | "green" | "amber" | "violet";
}) {
  const content = (
    <>
      <span className={cn(
        "grid size-10 shrink-0 place-content-center rounded-full",
        tone === "blue" && "bg-pry-01 text-primary",
        tone === "green" && "bg-green-01/10 text-green-01-text",
        tone === "amber" && "bg-yellow-01/10 text-yellow-01-text",
        tone === "violet" && "bg-violet-100 text-violet-700",
      )}><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold text-black-01">{value}</span>
        <span className="block text-xs text-gray-05">{label}</span>
      </span>
      {to && <ArrowRight className="size-4 shrink-0 text-gray-02 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />}
    </>
  );
  const className = "group flex min-w-0 items-center gap-3 rounded-md border border-border bg-white p-4 transition-all";
  return to ? (
    <Link to={to} className={`${className} hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>{content}</Link>
  ) : <div className={className}>{content}</div>;
}

function UpcomingPanel({ events }: { events: UpcomingEvent[] }) {
  return (
    <Panel as="section" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white-02 pb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-black-01">Coming up</h3>
          <p className="mt-0.5 text-xs text-gray-05">The next dated entries across the school year.</p>
        </div>
        <Link to={C.EVENTS} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          View all events <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="mt-4 rounded-lg border border-white-02 bg-white-05 px-3 py-3 text-sm text-gray-05">Nothing dated ahead.</p>
      ) : (
        <ul className="divide-y divide-white-02">
          {events.map((event) => {
            const [, month, day] = parts(event.start_date);
            return (
              <li key={event.id}>
                <Link to={C.EVENTS} className="group grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-pry-01/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
                  <span className="rounded-lg bg-white-05 px-1.5 py-2 text-center">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">{shortMonth(month)}</span>
                    <span className="block text-lg font-semibold leading-none text-black-01">{day}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-black-01">{event.name}</span>
                      <Badge variant={eventVariant(event.event_type)} className="shrink-0 rounded-full py-0 text-[10px]">{event.type_label}</Badge>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-05">
                      <span>{formatRange(event.start_date, event.end_date)}</span>
                      <span className="font-medium text-gray-06">{relativeDays(event.days_away)}</span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-gray-02 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function AttentionPanel({ alerts, sessionName, canSeeSessions, canSeeTimetables }: {
  alerts: { code: AlertCode; detail: string }[];
  sessionName: string | null;
  canSeeSessions: boolean;
  canSeeTimetables: boolean;
}) {
  return (
    <Panel as="section" className="p-5">
      <div className="flex items-center justify-between gap-2 border-b border-white-02 pb-4">
        <h3 className="text-[15px] font-semibold text-black-01">Needs attention</h3>
        {alerts.length > 0 && <Badge variant="amber" className="rounded-full py-0 text-[11px]">{alerts.length}</Badge>}
      </div>
      {alerts.length === 0 ? (
        <p className="mt-4 rounded-lg border border-white-02 bg-white-05 px-3 py-3 text-sm text-gray-05">Nothing needs attention{sessionName ? ` in ${sessionName}` : ""}.</p>
      ) : (
        <ul className="mt-1 divide-y divide-white-02">
          {alerts.map((alert) => {
            const to = alertDestination(alert.code, canSeeSessions, canSeeTimetables);
            const content = <>
              <span className="grid size-9 shrink-0 place-content-center rounded-full bg-yellow-01/10 text-yellow-01-text"><AlertTriangle className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-black-01">{ALERT_TITLES[alert.code]}</span>
                <span className="mt-0.5 block text-xs text-gray-05">{alert.detail}</span>
              </span>
              {to && <ArrowRight className="size-4 shrink-0 text-gray-02 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />}
            </>;
            return <li key={alert.code}>{to ? (
              <Link to={to} className="group flex min-w-0 items-start gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-pry-01/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{content}</Link>
            ) : <div className="flex min-w-0 items-start gap-3 px-1 py-3">{content}</div>}</li>;
          })}
        </ul>
      )}
    </Panel>
  );
}

function QuickLink({ to, icon: Icon, label, description }: {
  to: string;
  icon: typeof CalendarDays;
  label: string;
  description: string;
}) {
  return (
    <Link to={to} className="group min-w-0 rounded-lg border border-white-02 p-3 transition-all hover:border-primary/60 hover:bg-pry-01/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className="flex items-center justify-between gap-2">
        <Icon className="size-4 text-primary" />
        <ArrowRight className="size-3.5 text-gray-02 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </span>
      <span className="mt-3 block text-[13px] font-semibold text-black-01">{label}</span>
      <span className="mt-0.5 block text-[11px] text-gray-05">{description}</span>
    </Link>
  );
}

function shortMonth(month: number) {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2026, month - 1, 1));
}

function alertDestination(code: AlertCode, canSeeSessions: boolean, canSeeTimetables: boolean) {
  if (code === "EVENT_OUTSIDE_ANY_TERM") return C.EVENTS;
  if (code === "SESSION_HAS_NO_TERMS" || code === "TERM_OUTSIDE_SESSION" || code === "TERM_DATES_OVERLAP") {
    return canSeeSessions ? S.SESSIONS : undefined;
  }
  return canSeeTimetables ? T.CLASSES : undefined;
}

const ALERT_TITLES: Record<AlertCode, string> = {
  SESSION_HAS_NO_TERMS: "This year has no terms",
  EVENT_OUTSIDE_ANY_TERM: "Events outside every term",
  TERM_OUTSIDE_SESSION: "A term falls outside the year",
  TERM_DATES_OVERLAP: "Two terms overlap",
  TIMETABLE_HAS_CLASHES: "Unresolved timetable clashes",
  CLASS_HAS_NO_TIMETABLE: "Classes with no timetable",
};
