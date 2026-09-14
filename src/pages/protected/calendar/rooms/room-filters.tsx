import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ROOM_KINDS } from "../components/room-kind";
import { BLANK_ROOM_FACETS, type RoomFacets } from "./room-facets";

// Type and status, in a panel, with the chosen ones coming back out as chips.
//
// **No branch facet here, unlike the events screen.** A room's branch is the
// lens's job: the pill in the sidebar already narrows every screen in the
// module, and a second branch control on this one page would be two answers to
// one question - and the one nobody would think to clear.

// "All types" plus the shared list. A native <option> cannot carry an icon, so
// this is the one place the type stays words-only.
const ROOM_TYPE_OPTIONS: { value: RoomFacets["type"]; label: string }[] = [
  { value: "all", label: "All types" },
  ...ROOM_KINDS.map((k) => ({ value: k.value as RoomFacets["type"], label: k.label })),
];

export function RoomFilters({
  facets,
  onChange,
}: {
  facets: RoomFacets;
  onChange: (next: RoomFacets) => void;
}) {
  const [open, setOpen] = useState(false);

  const active =
    (facets.type !== "all" ? 1 : 0) + (facets.active !== "all" ? 1 : 0);

  const chips: { label: string; clear: () => void }[] = [];
  if (facets.type !== "all") {
    chips.push({
      label:
        ROOM_TYPE_OPTIONS.find((o) => o.value === facets.type)?.label ??
        facets.type,
      clear: () => onChange({ ...facets, type: "all" }),
    });
  }
  if (facets.active !== "all") {
    chips.push({
      label: facets.active === "true" ? "Active" : "Inactive",
      clear: () => onChange({ ...facets, active: "all" }),
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
          <div className="mb-3">
            <p className="mb-1.5 text-[13px] font-medium text-gray-06">
              Room type
            </p>
            <select
              value={facets.type}
              onChange={(e) =>
                onChange({ ...facets, type: e.target.value as RoomFacets["type"] })
              }
              aria-label="Room type"
              className="h-9 w-full rounded-lg border border-white-02 bg-white px-2.5 text-sm outline-none focus:border-primary"
            >
              {ROOM_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-gray-06">Status</p>
            <select
              value={facets.active}
              onChange={(e) =>
                onChange({
                  ...facets,
                  active: e.target.value as RoomFacets["active"],
                })
              }
              aria-label="Status"
              className="h-9 w-full rounded-lg border border-white-02 bg-white px-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="all">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                onChange({ ...BLANK_ROOM_FACETS, search: facets.search })
              }
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
              className="inline-flex items-center gap-1 rounded-full border border-white-02 bg-white px-2.5 py-1 text-xs text-gray-06 hover:bg-gray-04"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
