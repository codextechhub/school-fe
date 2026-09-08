import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Info, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { NativeSelect } from "@/components/ui/native-select";
import { PageShell } from "@/components/layout/page-shell";
import { Panel as Surface } from "@/components/custom/surface";
import { routesPath } from "@/routes/routesPath";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useGetClassesQuery,
  useGetSubjectsQuery,
} from "@/redux/services/academics/academics-api";
import {
  useCreateStaffMutation,
  useGetStaffListQuery,
  useUpdateStaffMutation,
} from "@/redux/services/staff/staff-api";
import type {
  EmploymentType,
  StaffDetail,
  StaffQualificationWrite,
} from "@/redux/services/staff/staff-types";

import { Field, inputClass } from "../../students/drawers/drawer-shell";
import { ChipToggle, PhotoField, QualificationRows, Section } from "./sections";
import { InvitationSent } from "./invitation-sent";

const TYPES: { value: EmploymentType; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "VOLUNTEER", label: "Volunteer" },
];

/**
 * Does this role put somebody in front of a class?
 *
 * Matched on the role's own words rather than on a flag, because there is no
 * teaching-staff field on a person and inventing one here would be a second
 * answer to a question the grant already answers. Loose on purpose: it catches
 * Teacher, Lead Teacher and Teaching Assistant, and a school that calls its
 * teachers something else simply does not get the shortcut - which is why the
 * form says duties can be assigned later whether the step appears or not.
 */
function roleTeaches(label: string, key: string): boolean {
  const text = `${label} ${key}`.toLowerCase();
  return text.includes("teach");
}

/**
 * Add somebody to the staff, and invite them.
 *
 * **One save, one transaction.** The account, the invitation, the role grant,
 * the staff record, the qualifications and the teaching duties are written by a
 * single POST, so a person whose third qualification is refused is not left
 * existing with two.
 *
 * The photograph is the one exception and cannot be otherwise: it is a file,
 * and there is no record to attach it to until the record exists. It goes up
 * immediately afterwards, and a failure there is reported as what it is - the
 * person was created, their picture was not - rather than as a failed create.
 *
 * **A role is required. There is no invite-now-decide-later.** Somebody created
 * without one has an account that signs in and reaches nothing, and no screen
 * would explain why.
 *
 * **Before go-live the role list narrows to the two administrator roles.** Not
 * as a courtesy: onboarding has one administrator in it and nobody reviews what
 * they grant, so a bursar invited as Payout Approver during setup would hold
 * that grant the moment the school went live with no second pair of eyes on it.
 * The server refuses any other role on the POST as well, so the narrowed list
 * describes the rule rather than being it.
 */
