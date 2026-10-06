import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { todayIso } from "@/lib/as-at";
import { shiftDay } from "@/lib/dates";
import {
  useConfirmApplicantMutation,
  useGetAdmissionPolicyQuery,
  useMoveApplicantStageMutation,
  useRejectApplicantMutation,
} from "@/redux/services/students/students-api";
import type {
  AdmissionStage,
  StudentRow,
} from "@/redux/services/students/students-types";
import { writeErrorMessage } from "@/utils/api-error";

import { ConfirmDialog } from "../drawers/confirm-dialog";
import { DrawerShell, Field, inputClass } from "../drawers/drawer-shell";
import { formatDate } from "../format";

/**
 * Every move an applicant makes on the Applicants board, each with its reason.
 *
 * Four moves leave the board's cards: to another admission step, an expired
 * offer extended, onto the roll, and a closed application. Each asks why
 * before it is sent, and each sends the words in `reason`, the field the
 * server reads on all four routes. The server keeps them on the applicant's
 * history, where only roles allowed to read status reasons see them.
 *
 * Closing an application is the one move the server refuses without a reason,
 * so it is the one that cannot be saved blank. The other three accept a blank
 * reason, because a step change is often routine and a required box would buy
 * a placeholder rather than a record.
 *
 * Every mutation here is silent, so the toast in each drawer is the only one
 * a refusal produces. A refused move keeps its drawer open with the reason
 * still typed.
 */

/** The longest reason the server accepts on any applicant move. */
export const REASON_MAX = 200;

const textareaClass =
  "w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary";

function ReasonBox({
  value,
  onChange,
  required,
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  hint: string;
}) {
  return (
    <Field
      label={required ? "Reason" : "Reason (optional)"}
      required={required}
      hint={hint}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={REASON_MAX}
        className={textareaClass}
      />
    </Field>
  );
}

/** A step change or an offer extension waiting for its reason. */
type PendingMove =
  | { kind: "step"; stage: number | null }
  | { kind: "extend"; until: string };

function stepName(stages: AdmissionStage[], id: number | null | undefined) {
  if (id == null) return "Not started";
  return stages.find((s) => s.id === id)?.name ?? "Not started";
}

/**
 * Move an applicant to another step, or give an expired offer seven more days.
 *
 * Picking a step does not move the child: it opens the drawer that asks why,
 * and the card's list keeps showing the current step until the server agrees.
 * Entering an offer step starts its window on the server, from the school's
 * own day; extending sets a new last day explicitly.
 */
