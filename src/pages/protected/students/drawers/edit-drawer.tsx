import { useMemo, useState } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { writeErrorMessage } from "@/utils/api-error";
import {
  AccessField,
  fieldWriteErrors,
  useFieldAccess,
  type FieldErrors,
} from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { useUpdateStudentMutation } from "@/redux/services/students/students-api";
import type {
  StudentDetail,
  StudentWrite,
} from "@/redux/services/students/students-types";

import { DrawerShell, Field, errorInputClass, inputClass } from "./drawer-shell";

// The fields, grouped the way the design groups them, with the label used both
// on the form and in the "what changed" line - so the two can never disagree.
const SECTIONS = {
  bio: [
    { key: "first_name", label: "First name" },
    { key: "middle_name", label: "Middle name" },
    { key: "last_name", label: "Last name" },
    { key: "date_of_birth", label: "Date of birth", type: "date" },
    { key: "gender", label: "Gender", type: "gender" },
    { key: "nationality", label: "Nationality" },
    { key: "state_of_origin", label: "State of origin" },
  ],
  contact: [
    { key: "address", label: "Home address" },
    { key: "phone", label: "Student phone" },
    { key: "email", label: "Student email", type: "email" },
  ],
  admission: [
    { key: "student_number", label: "Admission number" },
    { key: "enrolment_date", label: "Admission date", type: "date" },
    { key: "previous_school", label: "Previous school" },
  ],
  medical: [
    { key: "blood_group", label: "Blood group" },
    { key: "allergies", label: "Allergies" },
    { key: "conditions", label: "Conditions" },
    { key: "emergency_contact_name", label: "Emergency contact" },
    { key: "emergency_contact_phone", label: "Emergency phone" },
  ],
} as const;

export type EditSectionKey = keyof typeof SECTIONS;
type FieldKey = keyof StudentWrite;

const TABS: { value: EditSectionKey; label: string }[] = [
  { value: "bio", label: "Personal" },
  { value: "contact", label: "Contact" },
  { value: "admission", label: "School" },
  { value: "medical", label: "Health" },
];

/** Under 2 or over 25 is a typed year, not a pupil. Matches the backend's rule. */
function dobProblem(value: string): string {
  if (!value) return "A date of birth is required.";
  const today = new Date().toISOString().slice(0, 10);
  if (value > today) return "That date is in the future.";
  const years = Number(today.slice(0, 4)) - Number(value.slice(0, 4));
  if (years < 2) return "That would make the student under 2 years old.";
  if (years > 25) return "That would make the student over 25. Check the year.";
  return "";
}

/**
 * Edit a record.
 *
 * **Class and status are not here, and the form says so.** Each moves through
 * its own drawer so it keeps its reason, its effective date and its own audit
 * line. The backend's write serializer refuses both, so putting them here would
 * be a field that looks editable and 400s.
 *
 * **Only what changed is sent.** A PATCH of every field would rewrite values
 * the user never touched, and an audit line would name them.
 *
 * **Field Access decides what is on the form.** The record says which fields
 * this viewer may read (the rest are absent from it and not drawn here) and,
 * through `_read_only_fields`, which of those they may not change: those are
 * shown greyed and disabled, and the body is filtered through `writableOnly`
 * so one is never sent. A refusal the backend still returns (403
 * `field_write_denied`) is shown under the fields it names.
 */