export default function AddStaff() {
  const navigate = useNavigate();

  // The list endpoint carries the roles this school may hand out right now,
  // already narrowed for a pending school. Read from here rather than from the
  // roles catalogue, which is a surface this reader may not hold.
  const { data: listData, isLoading: loadingRoles } = useGetStaffListQuery({
    page: 1,
  });
  const { data: branchData } = useGetMyBranchesQuery();
  const { data: subjectData } = useGetSubjectsQuery();
  const { data: classData } = useGetClassesQuery();

  const [create, { isLoading: creating }] = useCreateStaffMutation();
  const [update] = useUpdateStaffMutation();

  const roles = useMemo(() => listData?.role_options ?? [], [listData]);
  const branches = branchData?.data ?? [];
  const subjects = useMemo(() => subjectData?.data ?? [], [subjectData]);
  const classes = useMemo(() => classData?.data ?? [], [classData]);

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "",
    date_of_birth: "",
    email: "",
    phone: "",
    staff_number: "",
    job_title: "",
    employment_type: "",
    hire_date: "",
    branch: "",
    role: "",
    role_branch: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [quals, setQuals] = useState<StaffQualificationWrite[]>([]);
  const [pickedSubjects, setPickedSubjects] = useState<number[]>([]);
  const [pickedClasses, setPickedClasses] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<StaffDetail | null>(null);

  const set = (key: keyof typeof form) => (next: string) => {
    setForm((current) => ({ ...current, [key]: next }));
    setErrors((current) => {
      if (!current[key]) return current;
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  };

  const chosenRole = roles.find((r) => r.value === form.role);
  const teaches = Boolean(
    chosenRole && roleTeaches(chosenRole.label, chosenRole.value),
  );
  // Offered only where there is a year with classes and subjects in it. A
  // school still onboarding has started none, and the server skips the duties
  // silently in that case rather than refusing the whole create.
  const canAssignTeaching =
    teaches && subjects.length > 0 && classes.length > 0;

  function validate() {
    const found: Record<string, string> = {};
    if (!form.first_name.trim()) found.first_name = "Enter their first name.";
    if (!form.last_name.trim()) found.last_name = "Enter their last name.";
    if (!form.email.trim()) found.email = "Enter an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      found.email = "That does not look like an email address.";
    }
    if (!form.role) found.role = "Pick the role this person will hold.";
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function save() {
    if (!validate()) return;
    let person: StaffDetail;
    try {
      const result = await create({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        middle_name: form.middle_name.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        email: form.email.trim(),
        phone: form.phone.trim(),
        staff_number: form.staff_number.trim(),
        job_title: form.job_title.trim(),
        employment_type: (form.employment_type || "") as EmploymentType | "",
        hire_date: form.hire_date || null,
        branch: form.branch || null,
        role: form.role,
        role_branch: form.role_branch || null,
        // Blank rows are dropped rather than sent: an empty row is somebody
        // pressing Add and changing their mind, not a qualification.
        qualifications: quals.filter((q) => q.qualification.trim()),
        subjects: canAssignTeaching ? pickedSubjects : [],
        classes: canAssignTeaching ? pickedClasses : [],
      }).unwrap();
      person = result.data;
    } catch (error) {
      const perField = fieldErrors(error);
      if (Object.keys(perField).length) {
        setErrors(perField);
        return;
      }
      toast.error(
        apiErrorMessage(error, "We could not add that person. Try again."),
      );
      return;
    }

    // The record exists from here on, so nothing below may report a failure as
    // though the person had not been created.
    if (photo) {
      const body = new FormData();
      body.append("photo", photo);
      try {
        await update({ id: person.id, body }).unwrap();
      } catch {
        toast.warning(
          `${person.full_name} was added, but the photograph did not upload. It can be set on their record.`,
        );
      }
    }
    setCreated(person);
  }

  if (created) {
    return (
      <InvitationSent
        person={created}
        roleLabel={chosenRole?.label ?? ""}
        onAddAnother={() => {
          setForm({
            first_name: "",
            middle_name: "",
            last_name: "",
            gender: "",
            date_of_birth: "",
            email: "",
            phone: "",
            staff_number: "",
            job_title: "",
            employment_type: "",
            hire_date: "",
            branch: "",
            // The role and the posting are kept: a school adding six teachers
            // to one branch is the common case, and retyping them six times is
            // how the seventh gets it wrong.
            role: form.role,
            role_branch: form.role_branch,
          });
          setPhoto(null);
          setQuals([]);
          setPickedSubjects([]);
          setPickedClasses([]);
          setErrors({});
          setCreated(null);
        }}
      />
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => navigate(routesPath.PROTECTED.STAFF.INDEX)}
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-05 hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back to directory
        </button>
        <h2 className="mt-2 text-lg font-semibold text-black-01">Add staff</h2>
        <p className="mt-1 text-sm text-gray-01">
          One form. They are invited by email as soon as you save.
        </p>
      </div>

      <Surface as="section" className="grid gap-6 px-6 py-5.5">
        <Section step={1} title="Bio">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required error={errors.first_name}>
              <input
                value={form.first_name}
                onChange={(e) => set("first_name")(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Last name" required error={errors.last_name}>
              <input
                value={form.last_name}
                onChange={(e) => set("last_name")(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Middle name" error={errors.middle_name}>
              <input
                value={form.middle_name}
                onChange={(e) => set("middle_name")(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Gender" error={errors.gender}>
              <NativeSelect
                aria-label="Gender"
                value={form.gender}
                onChange={(e) => set("gender")(e.target.value)}
                className="h-9"
              >
                <option value="">Not recorded</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </NativeSelect>
            </Field>
            <Field
              label="Email address"
              required
              error={errors.email}
              hint="Where the invitation goes, and the address they sign in with."
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder="name@yourschool.edu.ng"
                className={inputClass}
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Date of birth" error={errors.date_of_birth}>
              {/* h-9 to match everything else on this form. The control's own
                  default is the app's taller one, which beside a 36px select
                  reads as a mistake rather than as a choice. */}
              <DatePickerInput
                aria-label="Date of birth"
                className="h-9"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth")(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4">
            <PhotoField
              file={photo}
              onPick={setPhoto}
              onClear={() => setPhoto(null)}
            />
          </div>
        </Section>

        <Section step={2} title="Employment">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Staff ID"
              error={errors.staff_number}
              hint="Your school's own format. Nothing checks its shape, only that nobody here already has it."
            >
              <input
                value={form.staff_number}
                onChange={(e) => set("staff_number")(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Job title" error={errors.job_title}>
              <input
                value={form.job_title}
                onChange={(e) => set("job_title")(e.target.value)}
                placeholder="Teacher, Bursar, Registrar…"
                className={inputClass}
              />
            </Field>
            <Field label="Employment type" error={errors.employment_type}>
              <NativeSelect
                aria-label="Employment type"
                value={form.employment_type}
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
            <Field
              label="Hire date"
              error={errors.hire_date}
              hint="Length of service is worked out from this."
            >
              <DatePickerInput
                aria-label="Hire date"
                className="h-9"
                value={form.hire_date}
                onChange={(e) => set("hire_date")(e.target.value)}
              />
            </Field>
            {branches.length > 1 && (
              <Field
                label="Posted to"
                error={errors.branch}
                hint="Where they are based. One branch, or across the whole school."
              >
                <NativeSelect
                  aria-label="Posted to"
                  value={form.branch}
                  onChange={(e) => set("branch")(e.target.value)}
                  className="h-9"
                >
                  <option value="">Across the whole school</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
        </Section>

        <Section step={3} title="Role">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" required error={errors.role}>
              <NativeSelect
                aria-label="Role"
                value={form.role}
                onChange={(e) => set("role")(e.target.value)}
                className="h-9"
                disabled={loadingRoles}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {branches.length > 1 && (
              <Field
                label="This role reaches"
                error={errors.role_branch}
                hint="A grant reaches one branch, or the whole school. It is a different fact from where they are based."
              >
                <NativeSelect
                  aria-label="This role reaches"
                  value={form.role_branch}
                  onChange={(e) => set("role_branch")(e.target.value)}
                  className="h-9"
                >
                  <option value="">Across the whole school</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-gray-05">
            <Info className="mt-px size-3.5 shrink-0 text-gray-05" />
            What a role can do is defined in access control, not here.
          </p>
        </Section>

        {canAssignTeaching && (
          <Section
            step={4}
            title="Teaching duties"
            note="Optional. Every subject you pick is assigned in every class you pick, and they can be changed later."
          >
            <div className="grid gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-gray-05">
                  Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <ChipToggle
                      key={subject.id}
                      label={subject.name}
                      on={pickedSubjects.includes(subject.id)}
                      onToggle={() =>
                        setPickedSubjects((current) =>
                          current.includes(subject.id)
                            ? current.filter((id) => id !== subject.id)
                            : [...current, subject.id],
                        )
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-gray-05">Classes</p>
                <div className="flex flex-wrap gap-2">
                  {classes.map((row) => (
                    <ChipToggle
                      key={row.id}
                      label={row.name}
                      on={pickedClasses.includes(row.id)}
                      onToggle={() =>
                        setPickedClasses((current) =>
                          current.includes(row.id)
                            ? current.filter((id) => id !== row.id)
                            : [...current, row.id],
                        )
                      }
                    />
                  ))}
                </div>
              </div>
              {pickedSubjects.length > 0 && pickedClasses.length > 0 && (
                <p className="text-xs text-gray-05">
                  {pickedSubjects.length * pickedClasses.length} duties will be
                  created, each with them as the lead teacher where the pairing
                  has none.
                </p>
              )}
            </div>
          </Section>
        )}

        <Section
          step={canAssignTeaching ? 5 : 4}
          title="Qualifications"
          note="Typed rows, as your school records them. Nothing here checks a qualification, so nothing claims one was checked."
        >
          <QualificationRows rows={quals} onChange={setQuals} />
        </Section>
      </Surface>

      <Surface as="section" className="px-6 py-5">
        <p className="text-sm font-semibold text-black-01">
          What happens when you save
        </p>
        <p className="mt-1.5 text-[13px] text-gray-01">
          The record is created with employment status Invited and the account
          waiting for activation. An invitation goes out by email and in-app,
          never by SMS. The link is single-use and expires; resending voids the
          old one and restarts the clock.
        </p>
        <p className="mt-2 text-xs text-gray-05">
          Documents are added on their record once it exists, on the Documents
          tab.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            onClick={() => navigate(routesPath.PROTECTED.STAFF.INDEX)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={creating}>
            <Mail className="size-4" />
            {creating ? "Sending…" : "Create and invite"}
          </Button>
        </div>
      </Surface>
    </PageShell>
  );
}
