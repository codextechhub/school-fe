import { useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/custom/surface";
import PromptModal from "@/components/modal/prompt-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { parseApiError } from "@/utils/api-error";
import { cn, getVariantColor } from "@/lib/utils";
import { toast } from "sonner";

import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useGetCalendarEventsQuery,
  useGetCalendarYearQuery,
  useUpdateCalendarEventMutation,
} from "@/redux/services/calendar/calendar-api";
import {
  useGetClassesQuery,
  useGetProgramsQuery,
} from "@/redux/services/academics/academics-api";
import type {
  CalendarEvent,
  CalendarEventWrite,
} from "@/redux/services/calendar/calendar-types";
import { warnAboutClashes } from "../components/clash-toast";
import { DayEventsDialog } from "../components/day-events-dialog";
import { eventDeleteBody } from "../components/event-delete";
import { EventDetail, EventDrawer } from "../components/event-drawer";
import { blankEvent, draftFrom } from "../components/event-draft";
import { eventVariant } from "../components/event-kind";
import { PageShell } from "@/components/layout/page-shell";
import {
  daysBetween,
  formatDate,
  formatRange,
  localDate,
  monthLabel,
  parts,
  toIso,
} from "../components/dates";
import { monthWindow } from "./month-window";

/**
 * The same events as the list, read as a shape instead of as rows.
 *
 * Two views of one year, and each answers a question the other cannot. The
 * timeline answers "where are we in the year" - three terms, their gaps, and
 * today's mark. The month grid answers "what does November look like", which is
 * the question somebody asks before booking anything.
 *
 * **The month is fetched, not filtered.** The grid asks the server for the
 * window it is drawing (`from`/`to`), rather than pulling every event of the
 * year and slicing locally. A school with two hundred dated entries would
 * otherwise pay for all of them to draw thirty days, and the paginated list
 * would silently be missing the ones on page two.
 *
 * **Every date here is a plain calendar date.** See `../components/dates`: a
 * one-day holiday parsed as an instant lands on the wrong day for every reader
 * west of Greenwich.
 */
