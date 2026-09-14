import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ClashWarning,
  GridCell,
  GridDay,
} from "@/redux/services/calendar/calendar-types";
import { clashedSlotIds, toRows } from "./grid-shape";

/**
 * The weekly grid, drawn once and read by both the class screen and the
 * teacher screen.
 *
 * One component because it IS one document: the same periods down the side, the
 * same five days across, the same four cell states. What differs is the second
 * line of a filled cell - a class's grid names the teacher, a teacher's grid
 * names the class - and whether a cell can be pressed. Two copies of this would
 * drift the day one of them learned about a new period type.
 *
 * **A clash is a property of a PAIR, so it is matched by slot id.** The server
 * sends warnings carrying the ids of both slots involved, and never a flag on a
 * row - a flag would be a cache of a relationship, with nothing to invalidate
 * it when the other half moves. So a cell is in clash when its own slot id
 * appears in a warning, which means both cells go red and neither has to know
 * about the other.
 *
 * **Rows are the periods in force, which is not every period on file.** A day
 * running its own schedule shows only that schedule, and a period that does not
 * run on a given day leaves a struck-through gap rather than an empty cell that
 * invites a click.
 */

export function TimetableGrid({
  days,
  warnings,
  /** "class" names the teacher on a filled cell; "teacher" names the class. */
  variant,
  onCellClick,
  emptyLabel = "Free",
}: {
  days: GridDay[];
  warnings?: ClashWarning[];
  variant: "class" | "teacher";
  /** Absent makes the whole grid read-only, which is the teacher's week. */
  onCellClick?: (cell: GridCell, dayIndex: number) => void;
  emptyLabel?: string;
}) {
  const rows = toRows(days);
  const clashed = clashedSlotIds(warnings);

  if (!rows.length) return null;

  return (
    // Scrolls inside its own box. Six columns of readable width do not fit a
    // phone, and a page that scrolls sideways is a bug.
    <ScrollArea orientation="horizontal">
      <table className="w-full min-w-[56rem] border-collapse text-left">
        <thead>
          <tr className="bg-white-05">
            <th className="w-32 border-b border-r border-border px-3 py-3 font-mont text-xs font-semibold text-gray-06">
              Period
            </th>
            {days.map((day) => (
              <th
                key={day.day_of_week}
                className="border-b border-border px-3 py-3 font-mont text-xs font-semibold text-gray-06"
              >
                {day.day_label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period}>
              <td
                className={cn(
                  "border-b border-r border-border px-3 py-2.5 align-top last:border-b-0",
                  row.kind !== "LESSON" && "bg-white-05",
                )}
              >
                <p
                  className={cn(
                    "text-xs font-medium",
                    row.kind === "LESSON" ? "text-black-01" : "text-gray-05",
                  )}
                >
                  {row.label}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[11px] text-gray-05">
                  {row.time}
                </p>
              </td>
              {row.cells.map((cell, dayIndex) => (
                <td
                  key={dayIndex}
                  className="border-b border-r border-border p-0 align-top last:border-r-0"
                >
                  <Cell
                    cell={cell}
                    variant={variant}
                    clashed={clashed}
                    emptyLabel={emptyLabel}
                    onClick={
                      onCellClick &&
                      cell &&
                      (variant === "class" || cell.slot)
                        ? () => onCellClick(cell, dayIndex)
                        : undefined
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

function Cell({
  cell,
  variant,
  clashed,
  emptyLabel,
  onClick,
}: {
  cell: GridCell | null;
  variant: "class" | "teacher";
  clashed: Set<number>;
  emptyLabel: string;
  onClick?: () => void;
}) {
  // The period does not run on this day at all. Not an empty slot: pressing it
  // would offer to schedule a lesson into a period that is not there.
  if (!cell) {
    return (
      <div className="grid min-h-[68px] place-content-center bg-white-05/60">
        <span className="text-[11px] text-gray-05">-</span>
      </div>
    );
  }

  if (cell.kind !== "LESSON") {
    return (
      <div className="grid min-h-[68px] place-content-center bg-white-05">
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-05">
          {cell.label ?? cell.kind}
        </span>
      </div>
    );
  }

  const slot = cell.slot;
  if (!slot) {
    const body = (
      // "Add" is an instruction, not content: on paper there is nothing to
      // press, and a grid of the word repeated forty times reads as data.
      <span className="print-blank inline-flex items-center gap-1 text-[11px] font-medium text-gray-05/70">
        {onClick && <Plus className="print-hide size-3.5" />}
        {emptyLabel}
      </span>
    );
    return onClick ? (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Fill ${cell.period_label}`}
        className="grid min-h-[68px] w-full place-content-center transition-colors hover:bg-pry-01/40 hover:text-primary active:bg-pry-01/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        {body}
      </button>
    ) : (
      <div className="grid min-h-[68px] place-content-center">{body}</div>
    );
  }

  const inClash = clashed.has(slot.id);
  const second = variant === "class" ? slot.teacher?.name : slot.class_name;

  const body = (
    <span className="flex min-w-0 flex-col gap-0.5 px-2.5 py-2 text-left">
      <span
        className={cn(
          "truncate text-xs font-medium",
          inClash ? "text-error-text" : "text-black-01",
        )}
      >
        {slot.subject_name}
      </span>
      {/* A class's grid with no teacher yet is a real, saveable state: a school
          fills the subjects before it fills the people. */}
      <span className="truncate text-[11px] text-gray-06">
        {second ?? "No teacher yet"}
      </span>
      {slot.room_name && (
        <span className="truncate text-[11px] text-gray-05">
          {slot.room_name}
        </span>
      )}
      {slot.branch_name && (
        <span className="truncate text-[11px] text-gray-05">
          {slot.branch_name}
        </span>
      )}
    </span>
  );

  const shell = cn(
    "block min-h-[68px] w-full",
    inClash && "bg-error-text/5",
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        variant === "teacher"
          ? `Open ${slot.class_name} timetable for ${slot.subject_name}, ${cell.period_label}`
          : `${slot.subject_name}, ${cell.period_label}`
      }
      className={cn(
        shell,
        "transition-colors hover:bg-pry-01/40 active:bg-pry-01/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
      )}
    >
      {body}
    </button>
  ) : (
    <div className={shell}>{body}</div>
  );
}
