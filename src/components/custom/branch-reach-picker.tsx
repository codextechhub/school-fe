import { useState } from "react";
import { Check, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SchoolBranch } from "@/redux/services/branches/branches-types";

/**
 * Searchable branch set shared by role reach and staff postings.
 *
 * The parent owns the distinction between an empty selected set and an explicit
 * school-wide choice. This control only chooses the named branches, so neither
 * a blank search nor an unchecked list can silently mean every branch.
 */
export function BranchReachPicker({
  branches,
  selected,
  onChange,
  label = "Search branches",
}: {
  branches: SchoolBranch[];
  selected: number[];
  onChange: (ids: number[]) => void;
  label?: string;
}) {
  const [search, setSearch] = useState("");
  const available = branches.filter((branch) =>
    branch.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const toggle = (id: number) =>
    onChange(
      selected.includes(id)
        ? selected.filter((entry) => entry !== id)
        : [...selected, id],
    );

  return (
    <div className="min-w-0 rounded-xl border border-border bg-white p-3">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={label}
          aria-label={label}
          className="pl-9"
        />
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {available.map((branch) => {
          const checked = selected.includes(branch.id);
          return (
            <button
              type="button"
              key={branch.id}
              aria-pressed={checked}
              onClick={() => toggle(branch.id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-pry-01/50",
                checked && "bg-pry-01/60 text-primary",
              )}
            >
              <span className={cn(
                "grid size-4 shrink-0 place-items-center rounded border border-gray-02",
                checked && "border-primary bg-primary text-white",
              )}>
                {checked && <Check className="size-3" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{branch.name}</span>
            </button>
          );
        })}
        {!available.length && (
          <p className="px-3 py-4 text-sm text-gray-05">No branch matches that search.</p>
        )}
      </div>
      <p className="mt-2 border-t border-border px-1 pt-2 text-xs text-gray-05">
        {selected.length} {selected.length === 1 ? "branch" : "branches"} selected
      </p>
    </div>
  );
}
