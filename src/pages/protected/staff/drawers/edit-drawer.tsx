import { useMemo, useState } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/ui/native-select";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { AccessField, fieldWriteErrors, useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { Button } from "@/components/ui/button";
import { useUpdateStaffMutation } from "@/redux/services/staff/staff-api";
import type {
  EmploymentType,
  StaffDetail,
  StaffUpdate,
} from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";

type FieldKey = keyof StaffUpdate;

const TYPES: { value: EmploymentType; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  // Offered even though the design's picker omits it. The value is in the
  // server's enum and a school that has a volunteer should be able to say so; a
  // picker missing a value the API accepts is weaker evidence than the enum.
  { value: "VOLUNTEER", label: "Volunteer" },
];

/**
 * Correct a staff record.
 *
 * **Not in the design, and built anyway.** The prototype has an Edit button on
 * the profile and Edit record in the row menu, with no drawer behind either -
 * two controls pointing at nothing. The endpoint exists, so this is the drawer
 * they were drawn for.
 *
 * **Three things a school might expect here are deliberately absent.** The
 * employment status moves only through the lifecycle drawer, which is the only
 * place that also does the right thing to the account. The sign-in address is
 * an account fact on a different key. And there is no reach control: which
 * branches somebody's access extends to comes from their role grants, so a
 * field here that looked like it widened them would not.
 *
 * **The posting box appears only to a viewer who works in several branches.**
 * The server leaves the posting out for anybody else, and a branch
 * administrator's people are all at their branch or shared across the school.
 *
 * **Only what changed is sent.** A PATCH of every field rewrites values nobody
 * touched, and the draft is an overlay over the record rather than a copy of
 * it - which is also why there is no effect seeding a form: the record IS the
 * initial state, and a copy taken at mount is a copy that goes stale the moment
 * anything else writes to the same person.
 *
 * **Gender, date of birth and phone follow Field Access (`school.teachers`).**
 * One the viewer may not read is absent from the record and not on the form;
 * one the record lists in `_read_only_fields` is greyed and never sent.
 */
export function EditDrawer({
  person,
  onClose,
  onChangePostings,
}: {
  person: StaffDetail;
  onClose: () => void;
  onChangePostings: () => void;
}) {
  const [update, { isLoading: saving }] = useUpdateStaffMutation();

  const [draft, setDraft] = useState<Partial<StaffUpdate>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const access = useFieldAccess(FIELD_RESOURCE.STAFF, person);

  const fromRecord: Record<FieldKey, string> = useMemo(
    () => ({
      first_name: person.first_name ?? "",
      last_name: person.last_name ?? "",
      middle_name: person.middle_name ?? "",
      date_of_birth: person.date_of_birth ?? "",
      phone: person.phone ?? "",
      gender: person.gender ?? "",
      staff_number: person.staff_number ?? "",
      job_title: person.job_title ?? "",
      employment_type: person.employment_type ?? "",
      hire_date: person.hire_date ?? "",
      branch: person.branch_id ? String(person.branch_id) : "",
    }),
    [person],
  );

  const value = (key: FieldKey): string =>
    key in draft ? String(draft[key] ?? "") : fromRecord[key];

  const set = (key: FieldKey) => (next: string) => {
    setDraft((current) => ({ ...current, [key]: next }));
    setErrors((current) => {
      if (!current[key]) return current;
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  };

  const changed = (Object.keys(draft) as FieldKey[]).filter(
    (key) => !access.isReadOnly(key) && String(draft[key] ?? "") !== fromRecord[key],
  );

  // A name part the viewer may not change is not theirs to leave blank, so only
  // an editable one is required.
  const nameFilled = (key: "first_name" | "last_name") =>
    access.isReadOnly(key) || value(key).trim().length > 0;
  const canSave = changed.length > 0 && nameFilled("first_name") && nameFilled("last_name");

  async function save() {
    const body: Partial<StaffUpdate> = {};
    for (const key of changed) {
      const next = String(draft[key] ?? "");
      // A cleared date is null and not "": the server reads an empty string as
      // an invalid date rather than as "there isn't one".
      if (key === "date_of_birth" || key === "hire_date") {
        body[key] = next || null;
      } else if (key === "branch") {
        // Empty means across the whole school, which is a choice a school makes
        // rather than a field it forgot to fill in.
        body.branch = next || null;
      } else if (key === "employment_type") {
        body.employment_type = (next || undefined) as EmploymentType | undefined;
      } else {
        (body as Record<string, string>)[key] = next.trim();
      }
    }

    try {
      await update({ id: person.id, body }).unwrap();
      toast.success("Record updated.");
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
      title="Edit record"
      subtitle="Employment status and the sign-in address are changed elsewhere."
      saveLabel="Save changes"
      onSave={() => void save()}
      canSave={canSave}
      saving={saving}
    >
      <div className="grid gap-4">
        <AccessField access={access} name="first_name">
          <Field label="First name" required error={errors.first_name}>
            <input
              value={value("first_name")}
              onChange={(e) => set("first_name")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>
        <AccessField access={access} name="middle_name">
          <Field label="Middle name" error={errors.middle_name}>
            <input
              value={value("middle_name")}
              onChange={(e) => set("middle_name")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>
        <AccessField access={access} name="last_name">
          <Field label="Last name" required error={errors.last_name}>
            <input
              value={value("last_name")}
              onChange={(e) => set("last_name")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>
        <AccessField access={access} name="gender">
          <Field label="Gender" error={errors.gender}>
            <NativeSelect
              aria-label="Gender"
              value={value("gender")}
              onChange={(e) => set("gender")(e.target.value)}
              className="h-9"
            >
              <option value="">Not recorded</option>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </NativeSelect>
          </Field>
        </AccessField>
        <AccessField access={access} name="date_of_birth">
          <Field label="Date of birth" error={errors.date_of_birth}>
            <input
              type="date"
              value={value("date_of_birth")}
              onChange={(e) => set("date_of_birth")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>
        <AccessField access={access} name="phone">
          <Field label="Phone" error={errors.phone}>
            <input
              value={value("phone")}
              onChange={(e) => set("phone")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>

        <AccessField access={access} name="staff_number">
          <Field
            label="Staff ID"
            error={errors.staff_number}
            hint="The school's own format. Nothing checks its shape, only that nobody else here has it."
          >
            <input
              value={value("staff_number")}
              onChange={(e) => set("staff_number")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>
        <AccessField access={access} name="job_title">
          <Field label="Job title" error={errors.job_title}>
            <input
              value={value("job_title")}
              onChange={(e) => set("job_title")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>
        <AccessField access={access} name="employment_type">
          <Field label="Employment type" error={errors.employment_type}>
            <NativeSelect
              aria-label="Employment type"
              value={value("employment_type")}
              onChange={(e) => set("employment_type")(e.target.value)}
              className="h-9"
            >
              <option value="">Not recorded</option>
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </AccessField>
        <AccessField access={access} name="hire_date">
          <Field
            label="Hire date"
            error={errors.hire_date}
            hint="Length of service is worked out from this, and is left blank without it."
          >
            <input
              type="date"
              value={value("hire_date")}
              onChange={(e) => set("hire_date")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </AccessField>

        {/* Null when the viewer works in one branch: postings are not theirs. */}
        {person.posted_school_wide != null && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-black-01">Posted to</p>
            <p className="mt-1 text-sm text-gray-01">
              {person.posted_school_wide ? "School-wide" : person.branch_name}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onChangePostings}>
              Change postings
            </Button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
