import { Filter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "../components/dates";
import {
  activeFilterCount,
  isFiltered,
  NO_FILTERS,
  type FilterOption,
  type PaperFilters,
} from "./paper-filters";

/**
 * Narrowing the schedule.
 *
 * **Every option is drawn from the papers, with the count it would keep.** A
 * school of forty classes may have entered papers for six; offering the other
 * thirty-four is offering filters that return nothing, and the count beside
 * each one is what stops a reader ticking a box to find out.
 *
 * The chips outside the popover are the point of it. A filter that is only
 * visible inside the thing you opened to set it is a filter a reader forgets
 * they applied, and then reports the schedule as missing papers.
 */

function Group({
  title,
  options,
  chosen,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  chosen: (number | string)[];
  onToggle: (value: number | string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-05">
        {title}
      </p>
      <ul className="grid max-h-40 gap-0.5 overflow-y-auto pr-1">
        {options.map((option) => (
          <li key={String(option.value)}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-gray-04">
              <Checkbox
                checked={chosen.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-gray-06">
                {option.label}
              </span>
              <span className="shrink-0 text-[11px] text-gray-05 tabular-nums">
                {option.count}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PaperFilterBar({
  filters,
  options,
  clashingPaperCount,
  showing,
  total,
  onChange,
}: {
  filters: PaperFilters;
  options: {
    classes: FilterOption[];
    subjects: FilterOption[];
    rooms: FilterOption[];
    invigilators: FilterOption[];
    sittings: FilterOption[];
  };
  clashingPaperCount: number;
  showing: number;
  total: number;
  onChange: (next: PaperFilters) => void;
}) {
  const count = activeFilterCount(filters);

  const toggle = <K extends keyof PaperFilters>(key: K, value: number | string) => {
    const list = filters[key] as (number | string)[];
    onChange({
      ...filters,
      [key]: list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value],
    } as PaperFilters);
  };

  // What is currently narrowing, spelled out. Kept flat rather than grouped:
  // a reader clearing filters wants to remove one thing, not find which group
  // it was in.
  const chips: { key: string; label: string; clear: () => void }[] = [];
  const pushAll = (
    key: keyof PaperFilters,
    list: FilterOption[],
    chosen: (number | string)[],
  ) => {
    for (const value of chosen) {
      const option = list.find((o) => o.value === value);
      chips.push({
        key: `${String(key)}-${value}`,
        label: option?.label ?? String(value),
        clear: () => toggle(key, value),
      });
    }
  };
  pushAll("classes", options.classes, filters.classes);
  pushAll("subjects", options.subjects, filters.subjects);
  pushAll("rooms", options.rooms, filters.rooms);
  pushAll("invigilators", options.invigilators, filters.invigilators);
  pushAll("sittings", options.sittings, filters.sittings);
  for (const date of filters.dates) {
    chips.push({
      key: `date-${date}`,
      label: formatDate(date),
      clear: () => toggle("dates", date),
    });
  }
  if (filters.clashesOnly) {
    chips.push({
      key: "clashes",
      label: "Clashes only",
      clear: () => onChange({ ...filters, clashesOnly: false }),
    });
  }

  return (
    <div className="print-hide grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <Filter className="size-3.5" />
              Filter
              {count > 0 && (
                <Badge
                  variant="pending"
                  className="ml-1 rounded-full px-1.5 py-0 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          {/* Capped and scrolling. Five groups of options is taller than a
              laptop screen the moment a school has entered a fortnight of
              papers - the last group ran off the bottom with no way to reach
              it. Each group keeps its own inner cap so one long list of
              classes cannot push the others out of sight either. */}
          <PopoverContent
            align="start"
            className="max-h-[min(70vh,32rem)] w-72 overflow-y-auto p-3"
          >
            <div className="grid gap-3">
              <Group
                title="Class"
                options={options.classes}
                chosen={filters.classes}
                onToggle={(v) => toggle("classes", v)}
              />
              <Group
                title="Subject"
                options={options.subjects}
                chosen={filters.subjects}
                onToggle={(v) => toggle("subjects", v)}
              />
              <Group
                title="Room"
                options={options.rooms}
                chosen={filters.rooms}
                onToggle={(v) => toggle("rooms", v)}
              />
              <Group
                title="Invigilator"
                options={options.invigilators}
                chosen={filters.invigilators}
                onToggle={(v) => toggle("invigilators", v)}
              />
              <Group
                title="Sitting"
                options={options.sittings}
                chosen={filters.sittings}
                onToggle={(v) => toggle("sittings", v)}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Its own control, not a checkbox buried in the popover. Chasing the
            clashes before publishing is the single most common reason to
            narrow this screen at all. */}
        {clashingPaperCount > 0 && (
          <Button
            variant={filters.clashesOnly ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() =>
              onChange({ ...filters, clashesOnly: !filters.clashesOnly })
            }
          >
            Clashing papers
            <Badge
              variant={filters.clashesOnly ? "active" : "rejected"}
              className="ml-1 rounded-full px-1.5 py-0 text-[10px]"
            >
              {clashingPaperCount}
            </Badge>
          </Button>
        )}

        <p
          className={cn(
            "text-xs text-gray-05",
            isFiltered(filters) && "font-medium text-gray-06",
          )}
        >
          {isFiltered(filters)
            ? `Showing ${showing} of ${total} papers`
            : `${total} paper${total === 1 ? "" : "s"}`}
        </p>

        {isFiltered(filters) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onChange(NO_FILTERS)}
          >
            Clear all
          </Button>
        )}
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.clear}
                aria-label={`Remove filter ${chip.label}`}
                className="inline-flex items-center gap-1 rounded-full border border-white-02 bg-white px-2 py-0.5 text-[11px] text-gray-06 transition-colors hover:border-error-text/40 hover:text-error-text"
              >
                {chip.label}
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
