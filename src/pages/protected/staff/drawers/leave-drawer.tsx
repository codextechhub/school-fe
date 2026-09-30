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
  useUpdateStaffLeaveMutation,
} from "@/redux/services/staff/staff-api";
import type { LeaveType, StaffLeaveRequest, StaffLeaveWrite } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { balanceHint, countingNote, leaveChanges, overAllowanceMessage } from "./leave-copy";

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
 * File leave or correct a pending request on somebody's behalf.
 *
 * **One form behind filing and correction**, with the server enforcing each key.
 * Applying for your own needs `school.leave.apply`, which every member of staff
 * holds; filing somebody else's needs `school.leave.update`. The server decides
 * which by looking at whose record it is, so a second form here would be a
 * second set of rules about who may file what, and the two would drift.
 *
 * A new request goes to the school's approver group and remains pending until
 * somebody decides it. Corrections send only changed fields: sending unchanged
 * dates would make the server recalculate saved days under today's calendar.
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
  request,
  onClose,
}: {
  staffId: number;
  personName: string;
  /** Whose record this is. Changes the wording only; the server picks the key. */
  isSelf: boolean;
  request?: StaffLeaveRequest;
  onClose: () => void;
}) {
  const [file, { isLoading: filing }] = useFileStaffLeaveMutation();
  const [update, { isLoading: updating }] = useUpdateStaffLeaveMutation();
  const saving = filing || updating;
  const rules = useGetStaffRulesQuery().data?.data;
  const leave = useGetStaffLeaveQuery({ id: staffId }).currentData?.data;
  const types = rules?.leave.leave_types.length
    ? (rules.leave.leave_types as { value: LeaveType; label: string }[])
    : FALLBACK_TYPES;

  const [type, setType] = useState<LeaveType | "">(request?.leave_type ?? "");
  const [start, setStart] = useState(request?.start_date ?? "");
  const [end, setEnd] = useState(request?.end_date ?? "");
  const [note, setNote] = useState(request?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const typeLabel = types.find((row) => row.value === type)?.label ?? "";
  const balance = type
    ? leave?.balances?.find((row) => row.leave_type === type)
    : undefined;
  const hint = balanceHint(balance, leave?.balance_session?.name ?? "this session");

  // Both ends are needed, and the end cannot precede the start. Checked here so
  // a reader is not sent to the server to be told something they can see.
  const orderWrong = Boolean(start && end && end < start);
  const next = type ? { leave_type: type, start_date: start, end_date: end, note: note.trim() } : null;
  const changed = !request || (next != null && Object.keys(leaveChanges(request, next)).length > 0);
  const canSave = Boolean(type) && Boolean(start) && Boolean(end) && !orderWrong && changed;

  async function save() {
    if (!type) return;
    try {
      const body: StaffLeaveWrite = {
        leave_type: type,
        start_date: start,
        end_date: end,
        note: note.trim(),
      };
      const result = request
        ? await update({ leaveId: request.id, body: leaveChanges(request, body) }).unwrap()
        : await file({ id: staffId, body }).unwrap();

      toast.success(request ? "Leave request updated." : "Leave filed and sent for approval.");
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
      toast.error(apiErrorMessage(error, request
        ? "We could not update that request. Try again."
        : "We could not file that request. Try again."));
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={request ? `Edit leave for ${personName}` : isSelf ? "Apply for leave" : `Record leave for ${personName}`}
      subtitle={
        request
          ? "Changes to a pending request are recorded in its history."
          : isSelf
          ? "Your request goes to whoever your school has appointed to approve leave."
          : "Filed on their behalf. It still goes through the school's approvers."
      }
      saveLabel={request ? "Save changes" : "File request"}
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

        {!request && <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          The leave remains pending until an approver decides it.
        </p>}
      </div>
    </DrawerShell>
  );
}
