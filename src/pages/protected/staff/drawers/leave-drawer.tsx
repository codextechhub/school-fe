import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { NativeSelect } from "@/components/ui/native-select";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { useFileStaffLeaveMutation } from "@/redux/services/staff/staff-api";
import type { LeaveType } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";

const TYPES: { value: LeaveType; label: string }[] = [
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
 * holds; filing somebody else's needs `school.leave.manage`. The server decides
 * which by looking at whose record it is, so a second form here would be a
 * second set of rules about who may file what, and the two would drift.
 *
 * **It is filed, not recorded.** The request goes to the school's own approver
 * group on the workflow engine and comes back Pending; it is not an absence
 * until somebody decides it. A school whose group is still empty gets a request
 * that parks rather than one approved unseen, and the drawer says so - the
 * alternative is a person watching Pending for a week with no idea why.
 *
 * **No balance, and none is asked for.** Nothing anywhere records an
 * entitlement to count against, so this collects dates and a reason and makes
 * no claim about how many days remain.
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

  const [type, setType] = useState<LeaveType | "">("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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

      // Overlaps warn and do not refuse, so the request IS filed and the
      // warning is the second thing said rather than instead of the first.
      toast.success("Leave filed and sent for approval.");
      for (const warning of result.data.warnings) {
        toast.warning(warning.message);
      }
      onClose();
    } catch (error) {
      const perField = fieldErrors(error);
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
        <Field label="Type of leave" required error={errors.leave_type}>
          <NativeSelect
            aria-label="Type of leave"
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType | "")}
            className="h-9"
          >
            <option value="">Choose a type</option>
            {TYPES.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="First day" required error={errors.start_date}>
          <input
            type="date"
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
        >
          <input
            type="date"
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
          approve leave it waits rather than going through unseen.
        </p>
      </div>
    </DrawerShell>
  );
}
