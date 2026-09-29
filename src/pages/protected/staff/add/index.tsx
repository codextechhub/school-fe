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
import PermissionGate from "@/components/custom/permission-gate";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { AccessField, fieldWriteErrors, useFieldAccess } from "@/components/finance-ui";
import { CREATING, FIELD_RESOURCE } from "@/lib/field-resources";
import {
  useGetClassesQuery,
  useGetSubjectsQuery,
} from "@/redux/services/academics/academics-api";
import {
  useCreateStaffMutation,
  useGetStaffListQuery,
  useGetStaffNumberPolicyQuery,
  useGetStaffRulesQuery,
  useUpdateStaffMutation,
} from "@/redux/services/staff/staff-api";
import type {
  EmploymentType,
  StaffCreated,
  StaffQualificationWrite,
} from "@/redux/services/staff/staff-types";

import { Field, inputClass } from "../../students/drawers/drawer-shell";
import { useReaderReach } from "../drawers/reader-reach";
import { ChipToggle, PhotoField, QualificationRows, Section } from "./sections";
import { InvitationSent } from "./invitation-sent";
import { fitsPattern, staffNumberField } from "./staff-number-rule";

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
 * Attaching it is a PATCH on the new record, which the server refuses without
 * `school.teachers.update`, so the photo field is offered only with that key.
 * The create itself needs `school.teachers.create`, and without it the form
 * says so in place of its submit button.
 *
 * **At a live school the form does not ask for a role.** Everybody starts on
 * the school's Teacher role (`starting_role`), reaching as far as their
 * posting, and whoever manages roles adds, removes or widens grants afterwards.
 * Adding staff and deciding what they may reach are different permissions held
 * by different people, so the add path makes no access decision. The server
 * grants the starting role itself and refuses any other, so leaving the picker
 * off the form describes the rule rather than being it.
 *
 * **While onboarding, the form asks for School Admin or Branch Admin.** That is
 * how a school's first administrators arrive, and the server narrows the list
 * to those two because onboarding has one administrator and nobody reviews
 * what they grant: a bursar invited as Payout Approver during setup would hold
 * that grant the moment the school went live.
 *
 * **Personal details follow Field Access (`school.teachers`) as a record being
 * created.** Gender, date of birth, phone and email are offered, greyed or left
 * out by the adder's switches, asked with `CREATING`, and one they may not
 * write is never sent. The backend declares the email open on create, because
 * every new account needs one to receive its invitation, so it is offered and
 * sent even to a role that may not read it on an existing staff member.
 *
 * **The Staff ID follows the school's staff number rule** for the branch the
 * person is posted to (Settings, Staff IDs): required or not, the school's
 * hint, and the next number where the school issues them. The server checks
 * the same rule and its refusal lands under the box.
 *
 * **Where the school approves each hire, nothing is sent on save.** The record
 * waits as Awaiting approval and the invitation goes out once the hire is
 * approved in Workflow, so the copy says that instead of promising an email.
 * The rule is read only at a live school: the staff rules are closed during
 * onboarding, and a school never approves the hires it makes while setting up.
 */
