import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { cn } from "@/lib/utils";
import type { TimelineTerm } from "@/redux/services/calendar/calendar-types";
import { EVENT_KINDS } from "../components/event-kind";
import { BLANK_FACETS, type EventFacets } from "./event-facets";
import { useSchoolWords } from "@/hooks/use-school-words";

/**
 * The three facets that do not fit on the toolbar: type, term and scope.
 *
 * A panel rather than three more dropdowns in the row, because the row already
 * carries a search box and an Add button, and on a phone four controls side by
 * side is four controls nobody can hit. The panel also lets the CHOSEN facets
 * come back out as chips, which is the part that matters: a reader who filtered
 * to Holidays in First Term three minutes ago has to be able to see why the
 * list is short.
 *
 * Scope is absent at a single-branch school, like every other branch control.
 */

export function EventFilters({
  facets,
  terms,
  showScope,
  onChange,
}: {
  facets: EventFacets;
  terms: TimelineTerm[];
  showScope: boolean;
  onChange: (next: EventFacets) => void;
}) {
  const { branches } = useBranchLens();
  const words = useSchoolWords();
  const [open, setOpen] = useState(false);

  // Search is on the toolbar and has its own visible box, so it is not counted
  // here: a badge saying "1 filter" over an obviously-filled search box is
  // telling the reader something they can already see.
  const active =
    (facets.type !== "all" ? 1 : 0) +
    (facets.term !== "all" ? 1 : 0) +
    (facets.scope !== "all" ? 1 : 0);

  const chips: { label: string; clear: () => void }[] = [];
  if (facets.type !== "all") {
    chips.push({
      label:
        EVENT_KINDS.find((k) => k.value === facets.type)?.label ?? facets.type,
      clear: () => onChange({ ...facets, type: "all" }),
    });
  }
  if (facets.term !== "all") {
    chips.push({
      label: terms.find((t) => t.id === facets.term)?.name ?? words.Term,
      clear: () => onChange({ ...facets, term: "all" }),
    });
  }
  if (facets.scope !== "all") {
    chips.push({
      label:
        facets.scope === "school"
          ? "School-wide"
          : branches.find((b) => b.id === facets.scope)?.name ?? "One branch",
      clear: () => onChange({ ...facets, scope: "all" }),
    });
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 shrink-0 rounded-lg text-sm">
            <SlidersHorizontal /> Filters
            {active > 0 && (
              <span className="ml-1 grid size-4.5 place-content-center rounded-full bg-primary text-[10px] font-medium text-white">
                {active}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-4">
          <Facet label="Event type">
            <select
              value={facets.type}
              onChange={(e) =>
                onChange({ ...facets, type: e.target.value as EventFacets["type"] })
              }
              aria-label="Event type"
              className="h-9 w-full rounded-lg border border-white-02 bg-white px-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="all">All types</option>
              {EVENT_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </Facet>

          <Facet label={words.Term}>
            <select
              value={String(facets.term)}
              onChange={(e) =>
                onChange({
                  ...facets,
                  term: e.target.value === "all" ? "all" : Number(e.target.value),
                })
              }
              aria-label={words.Term}
              className="h-9 w-full rounded-lg border border-white-02 bg-white px-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="all">Every {words.term}</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </Facet>

          {showScope && (
            <Facet label="Scope">
              <select
                value={String(facets.scope)}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    ...facets,
                    scope:
                      raw === "all" || raw === "school"
                        ? (raw as "all" | "school")
                        : Number(raw),
                  });
                }}
                aria-label="Scope"
                className="h-9 w-full rounded-lg border border-white-02 bg-white px-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="all">Everywhere</option>
                {/* Not a branch id. The server reads it as "shared rows only". */}
                <option value="school">School-wide only</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Facet>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange({ ...facets, ...BLANK_FACETS, search: facets.search })}
              className="text-xs font-medium text-primary hover:underline"
            >
              Clear all
            </button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {chips.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.clear}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-white-02",
                "bg-white px-2.5 py-1 text-xs text-gray-06 hover:bg-gray-04",
              )}
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...BLANK_FACETS, search: facets.search })}
            className="ml-1 text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </>
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
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[13px] font-medium text-gray-06">{label}</p>
      {children}
    </div>
  );
}
