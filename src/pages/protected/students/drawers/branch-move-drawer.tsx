import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import { NativeSelect } from "@/components/ui/native-select";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { isOverridableCapacity, writeErrorMessage } from "@/utils/api-error";
import { formatKoboAsNaira } from "@/utils/user-facing-message";
import {
  useGetBranchMoveOptionsQuery,
  useGetClassSeatsQuery,
  useMoveStudentBranchMutation,
  usePreviewBranchMoveMutation,
} from "@/redux/services/students/students-api";
import type {
  BranchMoveResult,
  StudentDetail,
} from "@/redux/services/students/students-types";

import { formatDate } from "../format";
import { DrawerShell, Field, inputClass } from "./drawer-shell";

/** Keep the current class (a school-wide one) or stay unplaced. */
const KEEP = "keep";

/**
 * Move a pupil to another branch of the school, with their fee account.
 *
 * The server decides where the pupil may go: the form offers only the
 * branches GET `/students/<id>/move-branch/` lists, which are the open
 * branches whose pair with the pupil's own the reader works at. An empty list
 * gets a sentence and no form.
 *
 * **What moves financially is shown before the move.** Once a branch and a
 * day are chosen the drawer asks for a preview, which the server answers by
 * running the real finance move and rolling it back, so the figures are the
 * ones the move books and a refusal the move would meet (a closed month at
 * either branch) is shown before anybody presses Move. A reader whose role
 * does not read invoices is told how many bills move and no amount.
 *
 * After the move the drawer shows what happened, including the finance
 * record's number, rather than closing on a toast: the bursars of both
 * branches will ask about it.
 */
