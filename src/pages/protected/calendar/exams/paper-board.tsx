import { AlertTriangle, Clock, DoorOpen, Plus, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ExamSlot } from "@/redux/services/calendar/calendar-types";
import { formatDate } from "../components/dates";
import { board } from "./paper-filters";

/**
 * The schedule the way a school posts it.
 *
 * A flat table is the DATA. It is not the artefact: nobody has ever pinned a
 * seven-column table of one row per paper to a notice board, because the
 * question a reader arrives with is "what is happening on Thursday morning"
 * and a table makes them assemble that answer themselves from rows scattered
 * down the page.
 *
 * So this is a row per day and a column per sitting, which is the shape every
 * printed exam timetable has. Days DOWN rather than across, because an exam
 * period is one or two weeks and there are only ever two or three sittings:
 * days across would be a dozen columns and a horizontal scroll to read
 * something that fits comfortably down a page.
 *
 * The list is still there behind a toggle, and still what prints. This answers
 * "when is what"; the list answers "show me every field of every row", and a
 * school checking an invigilator column against a staff rota wants the second.
 */

export function PaperBoard({
  slots,
  clashing,
  canCreate,
  onOpen,
  onAdd,
}: {
  slots: ExamSlot[];
  /** Ids the server named in a warning. */
  clashing: Set<number>;
  canCreate: boolean;
  onOpen: (slot: ExamSlot) => void;
  /** Start a paper already placed on the day and sitting that was pressed. */
  onAdd: (date: string, sitting: string) => void;
}) {
  const laid = board(slots);

  return (
    <div className="grid gap-2.5">
      {laid.days.map((day) => (
        <div
          key={day.date}
          className="grid gap-2.5 rounded-xl border border-white-02 bg-white p-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]"
        >
          <div className="sm:border-r sm:border-white-02 sm:pr-3">
            <p className="font-mont text-[13px] font-semibold text-black-01">
              {formatDate(day.date)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-05">
              {day.cells.reduce((n, c) => n + c.papers.length, 0)} paper
              {day.cells.reduce((n, c) => n + c.papers.length, 0) === 1 ? "" : "s"}
            </p>
          </div>

          <div
            className={cn(
              "grid gap-2.5",
              laid.sittings.length > 1 && "sm:grid-cols-2",
            )}
          >
            {day.cells.map((cell) => {
              const label =
                laid.sittings.find((s) => s.value === cell.sitting)?.label ??
                cell.sitting;
              return (
                <div key={cell.sitting} className="min-w-0">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-05">
                    {label}
                  </p>
                  {cell.papers.length === 0 ? (
                    canCreate ? (
                      <button
                        type="button"
                        onClick={() => onAdd(day.date, cell.sitting)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white-02 px-3 py-3 text-[11px] text-gray-05 transition-all hover:border-primary/40 hover:bg-pry-01/30 hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Plus className="size-3.5" />
                        Add a paper
                      </button>
                    ) : (
                      <p className="rounded-lg border border-dashed border-white-02 px-3 py-3 text-center text-[11px] text-gray-05">
                        Nothing sitting
                      </p>
                    )
                  ) : (
                    // Auto-fill rather than a fixed column count: the cell is
                    // half a row when a day runs two sittings and the whole of
                    // it when it runs one, and a card stretched across the full
                    // width of a day reads as a banner rather than a paper.
                    <ul className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]">
                      {cell.papers.map((slot) => (
                        <li key={slot.id}>
                          <button
                            type="button"
                            onClick={() => onOpen(slot)}
                            className={cn(
                              "w-full rounded-lg border px-2.5 py-2 text-left transition-all hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                              clashing.has(slot.id)
                                ? "border-error-text/35 bg-error-text/5 hover:border-error-text/60"
                                : "border-white-02 bg-white-05 hover:border-primary/40",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-black-01">
                                {slot.class_name}
                              </span>
                              {clashing.has(slot.id) && (
                                <AlertTriangle
                                  className="size-3.5 shrink-0 text-error-text"
                                  aria-label="In a clash"
                                />
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-gray-06">
                              {slot.subject_name}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-gray-05">
                              {slot.start_time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {slot.start_time.slice(0, 5)}
                                  {slot.end_time
                                    ? ` - ${slot.end_time.slice(0, 5)}`
                                    : ""}
                                </span>
                              )}
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <DoorOpen className="size-3 shrink-0" />
                                <span className="truncate">
                                  {slot.room_name ?? "No room"}
                                </span>
                              </span>
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <UserCheck className="size-3 shrink-0" />
                                <span className="truncate">
                                  {slot.invigilator?.name ?? "Nobody"}
                                </span>
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
