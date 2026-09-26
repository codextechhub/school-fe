import { useState } from "react";
import { toast } from "sonner";

import { writeErrorMessage, fieldErrors } from "@/utils/api-error";
import { AccessField, fieldWriteErrors, useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { useUpdateGuardianMutation } from "@/redux/services/students/students-api";
import type { GuardianDetail } from "@/redux/services/students/students-types";

import { DrawerShell, Field, errorInputClass, inputClass } from "../drawers/drawer-shell";

/** The fields a guardian owns, as opposed to their link to a student. */
const FIELDS = [
  { key: "first_name", label: "First name", required: true },
  { key: "middle_name", label: "Middle name" },
  { key: "last_name", label: "Last name", required: true },
  { key: "phone", label: "Phone", hint: "A number the school can reach." },
  { key: "email", label: "Email", hint: "Also the address any parent account is issued to." },
  { key: "occupation", label: "Occupation" },
  { key: "address", label: "Home address" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

const NAME_KEYS: FieldKey[] = ["first_name", "middle_name", "last_name"];

/**
 * Correct a guardian's own details.
 *
 * Relationship and primary contact are not here. Those belong to a link, one
 * per student, so a guardian standing for three children has three of them and
 * editing "the" relationship on this panel would be a question with three
 * answers. They stay on the student's own Guardians tab.
 *
 * Only what changed is sent, so an unchanged save is not an audit entry saying
 * somebody edited a record they did not.
 *
 * The name is corrected in its parts. A guardian whose name was split by the
 * platform from one line (`name_needs_review`) opens with that line shown and
 * the parts to check; saving sends the parts even when nobody changed them,
 * because saving is what confirms the split.
 *
 * Every field follows Field Access (`school.guardians`): one the viewer may not
 * read is absent from the record and not on the form, one they may read but
 * not change is greyed and never sent.
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
    first_name: guardian.first_name ?? "",
    middle_name: guardian.middle_name ?? "",
    last_name: guardian.last_name ?? "",
    phone: guardian.phone ?? "",
    email: guardian.email ?? "",
    occupation: guardian.occupation ?? "",
    address: guardian.address ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [update, { isLoading }] = useUpdateGuardianMutation();
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS, guardian);
  const fields = FIELDS.filter((f) => !access.isHidden(f.key));
  const writable = (key: FieldKey) => !access.isHidden(key) && !access.isReadOnly(key);

  const changed = fields.filter(
    (f) => writable(f.key) && draft[f.key].trim() !== (guardian[f.key] ?? "").trim(),
  );
  const confirming =
    guardian.name_needs_review && NAME_KEYS.some((key) => writable(key));
  const blank = (key: "first_name" | "last_name") =>
    writable(key) && !draft[key].trim();
  const nameBlank = blank("first_name") || blank("last_name");
  const sendable = confirming
    ? [...new Set([...changed.map((f) => f.key), ...NAME_KEYS.filter(writable)])]
    : changed.map((f) => f.key);

  async function save() {
    if (!sendable.length || nameBlank) return;
    setErrors({});
    try {
      const response = await update({
        id: guardian.id,
        ...Object.fromEntries(sendable.map((key) => [key, draft[key].trim()])),
      }).unwrap();
      toast.success(response.message ?? "Guardian updated.");
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

  const summary =
    changed.length === 0
      ? confirming
        ? "Saving confirms the name as shown."
        : "Nothing changed yet."
      : `${changed.length} ${changed.length === 1 ? "field" : "fields"} will change: ${changed
          .map((f) => f.label.toLowerCase())
          .join(", ")}.`;

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={confirming ? "Check guardian's name" : "Edit guardian"}
      subtitle={`${guardian.full_name}'s own details. Their relationship to each student stays on that student.`}
      saveLabel={confirming && changed.length === 0 ? "Confirm name" : "Save changes"}
      onSave={save}
      canSave={sendable.length > 0 && !nameBlank}
      saving={isLoading}
    >
      <div className="grid gap-4">
        {confirming && (
          <div
            role="note"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900"
          >
            This name was entered on one line as{" "}
            <span className="font-semibold">“{guardian.full_name}”</span> and split
            automatically. Check which part is the first, middle and last name, then save.
          </div>
        )}
        {fields.map((f) => (
          <AccessField key={f.key} access={access} name={f.key}>
            <Field
              label={f.label}
              required={"required" in f ? f.required : undefined}
              error={
                errors[f.key] ??
                ((f.key === "first_name" || f.key === "last_name") && blank(f.key)
                  ? `A guardian needs a ${f.label.toLowerCase()}.`
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
                  errors[f.key] ||
                  ((f.key === "first_name" || f.key === "last_name") && blank(f.key))
                    ? errorInputClass
                    : inputClass
                }
              />
            </Field>
          </AccessField>
        ))}

        <p className="text-xs text-gray-05" aria-live="polite">
          {summary}
        </p>
      </div>
    </DrawerShell>
  );
}
