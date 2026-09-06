import { AlertTriangle, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CoverageCell } from "@/redux/services/staff/staff-types";

/**
 * Who covers each class-and-subject pairing, and the two ways one can be wrong.
 *
 * **A gap and a lead gap are different problems and are drawn differently.** A
 * gap is a pairing nobody teaches. A lead gap is a pairing being taught by
 * assistants with nobody owning the marks: it looks covered until you ask who
 * is responsible, which is exactly why it is the state a screen is most likely
 * to render wrongly. Amber for the second, because somebody IS in the room.
 *
 * **The cells come from the server and no cross product is built here.** The
 * server crosses each class with the subjects OFFERED at its level; crossing
 * every class with every subject would be indistinguishable at four classes and
 * three subjects and wrong at sixty.
 *
 * **A count is never coloured as though a threshold had been crossed.** No
 * contract records a maximum load and no subject records a weekly frequency, so
 * "four classes" is four classes and nothing more.
 */
export function CoverageGrid({
  cells,
  onOpen,
}: {
  cells: CoverageCell[];
  /** Opens the assign drawer for this pairing. */
  onOpen: (cell: CoverageCell) => void;
}) {
  // Grouped by class so the grid reads down a column the way a timetable does,
  // rather than as a flat list of six hundred pairings.
  const byClass = new Map<number, { name: string; cells: CoverageCell[] }>();
  for (const cell of cells) {
    const group = byClass.get(cell.class_id) ?? {
      name: cell.class_name,
      cells: [],
    };
    group.cells.push(cell);
    byClass.set(cell.class_id, group);
  }

  return (
    <div className="grid gap-5">
      {[...byClass].map(([classId, group]) => (
        <section key={classId} className="min-w-0">
          <h3 className="mb-2.5 text-sm font-semibold text-black-01">
            {group.name}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.cells.map((cell) => (
              <li key={`${cell.class_id}-${cell.subject_id}`}>
                <Cell cell={cell} onOpen={() => onOpen(cell)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Cell({
  cell,
  onOpen,
}: {
  cell: CoverageCell;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors",
        cell.gap
          ? "border-dashed border-gray-02 bg-white hover:border-primary"
          : cell.lead_gap
            ? "border-amber-300 bg-amber-50 hover:border-amber-400"
            : "border-white-02 bg-white hover:border-primary",
      )}
    >
      <p className="truncate text-sm font-medium text-black-01">
        {cell.subject_name}
      </p>

      {cell.gap ? (
        <p className="mt-1 text-xs text-gray-05">Nobody teaches this.</p>
      ) : (
        <div className="mt-1.5 grid gap-1">
          {cell.lead ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="rounded-full bg-[#DBE0EB] px-1.5 py-px text-[10px] font-medium text-[#4A659D]">
                Lead
              </span>
              <span className="truncate text-xs text-gray-01">
                {cell.lead.name}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-900">
              <AlertTriangle className="size-3 shrink-0" aria-hidden />
              No lead, so nobody owns the marks
            </span>
          )}

          {cell.assistants.length > 0 && (
            <span className="flex min-w-0 items-start gap-1.5">
              <UserRound
                className="mt-0.5 size-3 shrink-0 text-gray-05"
                aria-hidden
              />
              <span className="min-w-0 text-xs text-gray-05">
                {cell.assistants.map((person) => person.name).join(", ")}
              </span>
            </span>
          )}
        </div>
      )}
    </button>
  );
}