export default function AddStaff() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // The list carries the starting role and, while onboarding, the admin roles
  // to pick from. Read from here rather than from the roles catalogue, which is
  // a surface this reader may not hold.
  const { data: listData, isLoading: loadingRoles } = useGetStaffListQuery({
    page: 1,
  });
  // Only the reader's own branches; a one-branch reader is filed under theirs.
  const { branches, wholeSchool, soleBranch } = useReaderReach();
  const { data: subjectData } = useGetSubjectsQuery();
  const { data: classData } = useGetClassesQuery();

  const [create, { isLoading: creating }] = useCreateStaffMutation();
  const access = useFieldAccess(FIELD_RESOURCE.STAFF);
  const emailOffered = !access.isReadOnly("email", CREATING);
  const [update] = useUpdateStaffMutation();

  const roles = useMemo(() => listData?.role_options ?? [], [listData]);
  const startingRole = listData?.starting_role ?? null;
  // Only an onboarding school chooses; undefined while loading asks nothing.
  const choosesRole = listData?.starting_role === null;
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
  const [created, setCreated] = useState<StaffCreated | null>(null);

  // The rule of the branch they are posted to, which is the one the server checks.
  const policyBranch = form.branch || (soleBranch ? String(soleBranch.id) : "");
  const { data: policyData } = useGetStaffNumberPolicyQuery(
    policyBranch ? { branch: policyBranch } : undefined,
  );
  const numberRule = staffNumberField(policyData?.data);
  const numberOffered = !access.isReadOnly("staff_number", CREATING);
  const { data: rulesData } = useGetStaffRulesQuery(undefined, {
    skip: !startingRole,
  });
  const awaitsApproval = Boolean(startingRole && rulesData?.data?.hire_requires_approval);

  /**
   * Where the new grant reaches, which follows the posting until it is chosen.
   *
   * `role_branch` empty means "not chosen", not "the whole school". The two
   * were the same value, and the whole school was the FIRST option, so every
   * person registered without anybody touching this field was granted access
   * to every branch's records - which is how a school ends up with fifteen
   * staff who all reach everywhere and nobody having decided that. The widest
   * scope is the wrong thing to fall into by default; the branch somebody is
   * posted to is the right one, and widening it stays one click away.
   */
  const SCHOOL_WIDE = "SCHOOL";
  const roleReach = form.role_branch || form.branch || SCHOOL_WIDE;

  const set = (key: keyof typeof form) => (next: string) => {
    setForm((current) => ({ ...current, [key]: next }));
    setErrors((current) => {
      if (!current[key]) return current;
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  };

  const chosenRole = choosesRole
    ? roles.find((r) => r.value === form.role)
    : startingRole;
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
    // Only an email the form offers is the adder's to supply.
    if (emailOffered) {
      if (!form.email.trim()) found.email = "Enter an email address.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        found.email = "That does not look like an email address.";
      }
    }
    if (choosesRole && !form.role) {
      found.role = "Pick the role this person will hold.";
    }
    const number = form.staff_number.trim();
    const rule = policyData?.data;
    if (numberOffered && rule) {
      if (!number && numberRule.required) {
        found.staff_number =
          rule.hint || "This school requires a staff ID for every member of staff.";
      } else if (number && rule.pattern && !fitsPattern(rule.pattern, number)) {
        found.staff_number =
          rule.hint || "That staff ID is not in this school's format.";
      }
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  /** Whether the form draws a box a server refusal on this field can sit under. */
  function placed(field: string): boolean {
    if (field === "branch") return branches.length > 1;
    if (field === "role") return choosesRole;
    if (field === "role_branch") return choosesRole && branches.length > 1;
    return field in form && !access.isHidden(field, CREATING);
  }

  async function save() {
    if (!validate()) return;
    let person: StaffCreated;
    try {
      const result = await create(access.writableOnly({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        middle_name: form.middle_name.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone.trim(),
        email: form.email.trim(),
        staff_number: form.staff_number.trim(),
        job_title: form.job_title.trim(),
        employment_type: (form.employment_type || "") as EmploymentType | "",
        hire_date: form.hire_date || null,
        branch: form.branch || null,
        ...(choosesRole && {
          role: form.role,
          role_branch: roleReach === SCHOOL_WIDE ? null : roleReach,
        }),
        // Blank rows are dropped rather than sent: an empty row is somebody
        // pressing Add and changing their mind, not a qualification.
        qualifications: quals.filter((q) => q.qualification.trim()),
        subjects: canAssignTeaching ? pickedSubjects : [],
        classes: canAssignTeaching ? pickedClasses : [],
      }, CREATING)).unwrap();
      person = result.data;
    } catch (error) {
      const perField = fieldWriteErrors(error) ?? fieldErrors(error);
      if (Object.keys(perField).length) {
        setErrors(perField);
        // A refusal with no box on this form is said aloud rather than dropped.
        for (const [field, message] of Object.entries(perField)) {
          if (!placed(field)) toast.error(message);
        }
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
          `${person.full_name} was added, but the photograph did not upload. Add it from Edit staff on their record.`,
        );
      }
    }
    setCreated(person);
  }

  if (created) {
    return (
      <InvitationSent
        person={created}
        awaitingApproval={Boolean(created.awaiting_approval)}
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
            // The role and the posting are kept: a school adding six teachers
            // to one branch is the common case, and retyping them six times is
            // how the seventh gets it wrong. The posting itself was being
            // cleared despite this note, so the seventh teacher landed
            // school-wide while the six before them went to Lekki.
            branch: form.branch,
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
          {awaitsApproval
            ? "One form. They are invited by email once the hire is approved in Workflow."
            : "One form. They are invited by email as soon as you save."}
        </p>
      </div>

      <Surface as="section" className="grid gap-6 px-6 py-5.5">
        <Section step={1} title="Bio" data-guide="staff-add.section-bio">
          <div className="grid gap-4 sm:grid-cols-2">
            <AccessField access={access} name="first_name" creating>
              <Field label="First name" required error={errors.first_name}>
                <input
                  value={form.first_name}
                  onChange={(e) => set("first_name")(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="last_name" creating>
              <Field label="Last name" required error={errors.last_name}>
                <input
                  value={form.last_name}
                  onChange={(e) => set("last_name")(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="middle_name" creating>
              <Field label="Middle name" error={errors.middle_name}>
                <input
                  value={form.middle_name}
                  onChange={(e) => set("middle_name")(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="gender" creating>
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
            </AccessField>
            <AccessField access={access} name="email" creating>
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
            </AccessField>
            <AccessField access={access} name="phone" creating>
              <Field label="Phone" error={errors.phone}>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="date_of_birth" creating>
              <Field label="Date of birth" error={errors.date_of_birth}>
                {/* h-9 to match the select beside it rather than the control's taller default. */}
                <DatePickerInput
                  aria-label="Date of birth"
                  className="h-9"
                  value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth")(e.target.value)}
                />
              </Field>
            </AccessField>
          </div>
          {hasPermission(P.MODIFY_TEACHER) && (
            <div className="mt-4">
              <PhotoField
                file={photo}
                onPick={setPhoto}
                onClear={() => setPhoto(null)}
              />
            </div>
          )}
        </Section>

        <Section
          step={2}
          title="Employment"
          data-guide="staff-add.section-employment"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AccessField access={access} name="staff_number" creating>
              <Field
                label="Staff ID"
                required={numberRule.required}
                error={errors.staff_number}
                hint={numberRule.hint}
              >
                <input
                  value={form.staff_number}
                  onChange={(e) => set("staff_number")(e.target.value)}
                  placeholder={numberRule.placeholder || undefined}
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="job_title" creating>
              <Field label="Job title" error={errors.job_title}>
                <input
                  value={form.job_title}
                  onChange={(e) => set("job_title")(e.target.value)}
                  placeholder="Teacher, Bursar, Registrar…"
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="employment_type" creating>
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
            </AccessField>
            <AccessField access={access} name="hire_date" creating>
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
            </AccessField>
            {branches.length > 1 && (
              <Field
                label="Posted to"
                error={errors.branch}
                hint={
                  wholeSchool
                    ? "Where they are based. One branch, or across the whole school."
                    : "Where they are based. You can post people only to your own branches."
                }
              >
                <NativeSelect
                  aria-label="Posted to"
                  value={form.branch}
                  onChange={(e) => set("branch")(e.target.value)}
                  className="h-9"
                >
                  <option value="" disabled={!wholeSchool}>
                    {wholeSchool ? "Across the whole school" : "Choose a branch"}
                  </option>
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

        {choosesRole && (
          <Section step={3} title="Role" data-guide="staff-add.section-role">
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
                  hint="Which records the role opens, not where they work. Set to match their posting; widen it only for somebody who genuinely works across branches."
                >
                  <NativeSelect
                    aria-label="This role reaches"
                    value={roleReach}
                    onChange={(e) => set("role_branch")(e.target.value)}
                    className="h-9"
                  >
                    {wholeSchool && (
                      <option value={SCHOOL_WIDE}>Across the whole school</option>
                    )}
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
        )}

        {canAssignTeaching && (
          <Section
            step={choosesRole ? 4 : 3}
            title="Teaching duties"
            data-guide="staff-add.section-teaching"
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
          step={3 + Number(choosesRole) + Number(canAssignTeaching)}
          title="Qualifications"
          data-guide="staff-add.section-qualifications"
          note="Typed rows, as your school records them. Nothing here checks a qualification, so nothing claims one was checked."
        >
          <QualificationRows rows={quals} onChange={setQuals} />
        </Section>
      </Surface>

      <Surface as="section" className="px-6 py-5" data-guide="staff-add.on-save">
        <p className="text-sm font-semibold text-black-01">
          What happens when you save
        </p>
        {startingRole && (
          <p className="mt-1.5 text-[13px] text-gray-01">
            They start as {startingRole.label}, reaching as far as their
            posting. Roles are added or removed from Roles & Permissions.
          </p>
        )}
        {awaitsApproval ? (
          <p className="mt-1.5 text-[13px] text-gray-01">
            Your school approves each new hire. The record is created as
            Awaiting approval and nothing is sent yet. Once the school&apos;s
            approvers approve the hire in Workflow, the invitation goes out by
            email and in-app, never by SMS.
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] text-gray-01">
            The record is created with employment status Invited and the account
            waiting for activation. An invitation goes out by email and in-app,
            never by SMS. The link is single-use and expires; resending voids the
            old one and restarts the clock.
          </p>
        )}
        <p className="mt-2 text-xs text-gray-05">
          Documents such as a CV or certificates are uploaded on the Documents
          tab of their record once it exists.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            onClick={() => navigate(routesPath.PROTECTED.STAFF.INDEX)}
            disabled={creating}
          >
            Cancel
          </Button>
          <PermissionGate
            permission={P.INVITE_TEACHER}
            fallback={
              <span className="self-center text-xs text-gray-05">
                Adding staff needs the permission to invite them.
              </span>
            }
          >
            <Button onClick={() => void save()} disabled={creating}>
              <Mail className="size-4" />
              {creating
                ? "Saving…"
                : awaitsApproval
                  ? "Create and send for approval"
                  : "Create and invite"}
            </Button>
          </PermissionGate>
        </div>
      </Surface>
    </PageShell>
  );
}
