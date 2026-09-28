import { useState } from "react";
import { toast } from "sonner";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import { toIsoDate } from "@/components/ui/date-picker-input.utils";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { fieldWriteErrors } from "@/components/finance-ui";
import { useUpdateStaffMutation } from "@/redux/services/staff/staff-api";
import type { StaffDetail } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { PhotoPicker } from "../../students/photo-picker";

/** The details a person may correct about themselves, as the server lists them. */
type SelfField = "middle_name" | "date_of_birth" | "phone";

/**
 * A member of staff correcting their own details.
 *
 * The server lets anybody change four things about themselves without the
 * staff update key: their photograph, middle name, date of birth and phone
 * (`SELF_EDITABLE_FIELDS`). Everything else on a record, the job title and hire
 * date above all, is the school's to change, so this form offers those four and
 * nothing more. Somebody who does hold the update key gets the full Edit staff
 * drawer on their own record instead, and never sees this one.
 *
 * A field shows only when the record carries it. A school that closes a
 * section to people reading their own record (Settings, Staff profiles) closes
 * it here too, since a value the form cannot show is not one to overwrite
 * blind.
 *
 * The photograph saves the moment it is picked, as it does on the full drawer.
 */
export function SelfEditDrawer({
  person,
  onClose,
}: {
  person: StaffDetail;
  onClose: () => void;
}) {
  const [update, { isLoading: saving }] = useUpdateStaffMutation();
  const [updatePhoto, { isLoading: savingPhoto }] = useUpdateStaffMutation();
  const [draft, setDraft] = useState<Partial<Record<SelfField, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const carried = (key: SelfField | "photo_url") => key in person;
  const fromRecord = (key: SelfField) => person[key] ?? "";
  const value = (key: SelfField) => draft[key] ?? fromRecord(key);
  const set = (key: SelfField) => (next: string) => {
    setDraft((current) => ({ ...current, [key]: next }));
    setErrors(({ [key]: _gone, ...rest }) => rest);
  };

  const changed = (Object.keys(draft) as SelfField[]).filter(
    (key) => (draft[key] ?? "") !== fromRecord(key),
  );

  async function save() {
    const body: { middle_name?: string; date_of_birth?: string | null; phone?: string } = {};
    for (const key of changed) {
      const next = (draft[key] ?? "").trim();
      // A cleared date is null: the server reads "" as an invalid date.
      if (key === "date_of_birth") body.date_of_birth = next || null;
      else body[key] = next;
    }
    try {
      await update({ id: person.id, body }).unwrap();
      toast.success("Your details are updated.");
      onClose();
    } catch (error) {
      const perField = fieldWriteErrors(error) ?? fieldErrors(error);
      if (Object.keys(perField).length) {
        setErrors(perField);
        return;
      }
      toast.error(apiErrorMessage(error, "We could not save that. Try again."));
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Update my details"
      subtitle="Your job title, hire date and posting are changed by a school administrator."
      saveLabel="Save changes"
      onSave={() => void save()}
      canSave={changed.length > 0}
      saving={saving}
    >
      <div className="grid gap-4">
        {carried("photo_url") && (
          <div className="flex items-center gap-3.5">
            <PhotoPicker
              name={person.full_name}
              photoUrl={person.photo_url ?? ""}
              saving={savingPhoto}
              editable={!person.as_at}
              permission={null}
              size="size-16"
              textClassName="text-[21px]"
              onPick={(file) => {
                const body = new FormData();
                body.append("photo", file);
                return updatePhoto({ id: person.id, body }).unwrap();
              }}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-black-01">Photograph</p>
              <p className="mt-0.5 text-xs text-gray-05">
                Select the camera to add or replace it. It saves straight away.
              </p>
            </div>
          </div>
        )}
        {carried("middle_name") && (
          <Field label="Middle name" error={errors.middle_name}>
            <input
              value={value("middle_name")}
              onChange={(e) => set("middle_name")(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
        {carried("date_of_birth") && (
          <Field label="Date of birth" error={errors.date_of_birth}>
            <DatePickerInput
              max={toIsoDate(new Date())}
              value={value("date_of_birth")}
              onChange={(e) => set("date_of_birth")(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
        {carried("phone") && (
          <Field label="Phone" error={errors.phone}>
            <input
              type="tel"
              value={value("phone")}
              onChange={(e) => set("phone")(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
      </div>
    </DrawerShell>
  );
}
