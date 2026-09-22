import { useState } from "react";
import { toast } from "sonner";

import { writeErrorMessage, fieldErrors } from "@/utils/api-error";
import { AccessField, fieldWriteErrors, useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { useUpdateGuardianMutation } from "@/redux/services/students/students-api";
import type { GuardianDetail } from "@/redux/services/students/students-types";

import { DrawerShell, Field, errorInputClass, inputClass } from "../drawers/drawer-shell";

/** The five fields a guardian owns, as opposed to their link to a student. */
const FIELDS = [
  { key: "full_name", label: "Full name", required: true },
  { key: "phone", label: "Phone", hint: "A number the school can reach." },
  { key: "email", label: "Email", hint: "Also the address any parent account is issued to." },
  { key: "occupation", label: "Occupation" },
  { key: "address", label: "Home address" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

/**
 * Correct a guardian's own details.
 *
 * **This is the screen that did not exist.** A guardian's name, phone, email,
 * occupation and address could be written once, at creation, and never
 * corrected - there was no route for it anywhere. A number mistyped while
 * enrolling a child was permanent, and the only way round it was a second
 * record for the same parent, which splits the household and breaks the sibling
 * link the Guardians screen exists to show.
 *
 * Relationship and primary contact are NOT here. Those belong to a link, one
 * per student, so a guardian standing for three children has three of them and
 * editing "the" relationship on this panel would be a question with three
 * answers. They stay on the student's own Guardians tab.
 *
 * Only what changed is sent, so an unchanged save is not an audit entry saying
 * somebody edited a record they did not.
 *
 * The contact fields follow Field Access (`school.guardians`): one the viewer
 * may not read is absent from the record and not on the form, one they may
 * read but not change is greyed and never sent.
 */
export function EditGuardianDrawer({
  guardian,
  open,
  onClose,
}: {
  guardian: GuardianDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<FieldKey, string>>({
    full_name: guardian.full_name,
    phone: guardian.phone ?? "",
    email: guardian.email ?? "",
    occupation: guardian.occupation ?? "",
    address: guardian.address ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [update, { isLoading }] = useUpdateGuardianMutation();
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS, guardian);
  const fields = FIELDS.filter((f) => !access.isHidden(f.key));

  const changed = fields.filter(
    (f) =>
      !access.isReadOnly(f.key) &&
      draft[f.key].trim() !== (guardian[f.key] ?? "").trim(),
  );
  const nameBlank = !draft.full_name.trim();

  async function save() {
    if (!changed.length || nameBlank) return;
    setErrors({});
    try {
      await update({
        id: guardian.id,
        ...Object.fromEntries(changed.map((f) => [f.key, draft[f.key].trim()])),
      }).unwrap();
      toast.success(`${draft.full_name.trim()} updated.`);
      onClose();
    } catch (error) {
      // A field-keyed refusal belongs under its field: the one that actually
      // happens here is an email another guardian already holds, and it names
      // them - which is only useful beside the box you would retype.
      const named = fieldWriteErrors(error) ?? fieldErrors(error);
      if (Object.keys(named).length) setErrors(named);
      else toast.error(writeErrorMessage(error, "We could not save that."));
    }
  }

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title="Edit guardian"
      subtitle={`${guardian.full_name}'s own details. Their relationship to each student stays on that student.`}
      saveLabel="Save changes"
      onSave={save}
      canSave={changed.length > 0 && !nameBlank}
      saving={isLoading}
    >
      <div className="grid gap-4">
        {fields.map((f) => (
          <AccessField key={f.key} access={access} name={f.key}>
            <Field
              label={f.label}
              required={"required" in f ? f.required : undefined}
              error={
                errors[f.key] ??
                (f.key === "full_name" && nameBlank
                  ? "A guardian needs a name."
                  : undefined)
              }
              hint={"hint" in f ? f.hint : undefined}
            >
              <input
                value={draft[f.key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                }
                className={
                  errors[f.key] || (f.key === "full_name" && nameBlank)
                    ? errorInputClass
                    : inputClass
                }
              />
            </Field>
          </AccessField>
        ))}

        {/* Says what will move, so Save is not a leap. The same line the edit
            drawer for a student carries. */}
        <p className="text-xs text-gray-05" aria-live="polite">
          {changed.length === 0
            ? "Nothing changed yet."
            : `${changed.length} ${changed.length === 1 ? "field" : "fields"} will change: ${changed
                .map((f) => f.label.toLowerCase())
                .join(", ")}.`}
        </p>
      </div>
    </DrawerShell>
  );
}