export function BranchMoveDrawer({
  student,
  open,
  onClose,
}: {
  student: Pick<StudentDetail, "id" | "first_name" | "full_name" | "branch">;
  open: boolean;
  onClose: () => void;
}) {
  const { data: optionsData, isLoading: optionsLoading } =
    useGetBranchMoveOptionsQuery(student.id);
  const options = optionsData?.data;
  const targets = options?.branches ?? [];
  const firstName = student.first_name || student.full_name;

  const [target, setTarget] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [effective, setEffective] = useState("");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [done, setDone] = useState<BranchMoveResult | null>(null);

  // One branch to go to is the common case: choose it rather than ask.
  const only = targets.length === 1 ? String(targets[0].id) : "";
  const targetId = target || only;
  const chosen = targets.find((b) => String(b.id) === targetId);
  const day = effective || chosen?.today || "";
  const { prefs } = useSchoolDisplay(chosen?.id);

  const { data: seatsData } = useGetClassSeatsQuery(
    chosen ? { branch: chosen.id } : undefined,
    { skip: !chosen },
  );
  const classes = (seatsData?.data ?? []).filter(
    (c) => c.branch == null || c.branch === chosen?.id,
  );
  const needsClass = Boolean(options?.needs_class);
  const classId = schoolClass && schoolClass !== KEEP ? Number(schoolClass) : null;
  const pickedClass = classes.find((c) => c.id === classId);

  const [preview, previewState] = usePreviewBranchMoveMutation();
  const [move, { isLoading: moving }] = useMoveStudentBranchMutation();

  useEffect(() => {
    if (!chosen || !day) return;
    preview({ id: student.id, to_branch: String(chosen.id), effective_date: day });
  }, [chosen, day, preview, student.id]);

  const shown = previewState.data?.data;
  const previewError = previewState.error
    ? writeErrorMessage(previewState.error, "We could not work out what would move.")
    : "";

  const valid =
    Boolean(chosen) &&
    Boolean(day) &&
    reason.trim().length > 0 &&
    (!needsClass || classId != null) &&
    !previewError;

  function reset() {
    setTarget("");
    setSchoolClass("");
    setEffective("");
    setReason("");
    setOverride(false);
    setDone(null);
  }

  async function save() {
    if (!valid || !chosen) return;
    try {
      const answer = await move({
        id: student.id,
        to_branch: String(chosen.id),
        effective_date: day,
        reason: reason.trim(),
        school_class: classId,
        allow_over_capacity: override,
      }).unwrap();
      toast.success(`${student.full_name} now attends ${chosen.name}.`);
      setDone(answer.data);
    } catch (error) {
      const message = writeErrorMessage(error, "We could not move this pupil.");
      if (isOverridableCapacity(error) && !override) {
        setOverride(true);
        toast.warning(`${message} Save again to go ahead anyway.`);
        return;
      }
      toast.error(message);
    }
  }

  function close() {
    reset();
    onClose();
  }

  if (done) {
    return (
      <DrawerShell
        open={open}
        onClose={close}
        title="Moved to another branch"
        subtitle={student.full_name}
        saveLabel="Close"
        onSave={close}
        canSave
        readOnly
        wide
      >
        <div className="grid gap-4">
          <p className="text-sm text-black-01">
            {firstName} now attends {done.to_branch_name} from{" "}
            {formatDate(done.effective_date, prefs)}
            {done.school_class_name ? `, in ${done.school_class_name}` : ""}.
          </p>
          <WhatMoves result={done} firstName={firstName} />
          <p className="text-xs text-gray-05">
            The move is in {firstName}&apos;s history with your name
            against it.
          </p>
        </div>
      </DrawerShell>
    );
  }

  if (!optionsLoading && targets.length === 0) {
    return (
      <DrawerShell
        open={open}
        onClose={close}
        title="Move to another branch"
        subtitle={student.full_name}
        saveLabel="Close"
        onSave={close}
        canSave
        readOnly
      >
        <p className="text-sm text-gray-05">
          There is no other branch you can move {firstName} to. Moving
          a pupil needs somebody who works at both branches.
        </p>
      </DrawerShell>
    );
  }

  return (
    <DrawerShell
      open={open}
      onClose={close}
      title="Move to another branch"
      subtitle={`${student.full_name} · ${options?.branch_name ?? ""}`}
      saveLabel={override ? "Move anyway" : "Move pupil"}
      onSave={save}
      canSave={valid}
      saving={moving}
      destructive={override}
      wide
    >
      <div className="grid gap-4">
        <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="text-xs text-gray-05">From</p>
            <p className="mt-1 text-sm font-semibold text-black-01">
              {options?.branch_name}
            </p>
            <p className="text-xs text-gray-05">
              {options?.school_class_name ?? "No class yet"}
            </p>
          </div>
          <ArrowRight className="mx-auto size-4 rotate-90 text-gray-05 sm:rotate-0" />
          <div className="rounded-lg border border-border bg-pry-01 px-4 py-3">
            <p className="text-xs text-gray-05">To</p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {chosen?.name ?? "Not picked yet"}
            </p>
            <p className="text-xs text-gray-05">
              {pickedClass?.name ??
                (options?.class_is_shared ? options.school_class_name : "") ??
                ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Branch" required>
            <NativeSelect
              value={targetId}
              onChange={(e) => {
                setTarget(e.target.value);
                setSchoolClass("");
                setEffective("");
                setOverride(false);
              }}
              className="h-9"
              required
            >
              {targets.length > 1 && <option value="">Select a branch</option>}
              {targets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label={chosen ? `Class at ${chosen.name}` : "Class"}
            required={needsClass}
            hint={
              needsClass
                ? undefined
                : options?.class_is_shared
                  ? "Leave it to keep their class, which every branch shares."
                  : "Leave it to place them later."
            }
          >
            <NativeSelect
              value={schoolClass}
              onChange={(e) => {
                setSchoolClass(e.target.value);
                setOverride(false);
              }}
              className="h-9"
              disabled={!chosen}
            >
              <option value={needsClass ? "" : KEEP}>
                {needsClass
                  ? "Select a class"
                  : options?.class_is_shared
                    ? `Keep ${options.school_class_name}`
                    : "No class yet"}
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.capacity == null
                    ? ` · ${c.used} enrolled`
                    : ` · ${c.used}/${c.capacity}`}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Moves on" required hint="Today or an earlier day.">
            <DatePickerInput
              value={day}
              max={chosen?.today}
              onChange={(e) => setEffective(e.target.value)}
              className={inputClass}
              disabled={!chosen}
              required
            />
          </Field>
        </div>

        <Field label="Reason" required>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Why is the pupil moving?"
            className="w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>

        {chosen && previewError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {previewError}
          </p>
        )}
        {chosen && !previewError && shown && (
          <WhatMoves result={shown} firstName={firstName} preview />
        )}
      </div>
    </DrawerShell>
  );
}