export default function TermView() {
  const { lens, branch, multiBranch, readOnlyYear } = useAcademicsLens();
  const { hasPermission } = usePermissions();

  const { data: yearData, isLoading, isError, refetch } =
    useGetCalendarYearQuery({ session: lens.session });
  const year = yearData?.data ?? {};
  const terms = year.terms ?? [];
  const session = year.session;
  const today = year.on ?? "";

  // Which month the grid is showing. Starts on the month `today` falls in, so
  // the screen opens on the month the reader is living in rather than on the
  // first month of the year.
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [viewing, setViewing] = useState<CalendarEvent | null>(null);
  // The day a reader pressed, waiting to become an event.
  const [addingOn, setAddingOn] = useState<string | null>(null);
  // The day whose entries are listed in the centre. Set only for a day that
  // has some - an empty day goes straight to the form.
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  // The event being edited, opened from its own detail panel.
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  // The event the X was pressed on, waiting on the confirm.
  const [confirm, setConfirm] = useState<CalendarEvent | null>(null);

  const { data: programData } = useGetProgramsQuery(lens);
  const { data: classData } = useGetClassesQuery(lens);
  const [create, { isLoading: creating }] = useCreateCalendarEventMutation();
  const [update, { isLoading: updating }] = useUpdateCalendarEventMutation();
  const [remove, { isLoading: removing }] = useDeleteCalendarEventMutation();
  const canCreate = hasPermission(P.CREATE_CALENDAR_EVENT) && !readOnlyYear;
  const canEdit = hasPermission(P.MODIFY_CALENDAR_EVENT) && !readOnlyYear;
  const canDelete = hasPermission(P.DELETE_CALENDAR_EVENT) && !readOnlyYear;

  /**
   * Pressing a day.
   *
   * An empty day means one thing, so it goes straight to the form. A day that
   * already holds something means three - show me, fix that one, add another -
   * so it opens the list, which offers all three instead of guessing.
   */
  const pressDay = (iso: string, onDay: CalendarEvent[]) => {
    if (onDay.length) setDayOpen(iso);
    else if (canCreate) setAddingOn(iso);
  };

  /** Opening an event: the form for a reader who may edit, the detail if not. */
  const openEvent = (event: CalendarEvent) => {
    setDayOpen(null);
    if (canEdit) setEditing(event);
    else setViewing(event);
  };

  const anchor = today || session?.start_date || "";
  const [ay, am] = anchor ? parts(anchor) : [0, 0];
  const view = cursor ?? (anchor ? { y: ay, m: am } : null);

  // The window the grid draws: the whole month, plus the days of the
  // neighbouring months that share its first and last weeks. Six Date
  // constructions, so it is computed rather than memoised - a memo keyed on an
  // object rebuilt every render costs more than the sum it is caching.
  const window = view ? monthWindow(view.y, view.m) : null;

  const { data: eventData, isFetching } = useGetCalendarEventsQuery(
    window
      ? { ...lens, from: window.from, to: window.to }
      : // Nothing to draw yet: the year has not arrived, so there is no month.
        // `skip` would need a second hook shape; an impossible window is the
        // cheaper way to say "not yet" and it is never rendered.
        { ...lens, from: "9999-12-31", to: "9999-12-31" },
  );
  const events = eventData?.data ?? [];

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CalendarRange}
          title="We could not load your calendar"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell className="content-start gap-5" grid>
        <Skeleton className="h-32 w-full rounded-md" />
        <Skeleton className="h-[26rem] w-full rounded-md" />
      </PageShell>
    );
  }

  if (!session || !view || !window) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CalendarRange}
          title="No school year yet"
          body="The timeline draws a school year and the grid draws its months, so both wait on one being started."
        />
      </PageShell>
    );
  }

  const move = (by: number) => {
    const next = new Date(view.y, view.m - 1 + by, 1);
    setCursor({ y: next.getFullYear(), m: next.getMonth() + 1 });
  };

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
            Term view
          </h1>
          <p className="mt-1 text-sm text-gray-01">
            See the shape of {session.name} and open any day to manage its events.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setAddingOn(today || session.start_date)}>
            <Plus className="size-4" /> Add event
          </Button>
        )}
      </div>

      <Panel as="section" className="p-5 sm:p-6" aria-labelledby="school-year-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="school-year-heading"
            className="flex items-center gap-2 text-sm font-semibold text-black-01"
          >
            <span className="grid size-8 place-content-center rounded-full bg-pry-01 text-primary">
              <CalendarRange className="size-4" />
            </span>
            School year timeline
          </h2>
          {session.read_only && (
            <Badge variant="inactive" className="rounded-full text-xs">
              Read-only year
            </Badge>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-05">
          Breaks appear as spaces between terms.
        </p>
        <Timeline
          start={session.start_date}
          end={session.end_date}
          today={today}
          terms={terms}
        />
      </Panel>

      <Panel as="section" className="p-4 sm:p-5" aria-labelledby="month-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-content-center rounded-full bg-pry-01 text-primary">
              <CalendarDays className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-06">Month calendar</p>
              <h2
                id="month-heading"
                className="mt-0.5 font-mont text-lg font-semibold text-black-01"
              >
                {monthLabel(view.y, view.m)}
              </h2>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => move(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor({ y: ay, m: am })}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => move(1)}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 border-y border-white-02 py-3 text-[11px] text-gray-05">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" /> Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-error-text/70" /> School closed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-green-01" /> Event
          </span>
          <span className="ml-auto hidden text-gray-05 sm:inline">
            Select a day to view or add events.
          </span>
        </div>

        {/* The full seven-day grid fits at every width. Smaller screens use
            event dots because a narrow day cell cannot hold readable names;
            selecting the day reveals the full event list. */}
        <div className="mt-4 min-w-0">
          <div className="min-w-0">
            <div className="grid grid-cols-7 gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <p
                  key={d}
                  className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-gray-05"
                >
                  {d}
                </p>
              ))}
              {Array.from({ length: window.cells }).map((_, i) => {
                const cell = new Date(localDate(window.from));
                cell.setDate(cell.getDate() + i);
                const iso = toIso(cell);
                const inMonth = cell.getMonth() + 1 === view.m;
                const onDay = events.filter(
                  (e) => e.start_date <= iso && e.end_date >= iso,
                );
                const closed = onDay.some((e) => e.closes_school);
                // Pressable when there is something to show, or something the
                // reader could add. A day with neither is inert rather than a
                // control that opens nothing.
                const pressable = inMonth && (onDay.length > 0 || canCreate);
                return (
                  <div
                    key={iso}
                    // Pressing the day adds an event on it. The events inside
                    // stop their own presses, so opening one never also opens
                    // the form for the day underneath it.
                    role={pressable ? "button" : undefined}
                    tabIndex={pressable ? 0 : undefined}
                    aria-label={
                      pressable
                        ? onDay.length
                          ? `${onDay.length} on ${formatDate(iso)}`
                          : `Add an event on ${formatDate(iso)}`
                        : undefined
                    }
                    onClick={pressable ? () => pressDay(iso, onDay) : undefined}
                    onKeyDown={(e) => {
                      if (!pressable) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        pressDay(iso, onDay);
                      }
                    }}
                    className={cn(
                      "min-h-14 rounded-lg border p-1 transition-all lg:min-h-24 lg:p-1.5",
                      inMonth
                        ? "border-white-02 bg-white"
                        : "border-transparent bg-white-05/50 opacity-40",
                      closed && inMonth && "border-error-text/20 bg-error-text/[0.03]",
                      iso === today && "border-primary bg-pry-01/30 shadow-sm",
                      pressable &&
                        "cursor-pointer hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "grid size-5 place-content-center rounded-full text-xs",
                          iso === today
                            ? "bg-primary font-semibold text-white"
                            : "text-gray-06",
                        )}
                      >
                        {cell.getDate()}
                      </span>
                      {/* The word only where it fits. At phone width there is
                          no room for it beside the date, and it spilled over
                          the next day's cell; the primary border and the bold
                          number already mark today without it. */}
                      {iso === today && (
                        <span className="hidden text-[9px] font-semibold uppercase tracking-wide text-primary lg:inline">
                          Today
                        </span>
                      )}
                      {closed && iso !== today && (
                        <span className="hidden text-[9px] uppercase tracking-wide text-gray-05 lg:inline">
                          Closed
                        </span>
                      )}
                    </div>
                    {/* Named chips where there is room for a name. */}
                    <div className="mt-1 hidden gap-1 lg:grid">
                      {onDay.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className="block min-w-0 text-left"
                        >
                          <Badge
                            variant={eventVariant(event.event_type)}
                            className="w-full justify-start rounded py-0 text-[10px]"
                          >
                            <span className="truncate">{event.name}</span>
                          </Badge>
                        </span>
                      ))}
                      {onDay.length > 2 && (
                        <span className="pl-0.5 text-[10px] text-gray-05">
                          +{onDay.length - 2} more
                        </span>
                      )}
                    </div>

                    {/* And a dot each where there is not. The button is padded
                        to a tappable size around a 6px dot - the dot is the
                        mark, the button is the target. */}
                    <div className="mt-0.5 flex flex-wrap items-center lg:hidden">
                      {onDay.slice(0, 4).map((event) => (
                        <span
                          key={event.id}
                          title={event.name}
                          className="grid size-5 place-content-center"
                        >
                          <span
                            className="block size-1.5 rounded-full"
                            style={{
                              background: getVariantColor(
                                eventVariant(event.event_type),
                              ),
                            }}
                          />
                        </span>
                      ))}
                      {onDay.length > 4 && (
                        <span className="text-[9px] text-gray-05">
                          +{onDay.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {isFetching && (
          <p className="mt-3 text-xs text-gray-05">Loading this month…</p>
        )}
      </Panel>

      {/* Pre-dated to the day that was pressed, so the one thing the reader
          already told us is not asked again. */}
      <EventDrawer
        open={!!addingOn || !!editing}
        editing={!!editing}
        saving={creating || updating}
        initial={
          editing
            ? draftFrom(editing)
            : {
                ...blankEvent(branch === "all" ? null : branch),
                start_date: addingOn ?? "",
                end_date: addingOn ?? "",
              }
        }
        programs={programData?.data ?? []}
        classes={classData?.data ?? []}
        onClose={() => {
          setAddingOn(null);
          setEditing(null);
        }}
        onSave={async (body: CalendarEventWrite) => {
          const result = editing
            ? await update({ id: editing.id, ...body }).unwrap()
            : await create(body).unwrap();
          toast.success(result.message);
          warnAboutClashes(result.data, canEdit ? setEditing : undefined);
        }}
      />

      {/* Opened by pressing an event on the grid. Its Edit hands the same
          event to the form, so a mistyped date is corrected where it was
          noticed rather than by going to find it on the Events screen. */}
      <DayEventsDialog
        date={dayOpen ?? ""}
        events={dayOpen ? events.filter((e) => e.start_date <= dayOpen && e.end_date >= dayOpen) : []}
        open={!!dayOpen}
        multiBranch={multiBranch}
        canCreate={canCreate}
        onClose={() => setDayOpen(null)}
        onPick={openEvent}
        onDelete={
          canDelete
            ? (event) => {
                // The day box closes behind the confirm: two stacked dialogs
                // asking different questions is one too many.
                setDayOpen(null);
                setConfirm(event);
              }
            : undefined
        }
        onAdd={() => {
          const day = dayOpen;
          setDayOpen(null);
          setAddingOn(day);
        }}
      />

      <PromptModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          try {
            const result = await remove(confirm.id).unwrap();
            toast.success(result.message || `${confirm.name} removed.`);
          } catch (error) {
            toast.error(
              parseApiError(error).message ||
                "That event could not be removed.",
            );
          }
          setConfirm(null);
        }}
        loading={removing}
        canCancel
        title={`Remove ${confirm?.name}?`}
        description={eventDeleteBody(confirm)}
        onConfirmText="Remove"
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
      />

      <EventDetail
        event={viewing}
        open={!!viewing}
        multiBranch={multiBranch}
        onClose={() => setViewing(null)}
        onEdit={
          canEdit
            ? () => {
                setEditing(viewing);
                setViewing(null);
              }
            : undefined
        }
      />
    </PageShell>
  );
}

