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
import { invitationKind } from "./invitation-model";

/**
 * Withdraw an invitation that has not been used, or a hire not yet approved.
 *
 * **A reason is required**, and the server requires it too. This is the control
 * for an address that was wrong or a hire that fell through, and both are
 * things a school is asked about later: "we invited somebody and then did not"
 * is a sentence that needs the rest of itself.
 *
 * Confirmed rather than done on the menu click, because it is not reversible
 * from this screen: the link stops working, the record is closed as
 * Terminated, and the person has to be invited again from the start.
 *
 * For a hire still awaiting approval the same call withdraws the hire: its
 * approval is cancelled, the record is closed, and nothing was ever sent. For
 * somebody imported during setup, whose invitation waits for go-live, it
 * closes the record before the invitation is ever sent.
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
  const kind = person ? invitationKind(person) : "invitation";
  const hire = kind === "hire";

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
            Withdraw {person?.full_name}&apos;s {hire ? "hire" : "invitation"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hire
              ? "Its approval is cancelled and nothing is sent to them. Their record stays on the staff list, closed as Terminated, and hiring them later starts from the beginning."
              : kind === "held"
                ? "Their invitation has not been sent and never will be. Their record stays on the staff list, closed as Terminated, and inviting them later starts from the beginning."
                : `${
                  person?.email
                    ? `The link sent to ${person.email} stops working.`
                    : "The invitation link stops working."
                } Their record stays on the staff list, closed as Terminated, and inviting them again starts from the beginning.`}
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
          <AlertDialogCancel disabled={saving}>
            {hire ? "Keep hire" : "Keep invitation"}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={saving || reason.trim().length === 0}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(event) => {
              // The dialog closes itself on action, and a refusal would then
              // have nothing to reopen. Held open so a server error lands on
              // the form the reader was already looking at.
              event.preventDefault();
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            {saving ? "Withdrawing…" : hire ? "Withdraw hire" : "Withdraw invitation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