/**
 * What a move carries between the two branches' books, in plain words.
 *
 * Exported for its own tests. The sentence about what is owed reads the sign:
 * positive means the new branch owes the old one for the fees the old branch
 * already earned, negative means the old branch owes the new one, which
 * happens when the pupil was in credit.
 */
export function WhatMoves({
  result,
  firstName,
  preview = false,
}: {
  result: BranchMoveResult;
  firstName: string;
  preview?: boolean;
}) {
  const from = result.from_branch_name;
  const to = result.to_branch_name;
  const verb = preview ? "will move" : "moved";

  if (result.accounts.length === 0) {
    return (
      <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
        {firstName} has no fee account yet, so no money {verb}.
      </p>
    );
  }

  const bills = result.accounts.reduce(
    (n, a) => n + a.invoice_count + a.debit_note_count,
    0,
  );
  const totals = result.totals;
  if (!result.figures_shown || !totals) {
    return (
      <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
        {firstName}&apos;s fee account {verb} to {to} with {bills}{" "}
        {bills === 1 ? "open bill" : "open bills"}. Your role does not show the
        amounts.
      </p>
    );
  }

  const owed = totals.inter_branch_amount;
  const numbers = result.accounts.map((a) => a.transfer_number).filter(Boolean);
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm">
      <p className="font-semibold text-black-01">
        {preview ? "Will move" : "Moved"} from {from} to {to}:
      </p>
      <ul className="grid gap-1 text-black-01">
        {result.accounts.flatMap((a) => a.bills ?? []).map((bill) => (
          <li key={bill.number} className="flex flex-wrap justify-between gap-2">
            <span>
              {bill.kind === "DEBIT_NOTE" ? "Debit note" : "Bill"} {bill.number}
            </span>
            <span>{formatKoboAsNaira(bill.amount)}</span>
          </li>
        ))}
        {bills === 0 && <li className="text-gray-05">No open bills</li>}
        <li className="flex flex-wrap justify-between gap-2">
          <span>Unspent credit</span>
          <span>{formatKoboAsNaira(totals.credit_amount)}</span>
        </li>
        <li className="flex flex-wrap justify-between gap-2">
          <span>Fees not yet earned</span>
          <span>{formatKoboAsNaira(totals.deferred_amount)}</span>
        </li>
      </ul>
      <p className="text-xs text-gray-05">
        {owed > 0
          ? `${to} ${preview ? "will owe" : "owes"} ${from} ${formatKoboAsNaira(owed)} for the fees ${from} already earned: the bills ${to} now collects, less the credit and unearned fees it takes over.`
          : owed < 0
            ? `${from} ${preview ? "will owe" : "owes"} ${to} ${formatKoboAsNaira(-owed)}: the credit and unearned fees ${to} takes over come to more than the bills it collects.`
            : `Nothing is owed between ${from} and ${to}.`}{" "}
        Income {from} already earned stays in its books.
      </p>
      {numbers.length > 0 && (
        <p className="text-xs text-gray-05">
          Finance record: {numbers.join(", ")}.
        </p>
      )}
    </div>
  );
}