/** The seven-column window a month is drawn in, as ISO dates. */
/**
 * The year as one bar, with each term a block on it.
 *
 * The GAPS are the point. A school looking at this is looking for the shape of
 * its year, and the two-week hole between First and Second Term is as much a
 * part of that shape as the terms are - so terms are positioned by date rather
 * than laid out end to end in equal thirds.
 */
function Timeline({
  start,
  end,
  today,
  terms,
}: {
  start: string;
  end: string;
  today: string;
  terms: { id: number; name: string; start_date: string; end_date: string; state: string }[];
}) {
  const span = Math.max(1, daysBetween(start, end));
  const at = (iso: string) =>
    Math.min(100, Math.max(0, (daysBetween(start, iso) / span) * 100));

  // Only when today actually falls inside the year. A school reading last
  // year's calendar in March would otherwise get a marker pinned to one end,
  // which reads as "we are at the start of this year" and is false.
  const showToday = !!today && today >= start && today <= end;

  const byDate = [...terms].sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

  // Days the year covers that no term does: the holidays between terms, plus
  // any run-up before the first and tail after the last. Derived rather than
  // stored - a gap is the absence of a term, so it has no row and cannot go
  // stale - and worth drawing, because the fortnight at Christmas is part of
  // the shape of a year and a bar that hid it would be lying about the shape.
  const gaps: { from: string; to: string }[] = [];
  if (byDate.length) {
    if (byDate[0].start_date > start) {
      gaps.push({ from: start, to: byDate[0].start_date });
    }
    byDate.slice(0, -1).forEach((term, i) => {
      const next = byDate[i + 1];
      if (next.start_date > term.end_date) {
        gaps.push({ from: term.end_date, to: next.start_date });
      }
    });
    const last = byDate[byDate.length - 1];
    if (last.end_date < end) gaps.push({ from: last.end_date, to: end });
  }

  return (
    <div className="mt-4">
      <div className="relative h-9 w-full rounded-lg bg-white-05">
        {/* The uncovered days. Hoverable, because an unexplained hole in a
            timeline reads as a rendering fault rather than as a fortnight off. */}
        {gaps.map((gap) => {
          const days = daysBetween(gap.from, gap.to);
          return (
            <Tooltip key={`${gap.from}-${gap.to}`}>
              <TooltipTrigger asChild>
                <div
                  style={{
                    left: `${at(gap.from)}%`,
                    width: `${Math.max(0.6, at(gap.to) - at(gap.from))}%`,
                  }}
                  className="absolute inset-y-0 cursor-help"
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">Not in any term</p>
                <p className="text-[11px] opacity-90">
                  {formatRange(gap.from, gap.to)} · {days}{" "}
                  {days === 1 ? "day" : "days"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {byDate.map((term) => {
          const left = at(term.start_date);
          const width = Math.max(2, at(term.end_date) - left);
          return (
            <Tooltip key={term.id}>
              <TooltipTrigger asChild>
                <div
                  style={{ left: `${left}%`, width: `${width}%` }}
                  className={cn(
                    "absolute top-1 flex h-7 items-center justify-center overflow-hidden rounded-md px-1",
                    term.state === "ongoing"
                      ? "bg-primary text-white"
                      : term.state === "completed"
                        ? "bg-white-02 text-gray-06"
                        : "border border-white-02 bg-white text-gray-06",
                  )}
                >
                  <span className="truncate text-[11px] font-medium">
                    {term.name}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">{term.name}</p>
                <p className="text-[11px] opacity-90">
                  {formatRange(term.start_date, term.end_date)}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Drawn last and taller than the blocks, so it stays visible where it
            crosses a gap - which was the complaint that made these disappear
            in the first place. */}
        {showToday && (
          <div
            style={{ left: `${at(today)}%` }}
            className="pointer-events-none absolute -top-1 h-11 w-0.5 -translate-x-1/2 rounded bg-error-text"
            aria-label="Today"
            title={`Today, ${formatDate(today)}`}
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-05">
        {byDate.map((term) => (
          <span key={term.id}>
            {term.name}: {formatRange(term.start_date, term.end_date)}
          </span>
        ))}
      </div>
    </div>
  );
}
