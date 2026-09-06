import { useState } from "react";

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
import type { StaffListRow } from "@/redux/services/staff/staff-types";

import { Field, inputClass } from "../../students/drawers/drawer-shell";

/**
 * Withdraw an invitation that has not been used.
 *
 * **A reason is required**, and the server requires it too. This is the control
 * for an address that was wrong or a hire that fell through, and both are
 * things a school is asked about later: "we invited somebody and then did not"
 * is a sentence that needs the rest of itself.
 *
 * Confirmed rather than done on the menu click, because it is not reversible
 * from this screen: the link stops working, and the person has to be invited
 * again from the start.
 */
export function RevokeDialog({
  person,
  saving,
  onCancel,
  onConfirm,
}: {
  /** Null when nothing is being withdrawn, which is when this renders nothing. */
  person: StaffListRow | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <AlertDialog
      open={Boolean(person)}
      onOpenChange={(next) => {
        if (!next) {
          setReason("");
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Withdraw {person?.full_name}&apos;s invitation?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The link sent to {person?.email} stops working. Their record stays
            on the staff list as Invited, and inviting them again starts from
            the beginning.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field label="Reason" required>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Wrong address, hire fell through…"
            className={inputClass}
          />
        </Field>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving || reason.trim().length === 0}
            onClick={(event) => {
              // The dialog closes itself on action, and a refusal would then
              // have nothing to reopen. Held open so a server error lands on
              // the form the reader was already looking at.
              event.preventDefault();
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            {saving ? "Withdrawing…" : "Withdraw"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
