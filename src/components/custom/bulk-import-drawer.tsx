import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import ImportWizard, {
  type ImportWizardCompletion,
} from "@/components/custom/import-wizard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCancelImportBatchMutation } from "@/redux/services/dashboard/import-api";
import type { DatasetType } from "@/redux/services/dashboard/import-types";
import { routesPath } from "@/routes/routesPath";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ImportProcessDrawer({
  open,
  title,
  description,
  onCancel,
  children,
}: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /**
   * Leaves the wizard, through the same confirmation an in-progress batch
   * gets. Absent leaves the header with no way out, which is what it had.
   */
  onCancel?: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={() => undefined}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="console-geist flex w-full gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        {/* The header carries the way out.
            Escape, the backdrop and the sheet's own close button are all
            deliberately disabled here, because losing a half-uploaded batch to
            a stray click is worse than a second click. That left the only exit
            at the bottom of a seven-step wizard, and on the last steps it is
            below the fold - so somebody who opened this by mistake had to scroll
            to leave. The X is the same guarded exit, where a reader looks for
            it: it routes through the same confirmation, so nothing is lost by
            pressing it. */}
        <SheetHeader className="border-b border-white-02 px-4 py-4 text-left sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-mont text-base font-semibold text-black-01">
                {title}
              </SheetTitle>
              {description ? (
                <SheetDescription className="font-mont text-xs text-gray-01">
                  {description}
                </SheetDescription>
              ) : null}
            </div>
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel this import"
                className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-md text-gray-05 transition-colors hover:bg-gray-04 hover:text-black-01"
              >
                <X className="size-4.5" />
              </button>
            ) : null}
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 bg-gray-50/60">
          <div className="p-3 sm:p-5">
            {children}
        </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function ImportCancelDialog({
  open,
  cancelling,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  cancelling: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this import?</AlertDialogTitle>
          <AlertDialogDescription>
            The uploaded batch will be marked as cancelled. No records will be
            published, and you will return to the screen where you started.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelling}>Continue import</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={cancelling}
            onClick={onConfirm}
          >
            {cancelling ? "Cancelling…" : "Cancel import"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function BulkImportDrawer({
  open,
  datasetType,
  title,
  description,
  returnLabel,
  onClose,
  onFinished,
  onViewBatch,
}: {
  open: boolean;
  datasetType: Exclude<DatasetType, "bank_statements">;
  title: string;
  description: string;
  returnLabel: string;
  onClose: () => void;
  onFinished?: (completion: ImportWizardCompletion) => void | Promise<void>;
  /**
   * Override where "view this import" goes.
   *
   * The default is the batch's own detail screen, which both applications
   * mount. This exists for a caller that wants to keep the reader where they
   * are, and a caller supplying it takes on the whole job: returning a reader
   * to the list they started from is not showing them the import, and the three
   * rows a partly-imported batch skipped are only legible on the batch.
   */
  onViewBatch?: (batchId: number) => void;
}) {
  const navigate = useNavigate();
  const [batchId, setBatchId] = useState<number | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBatch, { isLoading: cancelling }] = useCancelImportBatchMutation();

  const resetAndClose = () => {
    setBatchId(null);
    setCancelOpen(false);
    setWizardKey((current) => current + 1);
    onClose();
  };

  const requestCancel = () => {
    if (!batchId) {
      resetAndClose();
      return;
    }
    setCancelOpen(true);
  };

  const confirmCancel = async () => {
    if (!batchId) return;
    try {
      await cancelBatch(batchId).unwrap();
      toast.success("Import cancelled.");
      resetAndClose();
    } catch {
      // The shared API interceptor owns the failure message; keep the workflow open.
    }
  };

  const abandonBatch = async (id: number) => {
    try {
      await cancelBatch(id).unwrap();
      setBatchId(null);
      return true;
    } catch {
      return false;
    }
  };

  const startAnother = () => {
    setBatchId(null);
    setWizardKey((current) => current + 1);
  };

  const viewDetails = (id: number) => {
    resetAndClose();
    if (onViewBatch) return onViewBatch(id);
    navigate(routesPath.PROTECTED.DATA_IMPORTS.BATCHES.VIEW(String(id)));
  };

  return (
    <>
      <ImportProcessDrawer
        open={open}
        title={title}
        description={description}
        onCancel={requestCancel}
      >
        <ImportWizard
          key={wizardKey}
          datasetType={datasetType}
          lockTemplate
          onBatchCreated={setBatchId}
          onAbandonBatch={abandonBatch}
          onFinished={onFinished}
          onComplete={viewDetails}
          onReturn={resetAndClose}
          returnLabel={returnLabel}
          onNewImport={startAnother}
          onCancel={requestCancel}
        />
      </ImportProcessDrawer>

      <ImportCancelDialog
        open={cancelOpen}
        cancelling={cancelling}
        onOpenChange={setCancelOpen}
        onConfirm={() => { void confirmCancel(); }}
      />
    </>
  );
}
