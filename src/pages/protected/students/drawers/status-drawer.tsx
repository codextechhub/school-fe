import { useState } from "react";
import { toast } from "sonner";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";
import { useChangeStudentStatusMutation } from "@/redux/services/students/students-api";
import type {
  AllowedTransition,
  StudentDetail,
} from "@/redux/services/students/students-types";
import { todayIso } from "@/lib/as-at";

import { DrawerShell, Field, inputClass } from "./drawer-shell";
import { ConfirmDialog } from "./confirm-dialog";

// A move that takes a child off the roll, or off attendance, gets a second
// look. Not every status change deserves one - going back to Active does not.
const HEAVY = new Set(["WITHDRAWN", "SUSPENDED", "TRANSFERRED", "REJECTED"]);

/** Today on this device, not in UTC: before 1am in Lagos they differ. */
function today() {
  return todayIso();
}

/**
 * Move a student along the state machine.
 *
 * **The options are the server's, not ours.** `allowed_transitions` arrives on
 * the detail payload with the label and the impact sentence for each, so this
 * drawer holds no copy of the rules. A hard-coded map here would be a second
 * statement of the state machine, and the two would disagree the first time
 * either changed - offering a registrar a move that then 400s.
 *
 * A student with nowhere to go gets told so rather than shown an empty list:
 * Graduated and Transferred are final.
 */
export function StatusDrawer({
  student,
  open,
  onClose,
}: {
  student: StudentDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [next, setNext] = useState<AllowedTransition | null>(null);
  const [reason, setReason] = useState("");
  const [effective, setEffective] = useState(today());
  const [destination, setDestination] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [change, { isLoading }] = useChangeStudentStatusMutation();

  const options = student.allowed_transitions ?? [];
  const heavy = next ? HEAVY.has(next.status) : false;
  const valid =
    Boolean(next) &&
    reason.trim().length > 0 &&
    Boolean(effective) &&
    (!next?.needs_destination || destination.trim().length > 0);

  function reset() {
    setNext(null);
    setReason("");
    setEffective(today());
    setDestination("");
    setConfirming(false);
  }

  async function apply() {
    if (!valid || !next) return;
    try {
      await change({
        id: student.id,
        to_status: next.status,
        reason: reason.trim(),
        effective_date: effective,
        ...(next.needs_destination
          ? { destination_school: destination.trim() }
          : {}),
      }).unwrap();
      toast.success(`${student.full_name} is now ${next.label.toLowerCase()}.`);
      reset();
      onClose();
    } catch (error) {
      setConfirming(false);
      toast.error(writeErrorMessage(error, "We could not change that status."));
    }
  }

  return (
    <>
      <DrawerShell
        open={open}
        onClose={() => {
          reset();
          onClose();
        }}
        title="Change status"
        subtitle={`${student.full_name} is currently ${student.status_label}.`}
        saveLabel={heavy ? "Continue" : "Save status"}
        onSave={() => (heavy ? setConfirming(true) : apply())}
        canSave={valid}
        saving={isLoading}
        destructive={heavy}
      >
        {options.length === 0 ? (
          <p className="rounded-lg bg-gray-04 px-3 py-2 text-sm text-gray-05">
            {student.status_label} is a final status. There is nothing to move{" "}
            {student.first_name} to.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-xs font-medium text-gray-05">Move to</span>
              <div className="grid gap-2">
                {options.map((option) => (
                  <button
                    key={option.status}
                    type="button"
                    onClick={() => {
                      setNext(option);
                      setDestination("");
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm",
                      next?.status === option.status
                        ? "border-primary bg-white-03 text-primary"
                        : "border-white-02 bg-white text-black-01 hover:border-primary/40",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-05">
                Only the moves the state machine allows from{" "}
                {student.status_label} are listed.
              </span>
            </div>

            {/* The server's own words for what this move does. */}
            {next && (
              <p
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  heavy
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-white-02 bg-gray-04 text-gray-05",
                )}
              >
                {next.impact}
              </p>
            )}

            <Field label="Reason">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Why is this happening?"
                className="w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>

            <Field label="Effective from">
              <DatePickerInput
                value={effective}
                onChange={(e) => setEffective(e.target.value)}
                className={inputClass}
              />
            </Field>

            {next?.needs_destination && (
              <Field
                label="Destination school"
                hint="Where the student is going. Kept on the record for reference."
              >
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
          </div>
        )}
      </DrawerShell>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={apply}
        title={`${next?.label ?? "Move"} ${student.full_name}?`}
        body={next?.impact ?? ""}
        confirmLabel={next ? `${next.label} student` : "Confirm"}
        busy={isLoading}
      />
    </>
  );
}
