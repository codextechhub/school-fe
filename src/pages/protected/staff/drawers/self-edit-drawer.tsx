import { useState } from "react";
import { toast } from "sonner";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import { toIsoDate } from "@/components/ui/date-picker-input.utils";
import { NativeSelect } from "@/components/ui/native-select";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { fieldWriteErrors } from "@/components/finance-ui";
import { useUpdateStaffMutation } from "@/redux/services/staff/staff-api";
import type { StaffDetail, StaffUpdate } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { PhotoPicker } from "../../students/photo-picker";

/** The typed details a school may open to self-edit, in the order the form shows them. */
const TEXT_FIELDS = [
  "first_name",
  "middle_name",
  "last_name",
  "gender",
  "date_of_birth",
  "phone",
] as const;

type SelfField = (typeof TEXT_FIELDS)[number];

/**
 * What staff could change about themselves before a school chose, and what a
 * server that does not send `self_editable_fields` still allows.
 */
const DEFAULT_SELF_EDITABLE: readonly string[] = [
  "middle_name",
  "date_of_birth",
  "photo",
  "phone",
];

const LABEL: Record<SelfField, string> = {
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  gender: "Gender",
  date_of_birth: "Date of birth",
  phone: "Phone",
};

/**
 * A member of staff correcting their own details.
 *
 * The school decides which details staff may change about themselves
 * (Settings, Staff), and the person's own record carries that list as
 * `self_editable_fields`. This form offers those and nothing more; a record
 * from a server that does not send the list falls back to the photograph,
 * middle name, date of birth and phone. The job title, hire date, staff ID,
 * posting and the rest of the school's statements about the job are never on
 * the list, whatever a school chooses. Somebody who does hold the update key
 * gets the full Edit staff drawer on their own record instead, and never sees
 * this one.
 *
 * A field shows only when it is on the list AND the record carries it. A
 * school that closes a section to people reading their own record (Settings,
 * Staff profiles) closes it here too, since a value the form cannot show is
 * not one to overwrite blind.
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

  const allowed = new Set(person.self_editable_fields ?? DEFAULT_SELF_EDITABLE);
  const offered = (key: SelfField | "photo") =>
    allowed.has(key) && (key === "photo" ? "photo_url" : key) in person;
  const fromRecord = (key: SelfField) => person[key] ?? "";
  const value = (key: SelfField) => draft[key] ?? fromRecord(key);
  const set = (key: SelfField) => (next: string) => {
    setDraft((current) => ({ ...current, [key]: next }));
    setErrors(({ [key]: _gone, ...rest }) => rest);
  };

  const changed = (Object.keys(draft) as SelfField[]).filter(
    (key) => offered(key) && (draft[key] ?? "") !== fromRecord(key),
  );
  const nothingOffered =
    !offered("photo") && TEXT_FIELDS.every((key) => !offered(key));

  async function save() {
    const body: StaffUpdate = {};
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
        {nothingOffered && (
          <p className="rounded-lg bg-white-03 px-3.5 py-2.5 text-[13px] text-gray-01">
            Your school has not opened any of your details for you to change.
            Ask a school administrator to correct them.
          </p>
        )}
        {offered("photo") && (
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
        {TEXT_FIELDS.filter(offered).map((key) => (
          <Field key={key} label={LABEL[key]} error={errors[key]}>
            {key === "date_of_birth" ? (
              <DatePickerInput
                max={toIsoDate(new Date())}
                value={value(key)}
                onChange={(e) => set(key)(e.target.value)}
                className={inputClass}
              />
            ) : key === "gender" ? (
              <NativeSelect
                aria-label={LABEL[key]}
                value={value(key)}
                onChange={(e) => set(key)(e.target.value)}
                className="h-9"
              >
                <option value="">Not recorded</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </NativeSelect>
            ) : (
              <input
                type={key === "phone" ? "tel" : "text"}
                value={value(key)}
                onChange={(e) => set(key)(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
        ))}
      </div>
    </DrawerShell>
  );
}
