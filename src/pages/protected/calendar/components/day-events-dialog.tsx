import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/redux/services/calendar/calendar-types";
import { eventVariant } from "./event-kind";
import { audienceLine } from "./audience";
import { formatDate, formatRange } from "./dates";
import { canManageRow } from "@/lib/can-manage";

/**
 * What is on one day, when there is something on it.
 *
 * Pressing an empty day goes straight to the form - there is only one thing it
 * could mean. Pressing a day that already holds something is ambiguous: it
 * might mean "show me what is on", "let me fix that one", or "add another". So
 * it opens this instead, which offers all three rather than guessing.
 *
 * The list is the day's events in full, not the two the cell had room for, and
 * each row is the whole row rather than a small link inside it - a dialog you
 * opened to act on something should not then ask you to find the target.
 */

export function DayEventsDialog({
  date,
  events,
  open,
  multiBranch,
  canCreate,
  onDelete,
  onClose,
  onPick,
  onAdd,
}: {
  /** The day, `YYYY-MM-DD`. */
  date: string;
  events: CalendarEvent[];
  open: boolean;
  multiBranch: boolean;
  canCreate: boolean;
  /** Omitted for a reader who may not delete, which removes the control. */
  onDelete?: (event: CalendarEvent) => void;
  onClose: () => void;
  onPick: (event: CalendarEvent) => void;
  onAdd: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        // Radix focuses the first focusable child when a dialog opens, and in
        // this one that is the first event's row. The row is a `group` whose
        // `focus-within` reveals the delete X, so the top entry opened with its
        // X already showing while every entry below it waited to be hovered.
        //
        // The X was doing what it was told. What was wrong is that
        // `focus-within` cannot tell "the reader reached for this row" from
        // "the browser put focus here because a dialog opened", so the answer
        // is to stop the automatic focus landing on a row rather than to weaken
        // the rule that reveals the control.
        //
        // Focus moves to the dialog itself instead of being left outside it: a
        // dialog that opens without taking focus is one a screen reader never
        // enters and Escape does not close. From here the first Tab reaches the
        // first row, which is the point at which somebody HAS reached for it.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-mont text-base">
            {formatDate(date)}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {events.length} {events.length === 1 ? "entry" : "entries"} on this
            day.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid max-h-80 gap-1.5 overflow-y-auto">
          {events.map((event) => {
            const who = audienceLine(event.audience);
            return (
              // `group` so the row's own hover reveals the X, and
              // `focus-within` so a keyboard reaches it too - a control that
              // exists only under a pointer does not exist for everybody.
              <li key={event.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onPick(event)}
                  className={cn(
                    "w-full rounded-lg border border-white-02 px-3 py-2.5 text-left transition-colors hover:border-primary/60 hover:bg-pry-01/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    // Room for the X, so a long name never runs under it.
                    onDelete && "pr-11",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={eventVariant(event.event_type)}
                      className="shrink-0 rounded-full py-0 text-[11px]"
                    >
                      {event.type_label}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-black-01">
                      {event.name}
                    </span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-05">
                    {/* The range, not this day, because a mid-term break is
                        one event and seeing only today's slice of it is how
                        somebody concludes it is a one-day thing. */}
                    <span>{formatRange(event.start_date, event.end_date)}</span>
                    {event.closes_school && (
                      <span className="text-gray-06">School closed</span>
                    )}
                    {multiBranch && event.scope_label && (
                      <span>{event.scope_label}</span>
                    )}
                    {who && <span>{who}</span>}
                  </span>
                </button>
                {onDelete && canManageRow(event) && (
                  // A sibling of the row rather than a child of it: a button
                  // inside a button is invalid, and the press has to be the
                  // X's alone or removing an event would also open it.
                  <button
                    type="button"
                    aria-label={`Delete ${event.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(event);
                    }}
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-content-center rounded-full text-gray-05 opacity-0 transition-opacity hover:bg-error-text/10 hover:text-error-text focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-text group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div
          className={cn(
            "flex items-center gap-2",
            canCreate ? "justify-between" : "justify-end",
          )}
        >
          {canCreate && (
            <Button variant="outline" onClick={onAdd}>
              <Plus className="size-4" /> Add event
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