export function EditDrawer({
  student,
  open,
  onClose,
  initialSection = "bio",
}: {
  student: StudentDetail;
  open: boolean;
  onClose: () => void;
  initialSection?: EditSectionKey;
}) {
  const [section, setSection] = useState<EditSectionKey>(initialSection);
  const [draft, setDraft] = useState<Partial<StudentWrite>>({});
  const [update, { isLoading }] = useUpdateStudentMutation();
  const access = useFieldAccess(FIELD_RESOURCE.STUDENTS, student);
  const [refused, setRefused] = useState<FieldErrors | null>(null);

  const value = (key: FieldKey): string => {
    if (key in draft) return String(draft[key] ?? "");
    const current = (student as unknown as Record<string, unknown>)[key];
    return current == null ? "" : String(current);
  };

  const problems = useMemo(() => {
    const out: Partial<Record<FieldKey, string>> = {};
    if (!value("first_name").trim()) out.first_name = "A first name is required.";
    if (!value("last_name").trim()) out.last_name = "A last name is required.";
    const dob = dobProblem(value("date_of_birth"));
    if (dob) out.date_of_birth = dob;
    if (!value("gender")) out.gender = "Pick a gender.";
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, student]);

  // What actually changed, so the line names fields rather than saying "edited".
  const changed = useMemo(() => {
    const all = [
      ...SECTIONS.bio,
      ...SECTIONS.contact,
      ...SECTIONS.admission,
      ...SECTIONS.medical,
    ];
    return all.filter((f) => {
      if (!(f.key in draft) || access.isReadOnly(f.key)) return false;
      const before = (student as unknown as Record<string, unknown>)[f.key];
      return String(draft[f.key as FieldKey] ?? "").trim() !== String(before ?? "").trim();
    });
  }, [access, draft, student]);

  const valid = Object.keys(problems).length === 0 && changed.length > 0;

  async function save() {
    if (!valid) return;
    // Built by assignment through a mutable record rather than keyed writes:
    // StudentWrite's fields are not all `string` (gender is a union), so a
    // per-key write cannot be proven sound without narrowing each one, and the
    // values are all strings off the same form anyway.
    const body: Record<string, string> = {};
    for (const f of changed) {
      body[f.key] = String(draft[f.key as FieldKey] ?? "").trim();
    }
    setRefused(null);
    try {
      await update({
        id: student.id,
        ...(access.writableOnly(body) as Partial<StudentWrite>),
      }).unwrap();
      toast.success(`${student.full_name}'s record updated.`);
      setDraft({});
      onClose();
    } catch (error) {
      const denied = fieldWriteErrors(error);
      if (denied) setRefused(denied);
      else toast.error(writeErrorMessage(error, "We could not save those changes."));
    }
  }

  const fields = SECTIONS[section].filter((f) => !access.isHidden(f.key));

  return (
    <DrawerShell
      open={open}
      onClose={() => {
        setDraft({});
        setRefused(null);
        onClose();
      }}
      title="Edit record"
      subtitle={`${student.full_name} · ${student.student_number || "no admission number"}`}
      saveLabel="Save changes"
      onSave={save}
      canSave={valid}
      saving={isLoading}
    >
      {/* The active section was marked by a pale tint on a pale chip, which
          at a glance is three identical pills - so the reader had to read the
          form to work out which one they were on. SegmentedToggle is what the
          rest of the app uses, and it SLIDES the marker, so switching sections
          is visible as movement rather than as a colour you have to compare. */}
      <div className="mb-4 max-w-full overflow-x-auto">
        <SegmentedToggle
          value={section}
          options={TABS}
          onChange={setSection}
          ariaLabel="Record section"
        />
      </div>

      <div className="grid gap-3.5">
        {fields.map((f) => {
          const key = f.key as FieldKey;
          const err = problems[key] ?? refused?.[key];
          const type = "type" in f ? f.type : "text";
          return (
            <AccessField key={f.key} access={access} name={f.key}>
              <Field label={f.label} error={err}>
                {type === "gender" ? (
                  <NativeSelect
                    value={value(key)}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                    }
                    className="h-9"
                  >
                    <option value="">Select a gender</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </NativeSelect>
                ) : type === "date" ? (
                  // The house calendar, not the browser's. Every other date in
                  // the module goes through it - enrolment, transfer, status -
                  // and this one input was still handing the reader whatever
                  // Chrome draws, in whatever order their locale writes it.
                  <DatePickerInput
                    value={value(key)}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                    }
                    className={err ? errorInputClass : inputClass}
                  />
                ) : (
                  <input
                    type={type === "email" ? "email" : "text"}
                    value={value(key)}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                    }
                    className={err ? errorInputClass : inputClass}
                  />
                )}
              </Field>
            </AccessField>
          );
        })}
      </div>

      <p className="mt-4 rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
        Class and status are not edited here. Use Transfer class and Change
        status, so each move keeps its own reason and audit line.
      </p>

      <p className="mt-2 text-xs text-gray-05" aria-live="polite">
        {changed.length === 0
          ? "Nothing changed yet."
          : changed.length === 1
            ? `1 change: ${changed[0].label.toLowerCase()}.`
            : `${changed.length} changes: ${changed.map((c) => c.label.toLowerCase()).join(", ")}.`}
      </p>
    </DrawerShell>
  );
}
