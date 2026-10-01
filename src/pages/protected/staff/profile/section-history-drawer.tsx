import { useState } from "react";
import { ArrowRight, ChevronDown, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useGetStaffSectionHistoryQuery } from "@/redux/services/staff/staff-api";
import type { StaffHistorySection, StaffSectionHistoryEntry } from "@/redux/services/staff/staff-types";
import { formatDateTime } from "../../students/format";

const LABELS: Record<StaffHistorySection, string> = {
  overview: "Profile details",
  teaching: "Teaching",
  access: "Access",
  qualifications: "Qualifications",
  documents: "Documents",
  leave: "Leave",
};

/**
 * One section's dated changes. The API admits the reader for that section and
 * sends only display fields, so this drawer never handles stored snapshots or
 * administrator notes. Earlier pages remain reachable from the footer.
 */
export function SectionHistoryDrawer({
  staffId, personName, section, branch, asAt, onClose,
}: {
  staffId: number;
  personName: string;
  section: StaffHistorySection;
  branch?: number | null;
  asAt?: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const { prefs } = useSchoolDisplay(branch);
  const history = useGetStaffSectionHistoryQuery({ id: staffId, section, page, asAt });
  const data = history.currentData?.data;
  const entries = Array.isArray(data?.entries) ? data.entries : null;
  const candidate = data?.next_page;
  const nextPage = typeof candidate === "number" && Number.isInteger(candidate) && candidate > page
    ? candidate : null;
  const unavailable = history.isError || (history.isSuccess && entries === null);

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="font-mont text-base">{LABELS[section]} history</SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">
            Changes in {personName}&apos;s {LABELS[section].toLowerCase()}, newest first.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-4 py-5 sm:px-6">
          {history.isFetching && entries === null ? (
            <p className="py-10 text-center text-sm text-gray-05">Loading history…</p>
          ) : unavailable ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>We could not load this history.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => history.refetch()}>
                Try again
              </Button>
            </div>
          ) : !entries?.length ? (
            <div className="rounded-xl border border-dashed border-white-02 px-5 py-10 text-center">
              <Clock3 className="mx-auto size-5 text-gray-05" aria-hidden />
              <p className="mt-2 text-sm text-gray-05">No changes recorded for this section.</p>
            </div>
          ) : (
            <ol className="ml-2 border-l border-white-02 pl-5">
              {entries.map((entry) => (
                <HistoryCard key={entry.id} entry={entry} time={formatDateTime(entry.at, prefs)} />
              ))}
            </ol>
          )}
        </ScrollArea>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <span className="text-xs text-gray-05">Page {page}</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={page === 1 || history.isFetching} onClick={() => setPage(page - 1)}>
              Newer
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={nextPage === null || history.isFetching}
              onClick={() => {
                if (nextPage !== null) setPage(nextPage);
              }}
            >
              Older
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** A compact dated event that reveals its field comparisons on demand. */
function HistoryCard({ entry, time }: { entry: StaffSectionHistoryEntry; time: string }) {
  const tone = entry.action === "Removed"
    ? "border-rose-200 bg-rose-50 text-rose-800"
    : entry.action === "Added"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <li className="relative pb-2.5 last:pb-0">
      <span className="absolute -left-[1.61rem] top-5 size-2.5 rounded-full border-2 border-white bg-primary" aria-hidden />
      <details className="group min-w-0 rounded-xl border border-white-02 bg-white shadow-sm">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-05">{time}</p>
            <p className="truncate text-sm font-semibold text-black-01">{entry.title}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
            {entry.action}
          </span>
          <ChevronDown className="size-4 shrink-0 text-gray-05 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="min-w-0 border-t border-white-02 px-3.5 pb-4 pt-3">
          <p className="break-words text-sm font-medium text-black-01">{entry.title}</p>
          <p className="text-xs text-gray-05">Changed by {entry.actor || "System"}</p>
          {entry.changes.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {entry.changes.map((change) => (
                <div key={change.field} className="min-w-0">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-05">{change.field}</p>
                  <div className="grid min-w-0 grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                    <ValueBox label="Before" value={change.before} tone="before" />
                    <ArrowRight className="hidden size-4 text-gray-05 sm:block" aria-hidden />
                    <ValueBox label="After" value={change.after} tone="after" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-gray-01">No field details recorded.</p>
          )}
        </div>
      </details>
    </li>
  );
}

function ValueBox({ label, value, tone }: { label: string; value: string | null; tone: "before" | "after" }) {
  return (
    <div className={`min-w-0 rounded-lg border px-3 py-2 ${tone === "before" ? "border-gray-200 bg-gray-50" : "border-blue-200 bg-blue-50/50"}`}>
      <span className="block text-[10px] font-medium uppercase tracking-wide text-gray-05">{label}</span>
      <span className="block break-words text-[13px] text-black-01">{value || "Not set"}</span>
    </div>
  );
}
