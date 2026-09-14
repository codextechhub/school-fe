import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Search,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Which class's week, or whose week, is on screen.
 *
 * One control for both, because they ARE one control: a searchable list of
 * names, each carrying the facts somebody opens the list to compare, and a mark
 * on the ones that have a clash. Only the subtitle differs - a class reports
 * its publish state and branch, a teacher reports their load - so that arrives
 * as a function rather than as a second file that drifts.
 *
 * Not a native select. A school with twenty classes cannot see from a dropdown
 * which ones still need work, and the whole reason to open this list is to find
 * out.
 */

export interface PickerRow {
  id: number;
  name: string;
  has_clash?: boolean;
}

export function RowPicker<T extends PickerRow>({
  label,
  rows,
  current,
  subtitle,
  searchPlaceholder,
  emptyText,
  presentation = "compact",
  icon: Icon,
  onPick,
}: {
  /** "Timetable for", and what the search box is searching. */
  label: string;
  rows: T[];
  current: number | null;
  subtitle: (row: T) => string;
  searchPlaceholder: string;
  emptyText: string;
  presentation?: "compact" | "card";
  icon?: LucideIcon;
  onPick: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const row = rows.find((r) => r.id === current) ?? null;
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? rows.filter((r) => r.name.toLowerCase().includes(needle))
    : rows;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        presentation === "card" && "w-full sm:w-auto",
      )}
    >
      {presentation === "compact" && (
        <span className="text-[13px] text-gray-05">{label}</span>
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          {presentation === "card" ? (
            <button
              type="button"
              className="flex h-14 w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-white px-3.5 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-72 sm:w-auto"
            >
              {Icon && (
                <span className="grid size-9 shrink-0 place-content-center rounded-lg bg-pry-01 text-primary">
                  <Icon className="size-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-mont text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-05">
                  {label}
                </span>
                <span className="mt-0.5 block truncate font-mont text-sm font-semibold text-black-01">
                  {row?.name ?? "Pick one"}
                </span>
              </span>
              {row?.has_clash && (
                <AlertTriangle className="size-3.5 shrink-0 text-error-text" />
              )}
              <ChevronDown className="size-4 shrink-0 text-gray-05" />
            </button>
          ) : (
            <Button variant="outline" className="min-w-0 text-sm">
              <span className="min-w-0 truncate font-medium">
                {row?.name ?? "Pick one"}
              </span>
              {row?.has_clash && (
                <AlertTriangle className="size-3.5 shrink-0 text-error-text" />
              )}
              <ChevronDown className="size-4 shrink-0 text-gray-05" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="relative border-b border-white-02">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {shown.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-gray-05">{emptyText}</p>
            ) : (
              shown.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onPick(r.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-gray-04",
                    r.id === current && "bg-pry-01/50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 truncate text-sm font-medium text-black-01">
                        {r.name}
                      </span>
                      {r.has_clash && (
                        <AlertTriangle className="size-3 shrink-0 text-error-text" />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-gray-05">
                      {subtitle(r)}
                    </span>
                  </span>
                  {r.id === current && (
                    <Check className="size-4 shrink-0 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
