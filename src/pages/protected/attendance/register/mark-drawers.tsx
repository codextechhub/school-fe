import { useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import {
  useGetReasonCodesQuery,
  useRequestCorrectionMutation,
  useSetMarkMutation,
} from "@/redux/services/attendance/attendance-api";
import type {
  AttendanceMark,
  RegisterKey,
  RegisterRow,
} from "@/redux/services/attendance/attendance-types";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";

import { ChoiceChips } from "../components/choice-chips";
import { MARKS } from "../marks";

/** Which drawer is open, and for whose row. */
export type MarkDrawer =
  | { kind: "late"; row: RegisterRow }
  | { kind: "excused"; row: RegisterRow }
  | { kind: "correction"; row: RegisterRow };

/**
 * The three drawers a register row opens.
 *
 * Present and Absent are one tap and need no drawer. Late needs the time the
 * child arrived, Excused needs one of the school's reasons, and a mark on a
 * closed day can only change through a request an administrator decides.
 * Each drawer stays open when the server refuses it, with the refusal shown,
 * so nothing typed is lost.
 */
export function MarkDrawers({
  drawer,
  register,
  dateLabel,
  onClose,
}: {
  drawer: MarkDrawer | null;
  register: RegisterKey;
  dateLabel: string;
  onClose: () => void;
}) {
  if (!drawer) return null;
  const subtitle = `${drawer.row.name} · ${dateLabel}`;
  if (drawer.kind === "late") {
    return <LateDrawer key={drawer.row.student_id} row={drawer.row} register={register} subtitle={subtitle} onClose={onClose} />;
  }
  if (drawer.kind === "excused") {
    return <ExcusedDrawer key={drawer.row.student_id} row={drawer.row} register={register} subtitle={subtitle} onClose={onClose} />;
  }
  return <CorrectionDrawer key={drawer.row.student_id} row={drawer.row} register={register} subtitle={subtitle} onClose={onClose} />;
}

type DrawerProps = {
  row: RegisterRow;
  register: RegisterKey;
  subtitle: string;
  onClose: () => void;
};

/**
 * Late: the arrival time, starting at the time the drawer opened.
 *
 * A teacher marking a child as they walk in saves it as it stands; one
 * marking later types the time the child actually arrived.
 */
function LateDrawer({ row, register, subtitle, onClose }: DrawerProps) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const { now, formatTime } = useSchoolDisplay();
  const [time, setTime] = useState(() => (row.mark === "L" && row.arrived_at) || now().time);
  const [note, setNote] = useState(row.note ?? "");
  const [save, { isLoading }] = useSetMarkMutation();
  const noteWritable = !access.isHidden("note") && !access.isReadOnly("note");

  const submit = async () => {
    const result = await save({
      ...register,
      studentId: row.student_id,
      body: { mark: "L", arrived_at: time, ...(noteWritable ? { note: note.trim() } : {}) },
    });
    if ("error" in result) return;
    toast.success(`${row.name} marked Late`, { description: `Arrived ${formatTime(time)}.` });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Late arrival"
      subtitle={subtitle}
      saveLabel="Mark late"
      onSave={() => void submit()}
      canSave={!!time}
      saving={isLoading}
    >
      <Field label="Arrival time" required>
        <TimeInput value={time} onChange={setTime} aria-label="Arrival time" />
      </Field>
      <NoteField
        hidden={access.isHidden("note")}
        readOnly={access.isReadOnly("note")}
        label="Note"
        value={note}
        onChange={setNote}
        placeholder="For example, held up by traffic"
      />
      <Hint>Late counts as present, and is counted separately as well. Nothing is sent to the guardian.</Hint>
    </DrawerShell>
  );
}

