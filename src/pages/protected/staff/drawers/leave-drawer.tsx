import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { NativeSelect } from "@/components/ui/native-select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { apiErrorMessage, fieldErrorsFor } from "@/utils/api-error";
import {
  useFileStaffLeaveMutation,
  useGetStaffLeaveQuery,
  useGetStaffRulesQuery,
} from "@/redux/services/staff/staff-api";
import type { LeaveType } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { balanceHint, countingNote, overAllowanceMessage } from "./leave-copy";

/** The leave types when the school's rules cannot be read. */
const FALLBACK_TYPES: { value: LeaveType; label: string }[] = [
  { value: "ANNUAL", label: "Annual" },
  { value: "SICK", label: "Sick" },
  { value: "MATERNITY", label: "Maternity" },
  { value: "PATERNITY", label: "Paternity" },
  { value: "STUDY", label: "Study" },
  { value: "COMPASSIONATE", label: "Compassionate" },
  { value: "OTHER", label: "Other" },
];

/**
 * File a leave request, for yourself or on somebody's behalf.
 *
 * **One drawer behind two verbs**, because it is one endpoint behind two keys.
 * Applying for your own needs `school.leave.apply`, which every member of staff
 * holds; filing somebody else's needs `school.leave.update`. The server decides
 * which by looking at whose record it is, so a second form here would be a
 * second set of rules about who may file what, and the two would drift.
 *
 * **It is filed, not recorded.** The request goes to the school's own approver
 * group on the workflow engine and comes back Pending; it is not an absence
 * until somebody decides it. A school whose group is still empty gets a request
 * that parks rather than one approved unseen, and the drawer says so - the
 * alternative is a person watching Pending for a week with no idea why.
 *
 * **The types and the counting are the school's** (Settings, Staff), read from
 * the staff rules. Those need `school.teachers.view`, which not every reader
 * holds, so the drawer keeps a fixed list of types and a general sentence
 * about counting for a reader who cannot read them. The days are counted by
 * the server on submit; the drawer shows no estimate of its own.
 *
 * **Going past an allowance warns and never refuses.** Where the person's
 * balance for the chosen type is on screen already (the Leave tab's own
 * query), it is shown under the type, and a filing that goes over is filed
 * and then said plainly.
 */
export function LeaveDrawer({
  staffId,
  personName,
  isSelf,
  onClose,
}: {
  staffId: number;
  personName: string;
  /** Whose record this is. Changes the wording only; the server picks the key. */
  isSelf: boolean;
  onClose: () => void;
}) {
  const [file, { isLoading: saving }] = useFileStaffLeaveMutation();
  const rules = useGetStaffRulesQuery().data?.data;
  const leave = useGetStaffLeaveQuery({ id: staffId }).currentData?.data;
  const types = rules?.leave.leave_types.length
    ? (rules.leave.leave_types as { value: LeaveType; label: string }[])
    : FALLBACK_TYPES;

  const [type, setType] = useState<LeaveType | "">("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const typeLabel = types.find((row) => row.value === type)?.label ?? "";
  const balance = type
    ? leave?.balances?.find((row) => row.leave_type === type)
    : undefined;
  const hint = balanceHint(balance, leave?.balance_session?.name ?? "this session");

  // Both ends are needed, and the end cannot precede the start. Checked here so
  // a reader is not sent to the server to be told something they can see.
  const orderWrong = Boolean(start && end && end < start);
  const canSave = Boolean(type) && Boolean(start) && Boolean(end) && !orderWrong;

  async function save() {
    if (!type) return;
    try {
      const result = await file({
        id: staffId,
        body: {
          leave_type: type,
          start_date: start,
          end_date: end,
          note: note.trim() || undefined,
        },
      }).unwrap();

      // Warnings never refuse, so the request IS filed and each warning is the
      // second thing said rather than instead of the first.
      toast.success("Leave filed and sent for approval.");
      for (const warning of result.data.warnings) {
        toast.warning(
          warning.code === "OVER_ALLOWANCE"
            ? overAllowanceMessage(warning, { isSelf, personName, typeLabel })
            : warning.message,
          { duration: 10000 },
        );
      }
      onClose();
    } catch (error) {
      const perField = fieldErrorsFor(error, ["leave_type", "start_date", "end_date", "note"]);
      if (Object.keys(perField).length) {
        setErrors(perField);
        return;
      }
      toast.error(
        apiErrorMessage(error, "We could not file that request. Try again."),
      );
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={isSelf ? "Apply for leave" : `Record leave for ${personName}`}
      subtitle={
        isSelf
          ? "Your request goes to whoever your school has appointed to approve leave."
          : "Filed on their behalf. It still goes through the school's approvers."
      }
      saveLabel="File request"
      onSave={() => void save()}
      canSave={canSave}
      saving={saving}
    >
      <div className="grid gap-4">
        <Field
          label="Type of leave"
          required
          error={errors.leave_type}
          hint={hint || undefined}
        >
          <NativeSelect
            aria-label="Type of leave"
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType | "")}
            className="h-9"
          >
            <option value="">Choose a type</option>
            {types.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="First day" required error={errors.start_date}>
          <DatePickerInput
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Last day"
          required
          error={
            errors.end_date ??
            (orderWrong ? "The last day cannot be before the first." : undefined)
          }
          hint={countingNote(rules?.leave)}
        >
          {/* Bounded by the first day, so the calendar cannot offer an earlier one. */}
          <DatePickerInput
            required
            min={start || undefined}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Note" error={errors.note}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Anything the approver should know"
            className="w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>

        <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          This is a request, not a recorded absence. It stays Pending until
          somebody approves it, and if the school has appointed nobody to
          approve leave it waits rather than going through unseen. Going past
          an allowance does not stop it; the approver sees by how much.
        </p>
      </div>
    </DrawerShell>
  );
}