export function StageControls({
  student,
  stages,
}: {
  student: StudentRow;
  stages: AdmissionStage[];
}) {
  const [pending, setPending] = useState<PendingMove | null>(null);
  const ordered = [...stages].sort((a, b) => a.position - b.position);

  return (
    <>
      {/* The select's own wrapper is full width; this box sets its size. */}
      <div className="w-40 max-w-full">
        <NativeSelect
          size="sm"
          aria-label={`Move ${student.full_name} to a step`}
          value={student.admission_stage == null ? "" : String(student.admission_stage)}
          disabled={pending !== null}
          onChange={(event) => {
            const value = event.target.value;
            setPending({ kind: "step", stage: value === "" ? null : Number(value) });
          }}
        >
          <option value="">Not started</option>
          {ordered.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </NativeSelect>
      </div>
      {student.offer_expired ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => setPending({ kind: "extend", until: shiftDay(todayIso(), 7) })}
        >
          Extend 7 days
        </Button>
      ) : null}
      {pending && (
        <StageMoveDrawer
          student={student}
          stages={ordered}
          move={pending}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}

/**
 * Ask why before a step change or an offer extension is sent.
 *
 * An extension is a move to the step the child is already at with a new last
 * day, which is how the server resets an offer. Moving into an offer step says
 * how long the family will have, so the reader knows a clock starts.
 */
export function StageMoveDrawer({
  student,
  stages,
  move: pending,
  onClose,
}: {
  student: StudentRow;
  stages: AdmissionStage[];
  move: PendingMove;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [move, { isLoading }] = useMoveApplicantStageMutation();

  const from = stepName(stages, student.admission_stage);
  const extending = pending.kind === "extend";
  const target = extending ? (student.admission_stage ?? null) : pending.stage;
  const to = stepName(stages, target);
  const offer = !extending ? stages.find((s) => s.id === target && s.is_offer) : undefined;

  async function save() {
    const words = reason.trim();
    try {
      await move({
        id: student.id,
        stage: target,
        ...(extending ? { offer_expires_on: pending.until } : {}),
        ...(words ? { reason: words } : {}),
      }).unwrap();
      toast.success(
        extending
          ? `${student.full_name}'s offer is open until ${formatDate(pending.until)}.`
          : `${student.full_name} moved to ${to}.`,
      );
      onClose();
    } catch (error) {
      toast.error(writeErrorMessage(error, "That move could not be made."));
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={
        extending
          ? "Extend the offer"
          : target == null
            ? "Move back to Not started"
            : `Move to ${to}`
      }
      subtitle={
        extending
          ? `${student.full_name}'s offer at ${to} stays open until ${formatDate(pending.until)}.`
          : `${student.full_name} moves from ${from} to ${to}.`
      }
      saveLabel={extending ? "Extend" : "Move"}
      onSave={save}
      canSave
      saving={isLoading}
    >
      <div className="grid gap-4">
        <ReasonBox
          value={reason}
          onChange={setReason}
          hint="Kept on the applicant's history."
        />
        {offer?.offer_valid_days ? (
          <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
            {to} is an offer. The family has {offer.offer_valid_days}{" "}
            {offer.offer_valid_days === 1 ? "day" : "days"} from today to accept.
          </p>
        ) : null}
      </div>
    </DrawerShell>
  );
}

/**
 * Put an applicant on the roll.
 *
 * It does not place them in a class, and the drawer says so. That is the model:
 * an enrolled student with no class is the "unassigned" state the whole module
 * tracks, and the placement is a separate move with its own reason and audit
 * line. Pretending otherwise here would mean inventing a seat.
 */
export function ConfirmEnrolment({
  student,
  onClose,
}: {
  student: StudentRow;
  onClose: () => void;
}) {
  // The rule of the applicant's own branch, which is the one the server checks.
  const { data: policyData } = useGetAdmissionPolicyQuery(
    student.branch != null ? { branch: String(student.branch) } : undefined,
  );
  const policy = policyData?.data;
  const [number, setNumber] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, { isLoading }] = useConfirmApplicantMutation();

  // Blank is fine where the applicant already has a number, or where the
  // server issues the next one itself.
  const required =
    Boolean(policy?.required) && !student.student_number && !policy?.auto_issue;
  const valid = !required || number.trim().length > 0;

  async function save() {
    const words = reason.trim();
    try {
      await confirm({
        id: student.id,
        ...(number.trim() ? { student_number: number.trim() } : {}),
        ...(words ? { reason: words } : {}),
      }).unwrap();
      toast.success(`${student.full_name} is now enrolled.`);
      onClose();
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not enrol that applicant."));
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Put on the roll"
      subtitle={`${student.full_name} becomes an enrolled student.`}
      saveLabel="Enrol"
      onSave={save}
      canSave={valid}
      saving={isLoading}
    >
      <div className="grid gap-4">
        <Field
          label={required ? "Admission number" : "Admission number (optional)"}
          hint={
            policy?.hint ||
            (required
              ? undefined
              : "Leave blank to issue one later. The school has set no format.")
          }
        >
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={inputClass}
          />
        </Field>

        <ReasonBox
          value={reason}
          onChange={setReason}
          hint="Kept on the student's history."
        />

        <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
          This puts {student.first_name} on the roll. It does not place them in a
          class - do that next, so the move carries its own reason and appears on
          their history.
        </p>
      </div>
    </DrawerShell>
  );
}

/** Close an application, which is not the same as withdrawing a student. */
export function CloseApplication({
  student,
  onClose,
}: {
  student: StudentRow;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [reject, { isLoading }] = useRejectApplicantMutation();

  async function save() {
    try {
      await reject({ id: student.id, reason: reason.trim() }).unwrap();
      toast.success(`${student.full_name}'s application is closed.`);
      setConfirming(false);
      onClose();
    } catch (error) {
      setConfirming(false);
      toast.error(writeErrorMessage(error, "We could not close that application."));
    }
  }

  return (
    <>
      <DrawerShell
        open={!confirming}
        onClose={onClose}
        title="Close this application"
        subtitle={`${student.full_name} will not be enrolled.`}
        saveLabel="Continue"
        onSave={() => setConfirming(true)}
        canSave={reason.trim().length > 0}
        saving={isLoading}
        destructive
      >
        <div className="grid gap-4">
          <ReasonBox
            value={reason}
            onChange={setReason}
            required
            hint="Kept on the record so the school can see the decision later."
          />
          <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
            The record is kept. Closing an application is not withdrawing a
            student - {student.first_name} was never on the roll, and the school
            needs the two apart.
          </p>
        </div>
      </DrawerShell>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={save}
        title={`Close ${student.full_name}'s application?`}
        body="The record is kept so the decision can be looked up later, but they will not be enrolled."
        confirmLabel="Close application"
        busy={isLoading}
      />
    </>
  );
}
