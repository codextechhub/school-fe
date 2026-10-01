import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useAddStaffQualificationMutation,
  useDeleteStaffQualificationMutation,
  useUpdateStaffQualificationMutation,
} from "@/redux/services/staff/staff-api";
import type { StaffQualification, StaffQualificationWrite } from "@/redux/services/staff/staff-types";
import { apiErrorMessage, fieldErrorsFor } from "@/utils/api-error";
import { ConfirmDialog } from "../../students/drawers/confirm-dialog";
import { DrawerShell, Field, inputClass } from "../../students/drawers/drawer-shell";

/**
 * A qualification is the school's recorded claim. A staff member may read it,
 * but only a record editor may create or correct it. Saving uses the same
 * fields and validation as the staff creation form and makes no verification
 * claim.
 */
export function QualificationEditor({
  staffId, row, onClose,
}: {
  staffId: number;
  row?: StaffQualification;
  onClose: () => void;
}) {
  const [qualification, setQualification] = useState(row?.qualification ?? "");
  const [institution, setInstitution] = useState(row?.institution ?? "");
  const [year, setYear] = useState(row?.year_obtained?.toString() ?? "");
  const [note, setNote] = useState(row?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [add, adding] = useAddStaffQualificationMutation();
  const [update, updating] = useUpdateStaffQualificationMutation();
  const saving = adding.isLoading || updating.isLoading;
  const currentYear = new Date().getFullYear();
  const validYear = !year || (/^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= currentYear);
  const body: StaffQualificationWrite = {
    qualification: qualification.trim(),
    institution: institution.trim(),
    year_obtained: year ? Number(year) : null,
    note: note.trim(),
  };

  async function save() {
    setErrors({});
    try {
      if (row) {
        await update({ qualificationId: row.id, body }).unwrap();
      } else {
        await add({ id: staffId, body }).unwrap();
      }
      toast.success(row ? "Qualification updated." : "Qualification added.");
      onClose();
    } catch (error) {
      const fields = fieldErrorsFor(error, ["qualification", "institution", "year_obtained", "note"]);
      if (Object.keys(fields).length) setErrors(fields);
      else toast.error(apiErrorMessage(error, "We could not save that qualification."));
    }
  }

  return (
    <DrawerShell
      open onClose={onClose}
      title={row ? "Edit qualification" : "Add qualification"}
      subtitle="Record what the school holds. This does not verify the qualification."
      saveLabel={row ? "Save changes" : "Add qualification"}
      onSave={() => void save()}
      canSave={Boolean(qualification.trim()) && validYear}
      saving={saving}
    >
      <div className="grid gap-4">
        <Field label="Qualification" required error={errors.qualification}>
          <input className={inputClass} value={qualification} maxLength={200} onChange={(event) => setQualification(event.target.value)} />
        </Field>
        <Field label="Institution" error={errors.institution}>
          <input className={inputClass} value={institution} maxLength={200} onChange={(event) => setInstitution(event.target.value)} />
        </Field>
        <Field label="Year obtained" error={errors.year_obtained || (!validYear ? `Enter a year from 1900 to ${currentYear}.` : undefined)}>
          <input className={inputClass} type="number" min={1900} max={currentYear} value={year} onChange={(event) => setYear(event.target.value)} />
        </Field>
        <Field label="Note" error={errors.note} hint="Optional school record, visible to people allowed to view qualifications.">
          <textarea className={inputClass} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
    </DrawerShell>
  );
}

/** Removal asks again because the qualification leaves the live record. */
export function QualificationRemove({ row, onClose }: { row: StaffQualification; onClose: () => void }) {
  const [remove, { isLoading }] = useDeleteStaffQualificationMutation();

  async function confirm() {
    try {
      await remove(row.id).unwrap();
      toast.success("Qualification removed. Its change history remains available.");
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error, "We could not remove that qualification."));
    }
  }

  return <ConfirmDialog
    open onCancel={onClose} onConfirm={() => void confirm()}
    title="Remove qualification?"
    body={`${row.qualification} will leave this person's current record. Its dated change history will remain.`}
    confirmLabel="Remove qualification" busy={isLoading}
  />;
}

export function QualificationActions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return <div className="mt-3 flex flex-wrap gap-2">
    <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
    <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>
  </div>;
}
