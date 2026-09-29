import {
  ArrowRight,
  CalendarOff,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import { CardActions, ClickableCard } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import type { CalendarEvent } from "@/redux/services/calendar/calendar-types";
import { Pager } from "@/pages/protected/students/pager";

import { audienceLine } from "../components/audience";
import { formatRange } from "../components/dates";
import { eventVariant } from "../components/event-kind";
import { RowActions } from "../components/row-actions";
import { canManageRow } from "@/lib/can-manage";
import { useSchoolWords } from "@/hooks/use-school-words";

/**
 * A date-led directory of calendar events.
 *
 * Each card opens the event document, while its own menu remains independent.
 * The same content stacks on a phone, so dates, scope, audience and closure
 * status remain readable without a horizontally scrolling table.
 */
export function EventList({
  events,
  multiBranch,
  canEdit,
  canDelete,
  page,
  totalPages,
  onOpen,
  onEdit,
  onDelete,
  onPageChange,
}: {
  events: CalendarEvent[];
  multiBranch: boolean;
  canEdit: boolean;
  canDelete: boolean;
  page: number;
  totalPages: number;
  onOpen: (event: CalendarEvent) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onPageChange: (page: number) => void;
}) {
  const words = useSchoolWords();
  return (
    <>
      <ul className="grid min-w-0 gap-2.5">
        {events.map((event) => (
          <li key={event.id}>
            <ClickableCard
              label={`View ${event.name}`}
              onOpen={() => onOpen(event)}
              className="group overflow-hidden px-4 py-4 sm:px-5"
            >
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <DateTile date={event.start_date} />

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 text-sm font-semibold text-black-01 sm:text-[15px]">
                      {event.name}
                    </h3>
                    <Badge
                      variant={eventVariant(event.event_type)}
                      className="rounded-full py-0 text-[10px]"
                    >
                      {event.type_label}
                    </Badge>
                    {event.closes_school && (
                      <Badge variant="red" className="rounded-full py-0 text-[10px]">
                        <CalendarOff className="size-3" /> School closed
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 grid min-w-0 gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <EventFact
                      label="Event dates"
                      value={formatRange(event.start_date, event.end_date)}
                    />
                    <EventFact
                      label={`School ${words.term}`}
                      value={event.term?.name ?? `Outside every ${words.term}`}
                      muted={!event.term}
                    />
                    {multiBranch && (
                      <EventFact
                        label="Applies to"
                        value={eventScope(event)}
                      />
                    )}
                    <EventFact
                      label="Who it covers"
                      value={audienceLine(event.audience) || "Everybody"}
                    />
                  </div>

                  {event.description && (
                    <p className="mt-3 line-clamp-2 max-w-3xl text-xs leading-5 text-gray-05">
                      {event.description}
                    </p>
                  )}
                </div>

                <CardActions className="flex shrink-0 items-center gap-1">
                  <RowActions
                    label={`Actions for ${event.name}`}
                    actions={[
                      {
                        label: "View details",
                        icon: Eye,
                        onSelect: () => onOpen(event),
                      },
                      canEdit && canManageRow(event) && {
                        label: "Edit",
                        icon: Pencil,
                        onSelect: () => onEdit(event),
                      },
                      canDelete && canManageRow(event) && {
                        label: "Delete",
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => onDelete(event),
                      },
                    ]}
                  />
                  <ArrowRight className="hidden size-4 text-gray-02 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
                </CardActions>
              </div>
            </ClickableCard>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Pager page={page} totalPages={totalPages} onGo={onPageChange} />
      </div>
    </>
  );
}

function DateTile({ date }: { date: string }) {
  const parsed = new Date(`${date}T00:00:00`);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" })
    .format(parsed)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(parsed);

  return (
    <span className="grid w-12 shrink-0 place-content-center rounded-lg bg-pry-01 px-1 py-2 text-center sm:w-14">
      <span className="text-[10px] font-semibold tracking-wide text-primary">{month}</span>
      <span className="text-xl font-semibold leading-none text-black-01">{day}</span>
    </span>
  );
}

function EventFact({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold text-gray-06">
        {label}
      </span>
      <span
        className={
          muted
            ? "mt-1 block text-[13px] font-medium text-yellow-01-text"
            : "mt-1 block text-[13px] text-gray-05"
        }
      >
        {value}
      </span>
    </span>
  );
}

function eventScope(event: CalendarEvent) {
  return event.scope_label ?? (event.branch ? event.branch_name : "School-wide") ?? "School-wide";
}