/** Excused: one of the school's live reasons, and a note when the reason asks for one. */
function ExcusedDrawer({ row, register, subtitle, onClose }: DrawerProps) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const { data } = useGetReasonCodesQuery({ active: true });
  const reasons = data?.data ?? [];
  const [reasonId, setReasonId] = useState<number | null>(row.mark === "E" ? row.reason_code ?? null : null);
  const [note, setNote] = useState(row.note ?? "");
  const [save, { isLoading }] = useSetMarkMutation();

  const reason = reasons.find((code) => code.id === reasonId) ?? null;
  const noteWritable = !access.isHidden("note") && !access.isReadOnly("note");
  const needsNote = !!reason?.requires_note;
  const canSave = !!reason && (!needsNote || !!note.trim());

  const submit = async () => {
    if (!reason) return;
    const result = await save({
      ...register,
      studentId: row.student_id,
      body: { mark: "E", reason_code: reason.id, ...(noteWritable ? { note: note.trim() } : {}) },
    });
    if ("error" in result) return;
    toast.success(`${row.name} marked Excused`, { description: `${reason.name}.` });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Excused absence"
      subtitle={subtitle}
      saveLabel="Mark excused"
      onSave={() => void submit()}
      canSave={canSave}
      saving={isLoading}
    >
      <Field label="Reason" required>
        <ChoiceChips
          ariaLabel="Reason"
          options={reasons.map((code) => ({ value: code.id, label: code.name }))}
          value={reasonId}
          onChange={setReasonId}
        />
      </Field>
      <NoteField
        hidden={access.isHidden("note")}
        readOnly={access.isReadOnly("note")}
        label={needsNote ? `Note (needed for ${reason?.name})` : "Note"}
        required={needsNote}
        value={note}
        onChange={setNote}
        placeholder="For example, mother called at 7:30 am, fever"
      />
      <Hint>Excused sends nothing to the guardian. The reasons are the school&apos;s own list.</Hint>
    </DrawerShell>
  );
}

/**
 * A request to change a mark on a closed day.
 *
 * Nothing on the register moves until an attendance administrator decides.
 * Every request names a reason. A request for Late also says when the child
 * arrived, because a late mark always carries its time; the box starts empty,
 * since the day being corrected is already over.
 */
function CorrectionDrawer({ row, register, subtitle, onClose }: DrawerProps) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_CORRECTION);
  const { data } = useGetReasonCodesQuery({ active: true });
  const reasons = data?.data ?? [];
  const [toMark, setToMark] = useState<AttendanceMark | null>(null);
  const [reasonId, setReasonId] = useState<number | null>(null);
  // Empty, not now: the day being corrected is over, so the time the drawer
  // opened says nothing about when the child arrived.
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [request, { isLoading }] = useRequestCorrectionMutation();

  const reason = reasons.find((code) => code.id === reasonId) ?? null;
  const needsNote = !!reason?.requires_note;
  const noteWritable = !access.isHidden("note") && !access.isReadOnly("note");
  const canSave =
    !!toMark && !!reason && (!needsNote || !!note.trim()) && (toMark !== "L" || !!time);
  const marks = (Object.keys(MARKS) as AttendanceMark[]).filter((mark) => mark !== row.mark);

  const submit = async () => {
    if (!toMark || !reason) return;
    const result = await request({
      register_class_id: register.classId,
      date: register.date,
      student_id: row.student_id,
      to_mark: toMark,
      reason_code: reason.id,
      ...(toMark === "L" ? { arrived_at: time } : {}),
      ...(noteWritable ? { note: note.trim() } : {}),
    });
    if ("error" in result) return;
    toast.success("Correction requested", {
      description: "It is waiting for an attendance administrator.",
    });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Request a correction"
      subtitle={subtitle}
      saveLabel="Send request"
      onSave={() => void submit()}
      canSave={canSave}
      saving={isLoading}
    >
      <Field label="Proposed mark" required>
        <ChoiceChips
          ariaLabel="Proposed mark"
          options={marks.map((mark) => ({ value: mark, label: MARKS[mark].label }))}
          value={toMark}
          onChange={setToMark}
        />
      </Field>
      {toMark === "L" && (
        <Field label="Arrival time" required>
          <TimeInput value={time} onChange={setTime} aria-label="Arrival time" />
        </Field>
      )}
      <Field label="Reason" required>
        <ChoiceChips
          ariaLabel="Reason"
          options={reasons.map((code) => ({ value: code.id, label: code.name }))}
          value={reasonId}
          onChange={setReasonId}
        />
      </Field>
      <NoteField
        hidden={access.isHidden("note")}
        readOnly={access.isReadOnly("note")}
        label="Why the mark should change"
        required={needsNote}
        value={note}
        onChange={setNote}
        placeholder="For example, his mother rang to say he was at a hospital appointment"
      />
      <Hint>The day is closed, so this waits for an attendance administrator. The original mark is kept either way.</Hint>
    </DrawerShell>
  );
}

/**
 * The note box, as Field Access allows it: absent when hidden, shown greyed
 * and never sent when read-only.
 */
function NoteField({
  hidden,
  readOnly,
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  hidden: boolean;
  readOnly: boolean;
  label: string;
  required?: boolean;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  if (hidden) return null;
  return (
    <Field label={label} required={required && !readOnly}>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={300}
        disabled={readOnly}
        rows={3}
      />
    </Field>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-06">{children}</p>;
}
