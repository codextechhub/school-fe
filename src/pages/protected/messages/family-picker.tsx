import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useGetFamilyContactsQuery } from "@/redux/services/messages/messages-api";
import type { FamilyContact } from "@/redux/services/messages/messages-types";

/** Who a family conversation is with: the pupil, or one of the pupil's guardians. */
export type FamilyChoice =
  | { student: PupilRef; pupil: true }
  | { student: PupilRef; pupil: false; guardian: { id: number; name?: string } };

type PupilRef = { id: number; name?: string; class_name?: string };

/** The pupil a contact row names, whichever way Field Access let the server send it. */
const pupilOf = (row: FamilyContact): PupilRef =>
  row.student ?? { id: row.id ?? 0 };

const PAGE_SIZE = 25;

/**
 * Choose a pupil, then the pupil or one of their guardians.
 *
 * The list is the pupils the signed-in person may reach about, as the server
 * works it out. A guardian with no parent app account is shown, disabled, with
 * the reason, so the school office sees the family is known and can only see
 * why nobody can be messaged yet.
 */
export function FamilyPicker({
  value,
  onChange,
}: {
  value: FamilyChoice | null;
  onChange: (next: FamilyChoice | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const settled = useDebounce(search, 300);
  const query = useGetFamilyContactsQuery({ search: settled, page, pageSize: PAGE_SIZE });
  const rows = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className="grid min-w-0 gap-2.5">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search pupils"
          aria-label="Search pupils"
          className="h-9 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="rounded-lg border border-border">
        {query.isLoading || query.isFetching ? (
          <div className="grid gap-2 p-2.5" aria-label="Loading pupils">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="grid justify-items-start gap-2 p-3">
            <p className="text-xs text-gray-06">We could not load the pupils you can reach.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="p-3 text-xs text-gray-06">
            {settled ? "No pupil matches that search." : "There are no pupils you can reach."}
          </p>
        ) : (
          <ScrollArea className="max-h-72">
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const pupil = pupilOf(row);
                return (
                  <li key={pupil.id} className="grid min-w-0 gap-1.5 px-3 py-2.5">
                    <p className="break-words text-sm font-medium text-black-01">
                      {pupil.name}
                      {pupil.class_name ? (
                        <span className="font-normal text-gray-06"> · {pupil.class_name}</span>
                      ) : null}
                    </p>
                    <div
                      className="grid min-w-0 gap-1"
                      role="radiogroup"
                      aria-label={`Who to message about ${pupil.name ?? "this pupil"}`}
                    >
                      <Option
                        label="The pupil"
                        disabledReason={row.pupil_has_account ? "" : "No pupil app account"}
                        selected={value?.student.id === pupil.id && value.pupil}
                        onSelect={() => onChange({ student: pupil, pupil: true })}
                      />
                      {(row.guardians ?? []).map((guardian) => (
                        <Option
                          key={guardian.id}
                          label={[guardian.name, guardian.relationship].filter(Boolean).join(", ")}
                          disabledReason={guardian.has_account ? "" : "No parent app account"}
                          selected={
                            value?.student.id === pupil.id &&
                            !value.pupil &&
                            value.guardian.id === guardian.id
                          }
                          onSelect={() =>
                            onChange({
                              student: pupil,
                              pupil: false,
                              guardian: { id: guardian.id, name: guardian.name },
                            })
                          }
                        />
                      ))}
                    </div>
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
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Option({
  label,
  selected,
  disabledReason,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabledReason: string;
  onSelect: () => void;
}) {
  const disabled = Boolean(disabledReason);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "border-primary bg-[#EEF3FF]" : "border-border hover:bg-pry-01/25",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border",
          selected ? "border-primary" : "border-gray-04",
        )}
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1 break-words text-black-01">{label}</span>
      {disabled ? <span className="shrink-0 text-xs text-gray-06">{disabledReason}</span> : null}
    </button>
  );
}
