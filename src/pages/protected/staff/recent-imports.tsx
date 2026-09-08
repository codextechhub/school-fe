import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowRight, Download, FileSpreadsheet, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { routesPath } from "@/routes/routesPath";
import { apiErrorMessage } from "@/utils/api-error";
import {
  importDownloadUrls,
  useCancelImportBatchMutation,
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
 *
 * **A batch that never finished can be ended from here.** An upload abandoned
 * halfway - the file chosen and the wizard closed - stays in the list as
 * Uploaded or Ready to import forever, and there was nowhere to clear it: the
 * wizard's own abandon only reaches the batch it is holding. Once execution
 * starts there is nothing to cancel and the engine says so, which is why the
 * control is absent rather than refused on those.
 */

/** Only the outcomes a finished import lands in. The rest are mid-flight. */
const OUTCOME: Partial<Record<BatchStatus, { label: string; tone: string }>> = {
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
  rolled_back: {
    label: "Rolled back",
    tone: "bg-gray-05/10 text-gray-06-text",
  },
};

/**
 * The statuses the engine will still call off, mirrored from its own list.
 *
 * Stops at the point execution begins. A queued or running import finishes on
 * its own and the server refuses to cancel it, so offering the control there
 * would be a button that exists to be told no.
 */
const CAN_END = new Set<BatchStatus>([
  "draft",
  "uploaded",
  "detecting",
  "mapping_required",
  "validating",
  "validation_failed",
  "ready_to_import",
]);

/** "ready_to_import" becomes "Ready to import". */
function sentenceCase(code: string): string {
  const words = code.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function RecentImports() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRead = hasPermission(P.VIEW_IMPORT_BATCHES);
  // Somebody who may start an import may call one off. The server is stricter
  // still - it lets the UPLOADER cancel their own whatever they hold - but the
  // row carries no uploader, so this is the half that can be checked here.
  const canEnd = hasPermission(P.UPLOAD_IMPORT_BATCH);
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState<number | null>(null);
  const [cancelBatch, { isLoading: cancelling }] =
    useCancelImportBatchMutation();

  const { data } = useGetImportBatchesQuery(
    { dataset_type: "staff", page_size: 5 },
    { skip: !canRead },
  );

  const batches = data?.data ?? [];
  if (!canRead || !batches.length) return null;

  async function end(id: number, filename: string) {
    try {
      await cancelBatch(id).unwrap();
      toast.success(`${filename} was ended. Nothing from it was written.`);
      setEnding(null);
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not end that import. Try again."),
      );
    }
  }

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
        {/* Capped and scrolled, because the panel grows: five batches with a
            confirm open on one of them is taller than a laptop viewport, and the
            chip sits mid-page, so the panel opens upward and puts its first row
            off the top of the screen.

            Capped to the height Radix reports it actually HAS rather than to a
            fraction of the viewport: how much room there is depends on where
            the trigger ended up, which a `vh` figure cannot know. Less the
            footer, which sits outside this box. ScrollArea rather than overflow-y-auto,
            so the scrollbar floats over the content instead of taking width out
            of it and shifting every row as the list gets longer. */}
        <ScrollArea className="max-h-[calc(var(--radix-popover-content-available-height,24rem)-3.5rem)]">
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
                    report is a different act from opening the batch. Same for
                    ending it. */}
                  <span className="mx-2.5 mb-1 flex flex-wrap items-center gap-3">
                    {batch.error_count > 0 && (
                      <a
                        href={importDownloadUrls.validationIssuesExport(
                          batch.id,
                        )}
                        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                      >
                        <Download className="size-3" aria-hidden />
                        {batch.error_count}{" "}
                        {batch.error_count === 1 ? "problem" : "problems"}
                      </a>
                    )}

                    {canEnd && CAN_END.has(batch.status) && (
                      <button
                        type="button"
                        onClick={() => setEnding(batch.id)}
                        className="inline-flex items-center gap-1 text-xs text-gray-05 underline-offset-2 hover:text-error-text hover:underline"
                      >
                        <X className="size-3" aria-hidden />
                        End this import
                      </button>
                    )}
                  </span>

                  {/* Confirmed in place rather than in a dialog. A dialog over a
                    popover is two layers over the list somebody is reading, and
                    the popover closes as the dialog opens - so the row being
                    confirmed is no longer on screen. */}
                  {ending === batch.id && (
                    <span className="mx-2.5 mb-1.5 flex flex-wrap items-center gap-2 rounded-md bg-gray-04 px-2.5 py-2">
                      <span className="text-xs text-gray-01">
                        End it? Nothing from this file has been written.
                      </span>
                      <Button
                        variant="ghost"
                        className="ml-auto h-7 px-2 text-xs"
                        onClick={() => setEnding(null)}
                      >
                        Keep
                      </Button>
                      <Button
                        className="h-7 bg-red-600 px-2.5 text-xs hover:bg-red-700"
                        disabled={cancelling}
                        onClick={() =>
                          void end(batch.id, batch.original_filename)
                        }
                      >
                        {cancelling ? "Ending…" : "End"}
                      </Button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>

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
