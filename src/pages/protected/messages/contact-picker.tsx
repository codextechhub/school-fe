import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useGetStaffContactsQuery } from "@/redux/services/messages/messages-api";
import type { StaffContact } from "@/redux/services/messages/messages-types";

const PAGE_SIZE = 50;

/**
 * Choose colleagues from the staff the signed-in person may message.
 *
 * The list is the server's contact list, searched and paged there: it already
 * leaves out anybody outside the reader's branch reach, so nothing here
 * narrows it further except an optional branch. `single` picks one person and
 * `multi` collects many, with **Select all shown** for the page on screen.
 * Chosen people stay in the chips above the list while the search moves on, so
 * a selection survives a new search.
 *
 * Names and roles are the People in the conversation field. The picker is only
 * used where a conversation is being started or its members changed, so it is
 * offered where that field may be written.
 */
export function ContactPicker({
  value,
  onChange,
  mode,
  exclude = [],
  branch = null,
  selectAll = false,
  max,
  disabled = false,
}: {
  value: StaffContact[];
  onChange: (next: StaffContact[]) => void;
  mode: "single" | "multi";
  /** People already in the conversation, who cannot be chosen again. */
  exclude?: number[];
  /** Narrow the list to one branch's staff. */
  branch?: number | null;
  selectAll?: boolean;
  max?: number;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const settled = useDebounce(search, 300);
  const query = useGetStaffContactsQuery({ search: settled, branch, page, pageSize: PAGE_SIZE });

  const rows = (query.data?.data ?? []).filter((contact) => !exclude.includes(contact.user_id));
  const pagination = query.data?.pagination;
  const chosen = new Set(value.map((contact) => contact.user_id));
  const atMax = max != null && value.length >= max;

  const toggle = (contact: StaffContact) => {
    if (disabled) return;
    if (mode === "single") {
      onChange(chosen.has(contact.user_id) ? [] : [contact]);
      return;
    }
    if (chosen.has(contact.user_id)) {
      onChange(value.filter((entry) => entry.user_id !== contact.user_id));
    } else if (!atMax) {
      onChange([...value, contact]);
    }
  };

  const allShownChosen = rows.length > 0 && rows.every((contact) => chosen.has(contact.user_id));
  const selectShown = () => {
    if (allShownChosen) {
      const shown = new Set(rows.map((contact) => contact.user_id));
      onChange(value.filter((entry) => !shown.has(entry.user_id)));
      return;
    }
    const additions = rows.filter((contact) => !chosen.has(contact.user_id));
    const room = max != null ? Math.max(0, max - value.length) : additions.length;
    onChange([...value, ...additions.slice(0, room)]);
  };

  return (
    <div className="grid min-w-0 gap-2.5">
      {value.length > 0 ? (
        <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Chosen">
          {value.map((contact) => (
            <li
              key={contact.user_id}
              className="flex min-w-0 max-w-full items-center gap-1 rounded-full bg-pry-01 py-0.5 pl-2.5 pr-1 text-xs text-primary"
            >
              <span className="min-w-0 break-words">{contact.name}</span>
              <button
                type="button"
                aria-label={`Remove ${contact.name ?? "this person"}`}
                disabled={disabled}
                onClick={() => toggle(contact)}
                className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-primary/10"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
        <input
          value={search}
          disabled={disabled}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search colleagues"
          aria-label="Search colleagues"
          className="h-9 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {selectAll && mode === "multi" && rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-06">
          <span>
            {value.length} chosen{max != null ? ` of ${max} at most` : ""}
          </span>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={selectShown}>
            {allShownChosen ? "Clear shown" : "Select all shown"}
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border border-border">
        {query.isLoading || query.isFetching ? (
          <div className="grid gap-2 p-2.5" aria-label="Loading colleagues">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-9 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="grid justify-items-start gap-2 p-3">
            <p className="text-xs text-gray-06">We could not load your colleagues.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="p-3 text-xs text-gray-06">
            {settled ? "Nobody matches that search." : "There is nobody to choose here."}
          </p>
        ) : (
          <ScrollArea className="max-h-56">
            <ul className="divide-y divide-border">
              {rows.map((contact) => {
                const on = chosen.has(contact.user_id);
                return (
                  <li key={contact.user_id}>
                    <button
                      type="button"
                      role={mode === "single" ? "radio" : "checkbox"}
                      aria-checked={on}
                      disabled={disabled || (!on && atMax && mode === "multi")}
                      onClick={() => toggle(contact)}
                      className={cn(
                        "flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-50",
                        on && "bg-[#EEF3FF]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center border",
                          mode === "single" ? "rounded-full" : "rounded",
                          on ? "border-primary bg-primary text-white" : "border-gray-04",
                        )}
                      >
                        {on ? <Check className="size-3" aria-hidden="true" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm text-black-01">
                          {contact.name}
                        </span>
                        {contact.label || contact.branch?.name ? (
                          <span className="block break-words text-xs text-gray-06">
                            {[contact.label, contact.branch?.name].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-06">
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft aria-hidden="true" /> Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
