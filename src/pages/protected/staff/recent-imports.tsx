import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet } from "lucide-react";

import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import {
  importDownloadUrls,
  useGetImportBatchesQuery,
} from "@/redux/services/dashboard/import-api";
import type { BatchStatus } from "@/redux/services/dashboard/import-types";

import { formatDate } from "../students/format";

/**
 * What this school has imported, folded away under the directory.
 *
 * **Here rather than on a screen of its own.** Bulk import is a thing you do TO
 * the directory rather than a place you go, which is why the wizard is a drawer
 * over these rows - but the RECORD of an import is a different question, asked
 * months later and without a file in hand: "was the caretaker ever added?" The
 * answer is three skipped rows and a reason, and shown once at step seven it is
 * gone. So the history lives beside the list the rows landed in.
 *
 * **Collapsed by default, and absent entirely when there is nothing.** A school
 * imports twice a year; an always-open panel would put a stale September entry
 * above the directory every day until Christmas.
 *
 * The error report is the point of the row. A partly-imported batch is the one
 * a school has to act on, and its skipped rows are a file the engine already
 * exports.
 */

/** Only the outcomes a finished import lands in. The rest are mid-flight. */
const OUTCOME: Partial<
  Record<BatchStatus, { label: string; tone: string }>
> = {
  import_succeeded: {
    label: "Imported",
    tone: "bg-green-01/10 text-green-01-text",
  },
  import_partial: {
    label: "Partly imported",
    tone: "bg-amber-50 text-amber-900",
  },
  validation_failed: {
    label: "Validation failed",
    tone: "bg-destructive/10 text-error-text",
  },
  import_failed: {
    label: "Import failed",
    tone: "bg-destructive/10 text-error-text",
  },
  cancelled: { label: "Cancelled", tone: "bg-gray-05/10 text-gray-06-text" },
  rolled_back: { label: "Rolled back", tone: "bg-gray-05/10 text-gray-06-text" },
};

/** "ready_to_import" becomes "Ready to import". */
function sentenceCase(code: string): string {
  const words = code.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function RecentImports() {
  const { hasPermission } = usePermissions();
  const canRead = hasPermission(P.BROWSE_IMPORTS);
  const [open, setOpen] = useState(false);

  const { data } = useGetImportBatchesQuery(
    { dataset_type: "staff", page_size: 5 },
    { skip: !canRead },
  );

  const batches = data?.data ?? [];
  // Nothing to say, so nothing drawn. Not an empty panel: a school that has
  // never imported has no history, which is a different thing from a history
  // that failed to load.
  if (!canRead || !batches.length) return null;

  return (
    <section className="rounded-lg border border-white-02 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <FileSpreadsheet className="size-4 shrink-0 text-gray-05" aria-hidden />
        <span className="text-[13.5px] font-medium text-black-01">
          Recent imports
        </span>
        <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[11px] font-medium text-gray-01">
          {batches.length}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "ml-auto size-4 text-gray-05 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul className="grid gap-2 border-t border-white-02 px-4 py-3.5">
          {batches.map((batch) => {
            const outcome = OUTCOME[batch.status];
            return (
              <li
                key={batch.id}
                className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-black-01">
                    {batch.original_filename}
                  </span>
                  <span className="block text-xs text-gray-05">
                    {batch.total_rows}{" "}
                    {batch.total_rows === 1 ? "row" : "rows"} ·{" "}
                    {formatDate(batch.created_at)}
                  </span>
                </span>

                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    outcome?.tone ?? "bg-gray-04 text-gray-01",
                  )}
                >
                  {/* A batch still mid-flight prints its own state rather than
                      being forced into an outcome it has not reached. Sentence
                      case so it sits beside the finished ones rather than
                      reading as a different kind of thing. */}
                  {outcome?.label ?? sentenceCase(batch.status)}
                </span>

                {/* The reason rows were skipped, as the engine wrote it. This
                    is the whole point of keeping the history: it is the only
                    place that answers who did not make it in. */}
                {batch.error_count > 0 && (
                  <a
                    href={importDownloadUrls.validationIssuesExport(batch.id)}
                    className="ml-auto inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    <Download className="size-3.5" />
                    {batch.error_count}{" "}
                    {batch.error_count === 1 ? "problem" : "problems"}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
