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

/**
 * The second look before a move that is hard to walk back.
 *
 * The body is the SERVER's impact sentence, not a generic "are you sure": a
 * confirmation that does not say what will happen is a speed bump, and people
 * learn to click through it. "A withdrawn student leaves the roll and their
 * class seat is released" is a reason to stop and read.
 *
 * The confirm button is red by default, for a move that takes something away.
 * A move that sends work on (submitting, putting a record in use) passes
 * `tone="primary"`, so red keeps meaning loss.
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel,
  busy,
  tone = "destructive",
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  tone?: "destructive" | "primary";
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // The dialog closes itself on action; the caller decides when to
              // dismiss, so a failed request can leave it open with the error.
              e.preventDefault();
              onConfirm();
            }}
            disabled={busy}
            className={tone === "destructive" ? "bg-red-600 hover:bg-red-700" : undefined}
          >
            {busy ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
