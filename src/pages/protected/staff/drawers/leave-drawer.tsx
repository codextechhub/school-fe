import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { AccessField, allWritable, fieldWriteErrors, useFieldAccess } from "@/components/finance-ui";
import { NativeSelect } from "@/components/ui/native-select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useDebounce } from "@/hooks/use-debounce";
import { CREATING, FIELD_RESOURCE } from "@/lib/field-resources";
import { apiErrorMessage, fieldErrorsFor } from "@/utils/api-error";
import {
  useFileStaffLeaveMutation,
  useGetStaffLeaveQuery,
  useGetStaffLeavePreviewQuery,
  useGetStaffRulesQuery,
  useUpdateStaffLeaveMutation,
} from "@/redux/services/staff/staff-api";
import type { LeaveType, StaffLeaveRequest, StaffLeaveWrite } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { LeaveBalanceBox } from "./leave-balance-box";
import { countingNote, leaveChanges, overAllowanceMessage } from "./leave-copy";

/** How long the dates settle before the server is asked to count them. */
const PREVIEW_DELAY_MS = 300;

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
 * about counting for a reader who cannot read them.
 *
 * **A balance box follows the chosen type and dates.** Once a type is chosen it
 * shows the person's allowance, days taken, pending and remaining for the
 * current session, from the Leave tab's own query. Once the type and both days
 * are set it adds the days the request would count as, what that leaves, and
 * the day they return. The server counts those days, because they depend on the
 * school's working days and its calendar closures at that person's branch, so
 * the dates are debounced and asked for through the preview endpoint, with the
 * request's own id excluded while one is being edited. If the preview fails the
 * figures are left out and filing still works: the server counts again on
 * submit.
 *
 * **Going past an allowance warns and never refuses.** The box says how many
 * days over a request would be, and a filing that goes over is filed and then
 * said plainly; the approver decides.
 *
 * **Field Access** (`school.leave`) decides what the form offers. A field the
 * reader may not read is absent, including from the box; one they may not
 * change is greyed and left out of the request body. The type and both days
 * are open on create, so filing offers them even to a role that may not correct
 * them afterwards; a correction follows the write switches. Filing is not
 * offered at all when the reader may not give the type or either day.
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
  const access = useFieldAccess(FIELD_RESOURCE.LEAVE, request ?? null);
  // Filing is a create: the type and the days are open on create even where
  // the role may not correct them afterwards.
  const asked = request ? undefined : CREATING;

  const typeLabel = types.find((row) => row.value === type)?.label ?? "";
  const balance = type
    ? leave?.balances?.find((row) => row.leave_type === type)
    : undefined;

  // Both ends are needed, and the end cannot precede the start. Checked here so
  // a reader is not sent to the server to be told something they can see.
  const orderWrong = Boolean(start && end && end < start);
  const datesReady = Boolean(type && start && end && !orderWrong);

  const settledType = useDebounce(type, PREVIEW_DELAY_MS);
  const settledStart = useDebounce(start, PREVIEW_DELAY_MS);
  const settledEnd = useDebounce(end, PREVIEW_DELAY_MS);
  const settling = type !== settledType || start !== settledStart || end !== settledEnd;
  const previewReady = Boolean(settledType && settledStart && settledEnd && settledEnd >= settledStart);
  const previewQuery = useGetStaffLeavePreviewQuery(
    {
      id: staffId,
      leave_type: (settledType || "OTHER") as LeaveType,
      start_date: settledStart,
      end_date: settledEnd,
      ...(request && { exclude: request.id }),
    },
    { skip: !previewReady },
  );
  const preview = datesReady && previewReady && !settling && !previewQuery.isError
    ? previewQuery.currentData?.data
    : undefined;
  const counting = datesReady && !preview && !previewQuery.isError;

  // A reader who cannot give the type or a day cannot file; one who can only
  // change some of them is asked for just those.
  const mayFile = Boolean(request) || allWritable(access, ["leave_type", "start_date", "end_date"], {}, asked);
  const filled = (name: string, value: string) => access.isReadOnly(name, asked) || Boolean(value);
  const next = { leave_type: type as LeaveType, start_date: start, end_date: end, note: note.trim() };
  const changed = !request || Object.keys(access.writableOnly(leaveChanges(request, next), asked)).length > 0;
  const canSave =
    mayFile &&
    filled("leave_type", type) &&
    filled("start_date", start) &&
    filled("end_date", end) &&
    !orderWrong &&
    changed;

  async function save() {
    if (!mayFile || (!type && !request)) return;
    try {
      const body: StaffLeaveWrite = {
        leave_type: type as LeaveType,
        start_date: start,
        end_date: end,
        note: note.trim(),
      };
      const result = request
        ? await update({ leaveId: request.id, body: access.writableOnly(leaveChanges(request, body), asked) }).unwrap()
        : await file({ id: staffId, body: access.writableOnly(body, asked) }).unwrap();

      toast.success(request ? "Leave request updated." : "Leave filed and sent for approval.");
      for (const warning of result.data.warnings ?? []) {
        toast.warning(
          warning.code === "OVER_ALLOWANCE"
            ? overAllowanceMessage(warning, { isSelf, personName, typeLabel })
            : warning.message,
          { duration: 10000 },
        );
      }
      onClose();
    } catch (error) {
      const denied = fieldWriteErrors(error);
      if (denied) {
        setErrors({ ...denied });
        return;
      }
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
        <AccessField access={access} name="leave_type" creating={request ? undefined : true}>
          <Field label="Type of leave" required error={errors.leave_type}>
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
        </AccessField>

        <AccessField access={access} name="start_date" creating={request ? undefined : true}>
          <Field label="First day" required error={errors.start_date}>
            <DatePickerInput
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>

        <AccessField access={access} name="end_date" creating={request ? undefined : true}>
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
        </AccessField>

        {type && (
          <LeaveBalanceBox
            typeLabel={typeLabel}
            row={balance}
            sessionName={leave?.balance_session?.name}
            preview={preview}
            counting={counting}
          />
        )}

        <AccessField access={access} name="note" creating={request ? undefined : true}>
          <Field label="Note" error={errors.note}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Anything the approver should know"
              className="w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
        </AccessField>

        {!mayFile && (
          <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
            <Info className="mt-px size-3.5 shrink-0 text-primary" />
            Your role cannot give every detail a leave request needs, so one cannot be filed here.
          </p>
        )}

        {!request && <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          The leave remains pending until an approver decides it.
        </p>}
      </div>
    </DrawerShell>
  );
}
