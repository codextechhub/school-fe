import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { selectUser } from "@/redux/features/auth/auth-slice";
import { useChangeStaffEmailMutation } from "@/redux/services/staff/staff-api";
import type { StaffDetail } from "@/redux/services/staff/staff-types";
import { useAppSelector } from "@/redux/store";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTE_LIMIT = 200;

/**
 * Change the address a member of staff signs in with.
 *
 * **Two steps, because the change takes effect the moment it is made.** The
 * first collects the new address twice and an optional note. The second says
 * what is about to happen, in words that depend on the account: an activated
 * account is signed out on every device, and an account still waiting to be
 * activated has its invitation sent again to the new address, which kills the
 * link already sent to the old one. Nothing is sent until the second step is
 * confirmed.
 *
 * Typing the address twice is what catches `gmial.com`. The server cannot:
 * a mistyped address is still a valid one.
 *
 * **The note lands on the person's history**, beside who made the change. The
 * addresses themselves do not, because the history is read more widely than
 * the email is.
 *
 * Changing your own address signs you out straight away, and the confirm step
 * says so.
 */
export function EmailDrawer({
  person,
  onClose,
}: {
  person: StaffDetail;
  onClose: () => void;
}) {
  const [changeEmail, { isLoading: saving }] = useChangeStaffEmailMutation();
  const signedInUserId = useAppSelector(selectUser)?.id;
  const isSelf = signedInUserId != null && signedInUserId === person.user_id;

  const current = person.email ?? person.account.email ?? "";
  const invitePending = person.account.status === "PENDING";

  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [email, setEmail] = useState("");
  const [repeat, setRepeat] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const next = email.trim();
  const shapeOk = EMAIL_SHAPE.test(next);
  const same = next.toLowerCase() === current.toLowerCase();
  const matches = next.toLowerCase() === repeat.trim().toLowerCase();

  const emailError =
    error ||
    (next && !shapeOk
      ? "Enter a whole email address."
      : shapeOk && same
        ? "This is already their email address."
        : "");
  const repeatError =
    repeat.trim() && shapeOk && !matches ? "The two addresses do not match." : "";

  const ready = shapeOk && !same && matches;

  async function confirm() {
    try {
      await changeEmail({ id: person.id, email: next, note: note.trim() }).unwrap();
      toast.success(
        invitePending
          ? "Email changed. A new invitation is on its way to it."
          : "Email changed. They sign in with the new address from now on.",
      );
      onClose();
    } catch (failure) {
      setError(
        fieldErrors(failure).email ??
          apiErrorMessage(failure, "We could not change that email address."),
      );
      setStep("enter");
    }
  }

  const name = person.full_name;

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Change email address"
      subtitle={
        step === "enter"
          ? `The address ${name} signs in with.`
          : "Check this before it is saved. It takes effect straight away."
      }
      saveLabel={step === "enter" ? "Continue" : "Change email"}
      onSave={() => (step === "enter" ? setStep("confirm") : void confirm())}
      canSave={ready}
      saving={saving}
    >
      {step === "enter" ? (
        <div className="grid gap-4">
          <Field label="Current email">
            <input
              value={current}
              disabled
              readOnly
              className={cn(inputClass, "cursor-not-allowed bg-gray-03 text-gray-01")}
            />
          </Field>
          <Field label="New email" required error={emailError || undefined}>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className={inputClass}
            />
          </Field>
          <Field
            label="Type the new email again"
            required
            error={repeatError || undefined}
          >
            <input
              type="email"
              autoComplete="off"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              className={inputClass}
            />
          </Field>
          <Field
            label="Note"
            hint="Optional. Shown on their history, for example: Mistyped when invited."
          >
            <textarea
              value={note}
              maxLength={NOTE_LIMIT}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-gray-05">{name}</p>
            <div className="mt-2 grid gap-1.5 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <span className="min-w-0 break-all text-gray-01 line-through">
                {current}
              </span>
              <ArrowRight className="size-4 rotate-90 text-gray-05 sm:rotate-0" />
              <span className="min-w-0 break-all font-medium text-black-01">{next}</span>
            </div>
            {note.trim() && (
              <p className="mt-2 text-xs text-gray-01">Note: {note.trim()}</p>
            )}
          </div>

          <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="grid gap-1.5">
              {invitePending ? (
                <>
                  <p>A new invitation goes to {next}.</p>
                  <p>The invitation link already sent to {current} stops working.</p>
                </>
              ) : (
                <>
                  <p>
                    {isSelf ? "You are" : `${name} is`} signed out on every device.
                  </p>
                  <p>
                    From now on {isSelf ? "you sign" : "they sign"} in with {next}
                    {person.staff_number ? ` or Staff ID ${person.staff_number}` : ""}.
                    {" "}The old address stops working.
                  </p>
                </>
              )}
              {isSelf && (
                <p className="font-medium">
                  This is your own account, so you will be taken to the sign-in
                  page as soon as it is saved.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep("enter")}
            className="justify-self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Back to edit the address
          </button>
        </div>
      )}
    </DrawerShell>
  );
}
