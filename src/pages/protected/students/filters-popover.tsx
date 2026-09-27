import { Check, SlidersHorizontal } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { StudentStatus } from "@/redux/services/students/students-types";

export interface DirectoryFilters {
  classId: string;
  level: string;
  status: StudentStatus | "all";
  unassignedOnly: boolean;
}

/**
 * Class, level, status and the unassigned flag, behind one button.
 *
 * **A panel rather than four controls on the toolbar**, which is what the
 * design draws and what the screen needs: three selects and a checkbox sitting
 * permanently across the top push the search box out of reach on a laptop and
 * shout four questions at a reader who mostly wants none of them. Folded away,
 * the toolbar is a search box and a button, and the button carries a count of
 * how many filters are on - so nothing is hidden, only quiet.
 *
 * The count is the whole reason this is safe to collapse. Without it a reader
 * lands on a filtered directory with no way to tell, and reads a partial roll
 * as the whole school.
 */
export function FiltersPopover({
  open,
  onOpenChange,
  value,
  onChange,
  onClear,
  classes,
  levels,
  statuses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DirectoryFilters;
  onChange: (next: Partial<DirectoryFilters>) => void;
  onClear: () => void;
  classes: { id: number; name: string }[];
  levels: { id: number; name: string }[];
  statuses: { status: StudentStatus; label: string }[];
}) {
  const facets =
    (value.classId !== "all" ? 1 : 0) +
    (value.level !== "all" ? 1 : 0) +
    (value.status !== "all" ? 1 : 0) +
    (value.unassignedOnly ? 1 : 0);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-guide="students-directory.filters"
          className={cn(
            "inline-flex h-10.5 items-center gap-2 rounded-lg border px-3.5 text-[13.5px] font-medium",
            facets > 0 || open
              ? "border-primary bg-white-03 text-primary"
              : "border-white-02 bg-white text-gray-01 hover:bg-gray-03",
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {facets > 0 && (
            <span className="grid size-4.5 place-content-center rounded-full bg-primary text-[11px] font-semibold text-white">
              {facets}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-77 p-4.5">
        <div className="flex flex-col gap-4">
          <Facet label="Class">
            <NativeSelect
              aria-label="Class"
              value={value.classId}
              onChange={(e) => onChange({ classId: e.target.value })}
              className="h-10.5"
            >
              <option value="all">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Facet>

          <Facet label="Level">
            <NativeSelect
              aria-label="Level"
              value={value.level}
              onChange={(e) => onChange({ level: e.target.value })}
              className="h-10.5"
            >
              <option value="all">All levels</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </Facet>

          <Facet label="Status">
            <NativeSelect
              aria-label="Status"
              value={value.status}
              onChange={(e) =>
                onChange({ status: e.target.value as StudentStatus | "all" })
              }
              className="h-10.5"
            >
              <option value="all">All statuses</option>
              {statuses.map((s) => (
                <option key={s.status} value={s.status}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </Facet>

          <div className="border-t border-white-02 pt-3.5">
            <button
              type="button"
              onClick={() => onChange({ unassignedOnly: !value.unassignedOnly })}
              className="flex items-center gap-2.5 text-left"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-4.75 shrink-0 place-content-center rounded-[5px] border-[1.5px] text-white",
                  value.unassignedOnly
                    ? "border-primary bg-primary"
                    : "border-gray-02 bg-white",
                )}
              >
                {value.unassignedOnly && <Check className="size-3" />}
              </span>
              <span className="text-[13.5px] text-black-01">
                Unassigned class only
              </span>
            </button>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-white-02 pt-3.5">
            <button
              type="button"
              onClick={onClear}
              className="h-9 rounded-lg border border-white-02 px-3.5 text-[13.5px] font-medium text-gray-01 hover:bg-gray-03"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-lg bg-primary px-4 text-[13.5px] font-medium text-white hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Facet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-05">
        {label}
      </span>
      {children}
    </div>
  );
}
