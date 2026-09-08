import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Download, FileSpreadsheet } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { routesPath } from "@/routes/routesPath";
import {
  importDownloadUrls,
  useGetImportBatchesQuery,
} from "@/redux/services/dashboard/import-api";
import type { BatchStatus } from "@/redux/services/dashboard/import-types";

import { formatDate } from "../students/format";

/**
 * What this school has imported, one chip wide, on the directory's toolbar.
 *
 * **Here rather than on a screen of its own.** Bulk import is a thing you do TO
 * the directory rather than a place you go, which is why the wizard is a drawer
 * over these rows - but the RECORD of an import is a different question, asked
 * months later and without a file in hand: "was the caretaker ever added?" The
 * answer is three skipped rows and a reason, and shown once at step seven it is
 * gone.
 *
 * **A chip and a popover, not a band and an accordion.** It was a full-width
 * strip above the header, so a school that imported once in September carried
 * its own filing cabinet across the top of the directory every day until
 * Christmas - and opening it pushed the whole page down, moving the rows the
 * reader was looking at. A popover costs one control's width and takes the page
 * with it when it closes.
 *
 * **Absent entirely when there is nothing.** A school that has never imported
 * has no history, which is a different thing from a history that failed to
 * load.
 *
 * The error report is the point of a row. A partly-imported batch is the one a
 * school has to act on, and its skipped rows are a file the engine already
 * exports - so it is offered on the row rather than only inside the batch.
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
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRead = hasPermission(P.VIEW_IMPORT_BATCHES);
  const [open, setOpen] = useState(false);

  const { data } = useGetImportBatchesQuery(
    { dataset_type: "staff", page_size: 5 },
    { skip: !canRead },
  );

  const batches = data?.data ?? [];
  if (!canRead || !batches.length) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10.5 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[13.5px] font-medium",
            open
              ? "border-primary bg-white-03 text-primary"
              : "border-white-02 bg-white text-gray-01 hover:bg-gray-03",
          )}
        >
          <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
          Recent imports
          <span className="grid size-4.5 place-content-center rounded-full bg-gray-04 text-[11px] font-semibold text-gray-01">
            {batches.length}
          </span>
        </button>
      </PopoverTrigger>

      {/* Aligned to the trigger's right edge, because the chip sits on the
          right of the toolbar and a left-aligned panel would hang off screen. */}
      <PopoverContent align="end" className="w-88 p-2">
        <ul className="grid gap-1">
          {batches.map((batch) => {
            const outcome = OUTCOME[batch.status];
            return (
              <li key={batch.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(
                      routesPath.PROTECTED.DATA_IMPORTS.BATCHES.VIEW(
                        String(batch.id),
                      ),
                    );
                  }}
                  className="flex w-full flex-wrap items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-gray-03"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-black-01">
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
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      outcome?.tone ?? "bg-gray-04 text-gray-01",
                    )}
                  >
                    {/* A batch still mid-flight prints its own state rather
                        than being forced into an outcome it has not reached. */}
                    {outcome?.label ?? sentenceCase(batch.status)}
                  </span>
                </button>

                {/* Outside the row's button rather than inside it: a link
                    nested in a button is not clickable, and downloading the
                    report is a different act from opening the batch. */}
                {batch.error_count > 0 && (
                  <a
                    href={importDownloadUrls.validationIssuesExport(batch.id)}
                    className="mx-2.5 mb-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    <Download className="size-3" aria-hidden />
                    {batch.error_count}{" "}
                    {batch.error_count === 1 ? "problem" : "problems"}
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate(routesPath.PROTECTED.DATA_IMPORTS.BATCHES.INDEX);
          }}
          className="mt-1 flex w-full items-center justify-between gap-2 rounded-md border-t border-white-02 px-2.5 pb-1 pt-2.5 text-[13px] text-primary hover:bg-gray-03"
        >
          See every import
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </PopoverContent>
    </Popover>
  );
}
