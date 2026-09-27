import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Panel } from "@/components/custom/surface";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { PageShell } from "@/components/layout/page-shell";
import { routesPath } from "@/routes/routesPath";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { cn } from "@/lib/utils";
import { AccessField, useFieldAccess } from "@/components/finance-ui";
import { CREATING, FIELD_RESOURCE } from "@/lib/field-resources";
import { writeErrorMessage, fieldErrors, parseApiError } from "@/utils/api-error";
import {
  useEnrolStudentMutation,
  useGetAdmissionPolicyQuery,
  useGetClassSeatsQuery,
} from "@/redux/services/students/students-api";
import {
  RELATIONSHIPS,
  type EnrolWrite,
  type Gender,
} from "@/redux/services/students/students-types";

import PermissionGate from "@/components/custom/permission-gate";
import { ConfirmDialog } from "../drawers/confirm-dialog";
import { ENROL_PERMISSIONS } from "../drawers/access";
import { Field, errorInputClass, inputClass } from "../drawers/drawer-shell";
import { ChoiceButtons } from "./choice-buttons";
import { StepRail } from "./step-rail";
import { GuardianRows, type GuardianDraft } from "./guardian-rows";

/** A new guardian's name as one line, from the parts typed so far. */
function draftName(g: GuardianDraft): string {
  return [g.first_name, g.middle_name, g.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Under 2 or over 25 is a mistyped year, not a pupil. Mirrors the backend. */
function dobProblem(value: string): string {
  if (!value) return "A date of birth is required.";
  const now = today();
  if (value > now) return "That date is in the future.";
  const years = Number(now.slice(0, 4)) - Number(value.slice(0, 4));
  if (years < 2) return "That would make the student under 2 years old.";
  if (years > 25) return "That would make the student over 25. Check the year.";
  return "";
}

/**
 * The steps, and which fields each one owns.
 *
 * The map is what makes a server-side refusal land in the right place: a 400 on
 * `student_number` while the registrar is standing on Review has to take them
 * back to Placement with the field marked, not leave them staring at a summary
 * with a red toast above it.
 */
type StepKey = "student" | "placement" | "guardians" | "details" | "review";

interface Step {
  key: StepKey;
  label: string;
  hint: string;
  /** The fields this step owns, so a refusal can be routed back to it. */
  fields: readonly string[];
  optional?: boolean;
}

const STEPS: readonly Step[] = [
  {
    key: "student",
    label: "Student",
    hint: "Who they are.",
    fields: ["first_name", "last_name", "date_of_birth", "gender"],
  },
  {
    key: "placement",
    label: "Placement",
    hint: "Where they sit, and the number they carry.",
    fields: ["branch", "school_class", "applied_for", "student_number"],
  },
  {
    key: "guardians",
    label: "Guardians",
    hint: "Who the school calls.",
    fields: ["guardians"],
  },
  {
    key: "details",
    label: "Details",
    hint: "Contact and medical. All optional.",
    fields: [] as string[],
    optional: true,
  },
  { key: "review", label: "Review", hint: "Check, then save.", fields: [] },
];

/** The medical inputs, each governed by its own Field Access switch. */
const MEDICAL_INPUTS = [
  { name: "blood_group", label: "Blood group" },
  { name: "allergies", label: "Allergies" },
  { name: "conditions", label: "Conditions" },
] as const;

/**
 * Enrol one student by hand, or save them as an applicant.
 *
 * **One form, one flag** - the same shape the backend takes. Two forms would be
 * two sets of rules and the second would be the one that forgets a check. The
 * flag moves which field is required: an enrolment joins a CLASS, an applicant
 * records the LEVEL applied for, because nobody has given them a seat yet.
 *
 * **The admission number is optional and the school owns its format.** The
 * design pre-fills the next free number in `BFS/YYYY/NNNN`, which is right for
 * Brightfield and wrong for the platform - Corona numbers its students
 * `CSS-24-0117`. The rule lives in the school's admission policy, so this reads
 * it, shows the school's own hint, and requires the field only when the school
 * says it is required. There is no next-number generator on the backend, so
 * nothing is pre-filled rather than a Brightfield-shaped guess being offered to
 * every school.
 *
 * **Duplicate and over-capacity are the server's questions to ask.** Both are
 * sent false; the server refuses, and only then does the form put the question
 * to the registrar. "Is this a different child with the same name and birthday?"
 * is not ours to answer on their behalf.
 *
 * **Stepped, and the steps are not a cage.** Twenty-one fields on one page is a
 * wall, and the registrar cannot tell which of them are actually required. So
 * the form asks for one thing at a time, and:
 *
 *   - Next validates ONLY the step you are on, so errors appear where you are
 *     rather than all twenty-one at once the first time you press Save.
 *   - Every step you have already reached stays clickable. A stepper that traps
 *     someone on step 2 because step 3 is incomplete is worse than the wall.
 *   - The rail carries a per-step count of what is still missing, so nothing is
 *     hiding two steps back when you arrive at Review.
 *   - A server refusal jumps to the step that owns the field it names.
 *
 * **Field Access applies as to a record being created.** The pupil's fields
 * (`school.students`) and each new guardian's (`school.guardians`) are offered,
 * summarised and sent according to the registrar's switches, asked with
 * `CREATING`. A field the backend declares open on create, such as the
 * admission date, is therefore offered even to a registrar who may not read or
 * change it on an existing pupil.
 */
export default function EnrolStudent() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const branchLens = useBranchLens();
  // An Add form: every Field Access question below is asked with CREATING.
  const access = useFieldAccess(FIELD_RESOURCE.STUDENTS);
  const guardianAccess = useFieldAccess(FIELD_RESOURCE.GUARDIANS);

  // ?applicant=1 flips the form before anything is typed, so the Applicants
  // board can send someone straight to the right shape.
  const [asApplicant, setAsApplicant] = useState(params.get("applicant") === "1");

  /**
   * Move the switch, and move the address with it.
   *
   * The parameter is not just an entry point. It is what says which of the two
   * things on this page you are doing, so the sidebar can light Applicants
   * while you save one and the directory while you enrol one - and a reload,
   * a bookmark or a back button keeps the choice you made rather than dropping
   * you into the other form with your answers still in it.
   */
  function chooseShape(next: boolean) {
    setAsApplicant(next);
    setParams(next ? { applicant: "1" } : {}, { replace: true });
  }

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "" as Gender | "",
    nationality: "Nigerian",
    state_of_origin: "",
    address: "",
    phone: "",
    email: "",
    previous_school: "",
    blood_group: "",
    allergies: "",
    conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    student_number: "",
    enrolment_date: today(),
    school_class: "",
    applied_for: "",
    // Only asked at a multi-branch school. Below, and on the backend, the
    // dimension recedes entirely at a school with one site.
    branch: "",
  });
  const [guardians, setGuardians] = useState<GuardianDraft[]>([]);

  // A pinned lens is already an answer to "which branch", so the field reads
  // from it until somebody picks something else - DERIVED rather than copied
  // into state, so the two can never drift and switching the lens mid-form does
  // not silently keep the old branch. It stays editable: the lens is what you
  // are LOOKING at, not necessarily where the child attends.
  const lensBranch =
    branchLens.applies && branchLens.branch !== "all"
      ? String(branchLens.branch)
      : "";
  // A PINNED lens decides the branch outright rather than merely suggesting it.
  //
  // Somebody working through the Annex enrols into the Annex; letting the form
  // keep a different branch than the workspace they are reading means the
  // classes on the next field belong to a site they are not looking at. When
  // the lens reads "All branches" it has not answered the question, so the
  // field becomes a real choice.
  const branchPinned = lensBranch !== "";
  const branchValue = branchPinned ? lensBranch : form.branch;

  const [step, setStep] = useState<StepKey>("student");
  // How far they have got. Every step up to here stays clickable, so the rail
  // is a map rather than a gate.
  const [reached, setReached] = useState<StepKey[]>(["student"]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Whether the registrar has taken charge of the admission number.
  const [numberOwned, setNumberOwned] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState<string | null>(null);
  const [allowOverCapacity, setAllowOverCapacity] = useState(false);

  // No lens, deliberately. This picker feeds a WRITE, and a placement is
  // always made in the year the school is running - the backend refuses one
  // against a closed year. Offering last year's classes while somebody browses
  // last year would offer a seat that cannot be taken.
  const { data: classesData } = useGetClassSeatsQuery();
  const { data: policyData } = useGetAdmissionPolicyQuery();
  const [enrol, { isLoading }] = useEnrolStudentMutation();

  const classes = useMemo(() => classesData?.data ?? [], [classesData]);
  const policy = policyData?.data;

  // The suggestion is DERIVED, not copied into state by an effect.
  //
  // It arrives a render after the form mounts, so writing it into state would
  // mean an effect that fires on someone else's schedule and has to be stopped
  // from firing twice. Deriving it needs neither: until the registrar types,
  // the box shows the server's suggestion; the moment they do, it shows theirs
  // and never goes back. Clearing the box therefore stays cleared, because a
  // registrar who empties it has answered the question and a value that
  // reappeared would be arguing with them.
  const admissionNumber = numberOwned ? form.student_number : (policy?.suggestion ?? "");

  // The classes this student could actually join.
  //
  // A class belongs to a branch or is school-wide, and the server REFUSES a
  // placement that crosses them - so offering every class and letting the save
  // fail is offering a seat that does not exist. Same rule the assign screen
  // already applies. Until a branch is picked there is no answer, so the field
  // below stays shut rather than listing classes the choice may remove.
  const branchClasses = useMemo(() => {
    if (!branchLens.applies) return classes;
    if (!branchValue) return [];
    return classes.filter(
      (c) => c.branch == null || String(c.branch) === branchValue,
    );
  }, [classes, branchLens.applies, branchValue]);

  // Levels come from the classes the school runs, so an applicant can never be
  // recorded against a level the school does not teach - and they come out in
  // LADDER order, because the picker read JSS1, SSS1, JSS2, SSS2 when it was
  // built from a Map in whatever order the class list arrived.
  const levels = useMemo(() => {
    const seen = new Map<number, { name: string; order: [number, number] }>();
    for (const c of branchClasses) {
      if (c.level && c.level_name && !seen.has(c.level)) {
        seen.set(c.level, {
          name: c.level_name,
          order: c.level_order ?? [999, 0],
        });
      }
    }
    return [...seen]
      .map(([id, v]) => ({ id, name: v.name, order: v.order }))
      .sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1]);
  }, [branchClasses]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    if (!form.first_name.trim()) out.first_name = "A first name is required.";
    if (!form.last_name.trim()) out.last_name = "A last name is required.";
    if (!form.gender) out.gender = "Pick a gender.";
    const dob = dobProblem(form.date_of_birth);
    if (dob) out.date_of_birth = dob;

    if (asApplicant) {
      if (!form.applied_for) out.applied_for = "Say which level they applied for.";
    } else if (!form.school_class) {
      out.school_class = "Pick the class this student is joining.";
    }

    // A student always has a branch. "The whole school" is not a place a child
    // attends, so the server refuses a multi-branch enrolment without one - and
    // asking here beats a 400 after the form has been filled in.
    if (branchLens.applies && !branchValue) {
      out.branch = "Say which branch this student attends.";
    }

    const number = admissionNumber.trim();
    if (policy?.required && !number) {
      out.student_number =
        policy.hint || "This school requires an admission number.";
    } else if (number && policy?.pattern) {
      let ok = true;
      try {
        ok = new RegExp(policy.pattern).test(number);
      } catch {
        // A pattern this browser cannot compile is the school's problem to fix,
        // not a reason to block an enrolment: let the server be the judge.
        ok = true;
      }
      if (!ok) {
        out.student_number =
          policy.hint || "That does not match this school's admission number format.";
      }
    }

    const filled = guardians.filter((g) =>
      g.kind === "existing"
        ? Boolean(g.guardianId)
        : g.first_name.trim() && g.last_name.trim() && g.phone.trim(),
    );
    if (filled.length === 0) {
      out.guardians = "Link at least one guardian.";
    } else if (!filled.some((g) => g.is_primary)) {
      out.guardians = "Mark one guardian as the primary contact.";
    } else if (filled.some((g) => !g.relationship)) {
      out.guardians = "Set the relationship for every guardian.";
    }
    return out;
  }, [
    form,
    admissionNumber,
    guardians,
    asApplicant,
    policy,
    branchLens.applies,
    branchValue,
  ]);

  const valid = Object.keys(problems).length === 0;
  const err = (key: string) => (touched[key] ? problems[key] : undefined);

  // Which fields a step owns, narrowed to the ones that apply right now: a
  // school with one branch never owns `branch`, and an applicant owns
  // `applied_for` where an enrolment owns `school_class`.
  const ownedBy = (key: StepKey) => {
    const fields = STEPS.find((x) => x.key === key)?.fields ?? [];
    return fields.filter((f) => {
      if (f === "branch") return branchLens.applies;
      if (f === "school_class") return !asApplicant;
      if (f === "applied_for") return asApplicant;
      return true;
    });
  };
  const missingIn = (key: StepKey) =>
    ownedBy(key).filter((f) => problems[f]).length;

  const index = STEPS.findIndex((x) => x.key === step);
  const isLast = step === "review";

  function goTo(next: StepKey) {
    setStep(next);
    setReached((r) => (r.includes(next) ? r : [...r, next]));
    // A step change is a page change to the reader; leaving them scrolled
    // halfway down the previous step's fields is disorienting.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Advance, but only after marking THIS step's problems visible. */
  function next() {
    const owned = ownedBy(step);
    if (owned.some((f) => problems[f])) {
      setTouched((t) => ({
        ...t,
        ...Object.fromEntries(owned.map((f) => [f, true])),
      }));
      return;
    }
    goTo(STEPS[Math.min(STEPS.length - 1, index + 1)].key);
  }

  /** Send the reader to the step that owns *field*, with it marked. */
  function revealField(field: string) {
    const owner = STEPS.find((x) => (x.fields as readonly string[]).includes(field));
    setTouched((t) => ({ ...t, [field]: true }));
    if (owner) goTo(owner.key);
  }

  const chosenClass = classes.find((c) => String(c.id) === form.school_class);

  function body(extra: Partial<EnrolWrite>): EnrolWrite {
    const clean = (v: string) => v.trim();
    return access.writableOnly({
      first_name: clean(form.first_name),
      middle_name: clean(form.middle_name),
      last_name: clean(form.last_name),
      date_of_birth: form.date_of_birth,
      gender: form.gender as Gender,
      nationality: clean(form.nationality),
      state_of_origin: clean(form.state_of_origin),
      address: clean(form.address),
      phone: clean(form.phone),
      email: clean(form.email),
      previous_school: clean(form.previous_school),
      blood_group: clean(form.blood_group),
      allergies: clean(form.allergies),
      conditions: clean(form.conditions),
      emergency_contact_name: clean(form.emergency_contact_name),
      emergency_contact_phone: clean(form.emergency_contact_phone),
      student_number: clean(admissionNumber),
      as_applicant: asApplicant,
      ...(branchLens.applies && branchValue ? { branch: branchValue } : {}),
      ...(asApplicant
        ? { applied_for: Number(form.applied_for) }
        : {
            school_class: Number(form.school_class),
            enrolment_date: form.enrolment_date,
          }),
      allow_over_capacity: allowOverCapacity,
      confirm_duplicate: false,
      guardians: guardians
        .filter((g) =>
          g.kind === "existing" ? Boolean(g.guardianId) : draftName(g),
        )
        .map((g) =>
          g.kind === "existing"
            ? {
                guardian_id: g.guardianId,
                relationship: g.relationship,
                is_primary: g.is_primary,
              }
            : guardianAccess.writableOnly({
                first_name: g.first_name.trim(),
                ...(g.middle_name.trim() ? { middle_name: g.middle_name.trim() } : {}),
                last_name: g.last_name.trim(),
                phone: g.phone.trim(),
                ...(g.email.trim() ? { email: g.email.trim() } : {}),
                relationship: g.relationship,
                is_primary: g.is_primary,
              }, CREATING),
        ),
      ...extra,
    }, CREATING);
  }

  async function submit(extra: Partial<EnrolWrite> = {}) {
    if (!valid) {
      setTouched(
        Object.fromEntries(Object.keys(problems).map((k) => [k, true])),
      );
      // Land on the FIRST step that is short of something rather than saying
      // "some details are missing" over a summary that shows none of them.
      const short = STEPS.find((x) => missingIn(x.key) > 0);
      if (short) goTo(short.key);
      toast.error("Some required details are missing. They are marked below.");
      return;
    }
    try {
      const created = await enrol(body(extra)).unwrap();
      toast.success(created.message || "Student saved.");
      navigate(
        asApplicant
          ? routesPath.PROTECTED.STUDENTS.APPLICANTS
          : routesPath.PROTECTED.STUDENTS.PROFILE_ID(created.data.id),
      );
    } catch (error) {
      const { code } = parseApiError(error);
      const message = writeErrorMessage(error, "We could not save that student.");
      // Two refusals are questions rather than faults, and each gets asked
      // rather than being pre-answered on the registrar's behalf.
      if (code === "DUPLICATE_STUDENT" || /already on the roll/i.test(message)) {
        setConfirmDuplicate(message);
        return;
      }
      if (/capacit/i.test(message) && !allowOverCapacity) {
        setAllowOverCapacity(true);
        toast.warning(`${message} Save again to go ahead anyway.`);
        return;
      }
      // A field-keyed refusal belongs beside its field. Without this the
      // registrar reads "that number is already taken" on the Review step,
      // three steps away from the box that holds it.
      const named = Object.entries(fieldErrors(error))[0];
      if (named) {
        revealField(named[0]);
        toast.error(named[1]);
        return;
      }
      toast.error(message);
    }
  }

  return (
    <PageShell className="content-start gap-6 pb-24" grid>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-black-01">
          {asApplicant ? "Save an applicant" : "Enrol a student"}
        </h2>
        <p className="mt-1 text-sm text-gray-01">
          {asApplicant
            ? "An applicant is on nobody's register yet. They take no seat, and they are confirmed onto the roll once the school decides."
            : "A student joins the roll and takes a seat in a class today."}
        </p>
      </div>

      {/* The choice, said rather than implied.
          Two unlabelled pills asked the reader to work out that they were
          choosing WHAT to create - and the difference between the two is the
          most consequential thing on the form, because one takes a class seat
          and the other does not. */}
      <fieldset data-guide="student-enrol.shape" className="min-w-0">
        <legend className="text-xs font-medium text-gray-05">
          What are you creating?
        </legend>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          {[
            {
              key: false,
              label: "Enrol a student",
              note: "Joins the roll now and takes a class seat.",
            },
            {
              key: true,
              label: "Save as an applicant",
              note: "Waiting on a decision. Takes no seat.",
            },
          ].map((option) => {
            const picked = asApplicant === option.key;
            return (
              <button
                key={String(option.key)}
                type="button"
                role="radio"
                aria-checked={picked}
                onClick={() => chooseShape(option.key)}
                className={cn(
                  "min-w-0 rounded-lg border px-4 py-3 text-left transition-colors",
                  picked
                    ? "border-primary bg-white-03"
                    : "border-border bg-white hover:border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    picked ? "text-primary" : "text-black-01",
                  )}
                >
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-05">
                  {option.note}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Phones get a counter, not the rail. Five labels do not fit at 390px:
          the strip scrolls, so what you actually see is "Studer / Placeme /
          Guardia" - clipped words that read as broken rather than as something
          to swipe. The counter says the same thing and fits. Back-navigation is
          still there: the footer's Back button, and Edit on the review. */}
      <p
        data-guide="student-enrol.steps"
        className="text-sm font-semibold text-black-01 sm:hidden"
      >
        Step {index + 1} of {STEPS.length} · {STEPS[index].label}
      </p>

      <StepRail
        current={step}
        onGo={(key) => goTo(key as StepKey)}
        steps={STEPS.map((x) => ({
          key: x.key,
          label: x.label,
          visited: reached.includes(x.key),
          missing: missingIn(x.key),
        }))}
      />

      <p className="-mt-3 text-xs text-gray-05">
        {STEPS[index].hint}
        {STEPS[index].optional ? " You can skip this." : ""}
      </p>

      {step === "student" && (
      <Section data-guide="student-enrol.step-student" title="The student">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <AccessField access={access} name="first_name" creating>
            <Field label="First name" error={err("first_name")} required>
              <input
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                onBlur={() => touch("first_name")}
                className={err("first_name") ? errorInputClass : inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="middle_name" creating>
            <Field label="Middle name (optional)">
              <input
                value={form.middle_name}
                onChange={(e) => set("middle_name", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="last_name" creating>
            <Field label="Last name" error={err("last_name")} required>
              <input
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                onBlur={() => touch("last_name")}
                className={err("last_name") ? errorInputClass : inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="date_of_birth" creating>
            <Field
              label="Date of birth"
              required
              error={err("date_of_birth")}
              hint={
                !problems.date_of_birth && form.date_of_birth
                  ? `${Number(today().slice(0, 4)) - Number(form.date_of_birth.slice(0, 4))} years old`
                  : undefined
              }
            >
              <DatePickerInput
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
                onBlur={() => touch("date_of_birth")}
                className={err("date_of_birth") ? errorInputClass : inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="gender" creating>
            <Field label="Gender" error={err("gender")} required>
              <ChoiceButtons
                ariaLabel="Gender"
                value={form.gender}
                onChange={(next) => {
                  set("gender", next);
                  touch("gender");
                }}
                options={[
                  { value: "FEMALE", label: "Female" },
                  { value: "MALE", label: "Male" },
                ]}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="nationality" creating>
            <Field label="Nationality">
              <input
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="state_of_origin" creating>
            <Field label="State of origin">
              <input
                value={form.state_of_origin}
                onChange={(e) => set("state_of_origin", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="previous_school" creating>
            <Field label="Previous school (optional)">
              <input
                value={form.previous_school}
                onChange={(e) => set("previous_school", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
        </div>
      </Section>
      )}

      {step === "placement" && (
      <Section
        data-guide="student-enrol.step-placement"
        title={asApplicant ? "The application" : "Admission"}
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          {/* Absent at a single-branch school: the dimension recedes there and
              the server fills it in, so asking would be a question with one
              answer. */}
          {branchLens.applies && (
            <Field
              label="Branch"
              error={err("branch")}
              hint={
                branchPinned
                  ? `Set by the branch you are working in. Switch it in the sidebar to enrol elsewhere.`
                  : "Where this student attends. It cannot be changed here later."
              }
            >
              <NativeSelect
                // Read-only while the workspace is pinned to one branch: the
                // choice has already been made, one level up, and two controls
                // answering the same question can disagree.
                disabled={branchPinned}
                value={branchValue}
                onChange={(e) => {
                  set("branch", e.target.value);
                  touch("branch");
                }}
                className="h-9"
              >
                <option value="">Select a branch</option>
                {branchLens.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}

          {asApplicant ? (
            <Field
              label="Level applied for"
              error={err("applied_for")}
              required
              hint={
                branchLens.applies && !branchValue
                  ? "Pick a branch first - levels are read from its classes."
                  : undefined
              }
            >
              <NativeSelect
                disabled={branchLens.applies && !branchValue}
                value={form.applied_for}
                onChange={(e) => {
                  set("applied_for", e.target.value);
                  touch("applied_for");
                }}
                className="h-9"
              >
                <option value="">Select a level</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <>
              <Field
                label="Entry class"
                required
                error={err("school_class")}
                hint={
                  branchLens.applies && !branchValue
                    ? "Pick a branch first - a class belongs to one."
                    : "Classes come from Academic Structure."
                }
              >
                <NativeSelect
                  // Shut until a branch is chosen, because the branch decides
                  // which classes exist. Open, it would list every class and
                  // then quietly drop the one just chosen.
                  disabled={branchLens.applies && !branchValue}
                  value={form.school_class}
                  onChange={(e) => {
                    set("school_class", e.target.value);
                    touch("school_class");
                    setAllowOverCapacity(false);
                  }}
                  className="h-9"
                >
                  <option value="">Select a class</option>
                  {branchClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.capacity == null
                        ? ` · ${c.used} enrolled`
                        : ` · ${c.used}/${c.capacity}`}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <AccessField access={access} name="enrolment_date" creating>
                <Field label="Admission date">
                  <DatePickerInput
                    value={form.enrolment_date}
                    onChange={(e) => set("enrolment_date", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </AccessField>
            </>
          )}

          <AccessField access={access} name="student_number" creating>
            <Field
              label={
                policy?.required ? "Admission number" : "Admission number (optional)"
              }
              error={err("student_number")}
              hint={
                !numberOwned && policy?.suggestion
                  ? `Suggested: the next number after ${policy.suggestion.replace(
                      /(\d+)$/,
                      (d) => String(Number(d) - 1).padStart(d.length, "0"),
                    )}. Change it if your school numbers differently.`
                  : policy?.hint ||
                    (policy?.required
                      ? undefined
                      : "This school has not set a format. Leave it blank to issue one later.")
              }
            >
              <input
                data-guide="student-enrol.admission-number"
                value={admissionNumber}
                onChange={(e) => {
                  setNumberOwned(true);
                  set("student_number", e.target.value);
                  touch("student_number");
                }}
                className={err("student_number") ? errorInputClass : inputClass}
              />
            </Field>
          </AccessField>
        </div>

        {chosenClass && !asApplicant && (
          <p
            className={
              chosenClass.remaining != null && chosenClass.remaining <= 0
                ? "mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                : "mt-3 text-xs text-gray-05"
            }
          >
            {chosenClass.capacity == null
              ? `${chosenClass.name} has no capacity set. ${chosenClass.used} enrolled.`
              : chosenClass.remaining != null && chosenClass.remaining <= 0
                ? `${chosenClass.name} is full at ${chosenClass.used} of ${chosenClass.capacity}. You can still enrol; the class will show as over capacity.`
                : `Joining ${chosenClass.name} · ${chosenClass.used} of ${chosenClass.capacity} seats used, ${chosenClass.remaining} free.`}
          </p>
        )}
      </Section>
      )}

      {step === "details" && (<>
      <Section data-guide="student-enrol.step-details" title="Contact">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <AccessField access={access} name="address" creating>
            <Field label="Home address">
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="phone" creating>
            <Field label="Student phone (optional)">
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="email" creating>
            <Field label="Student email (optional)">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
        </div>
      </Section>

      {/* Contact and medical sit together: both are optional, and splitting
          them would be two steps a registrar presses Next through. */}

      <Section
        title="Medical"
        note="Optional. Your school decides which roles can read these back."
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          {MEDICAL_INPUTS.map(({ name, label }) => (
            <AccessField key={name} access={access} name={name} creating>
              <Field label={label}>
                <input
                  value={form[name]}
                  onChange={(e) => set(name, e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
          ))}
          <AccessField access={access} name="emergency_contact_name" creating>
            <Field label="Emergency contact">
              <input
                value={form.emergency_contact_name}
                onChange={(e) => set("emergency_contact_name", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
          <AccessField access={access} name="emergency_contact_phone" creating>
            <Field label="Emergency phone">
              <input
                value={form.emergency_contact_phone}
                onChange={(e) => set("emergency_contact_phone", e.target.value)}
                className={inputClass}
              />
            </Field>
          </AccessField>
        </div>
      </Section>
      </>)}

      {step === "guardians" && (
        <Panel
          as="section"
          data-guide="student-enrol.step-guardians"
          className="px-5.5 py-5"
        >
        <GuardianRows
          rows={guardians}
          onChange={setGuardians}
          error={touched.guardians ? problems.guardians : undefined}
        />
        </Panel>
      )}

      {step === "review" && (
        <Review
          form={form}
          admissionNumber={body({}).student_number ?? ""}
          hidden={(name) => access.isHidden(name, CREATING)}
          guardians={guardians}
          asApplicant={asApplicant}
          className={chosenClass?.name}
          levelName={levels.find((l) => String(l.id) === form.applied_for)?.name}
          branchName={
            branchLens.branches.find((b) => String(b.id) === branchValue)?.name
          }
          onJump={goTo}
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white-02 pt-4">
        {/* The count is for the WHOLE form, not this step, so nothing can be
            hiding two steps back when Review is reached. */}
        <span className="mr-auto text-xs text-gray-05" aria-live="polite">
          {valid
            ? "Ready to save."
            : `${Object.keys(problems).length} ${Object.keys(problems).length === 1 ? "detail" : "details"} still needed`}
        </span>
        <Button
          variant="outline"
          onClick={() =>
            index === 0
              ? navigate(routesPath.PROTECTED.STUDENTS.INDEX)
              : goTo(STEPS[index - 1].key)
          }
          disabled={isLoading}
        >
          {index === 0 ? "Cancel" : "Back"}
        </Button>
        {isLast ? (
          <PermissionGate
            permission={ENROL_PERMISSIONS}
            mode="all"
            fallback={
              <span className="text-xs text-gray-05">
                Enrolling needs both the enrol and the class-assignment
                permissions.
              </span>
            }
          >
            <Button
              data-guide="student-enrol.save"
              onClick={() => submit()}
              disabled={isLoading}
            >
              {isLoading
                ? "Saving…"
                : asApplicant
                  ? "Save applicant"
                  : allowOverCapacity
                    ? "Enrol anyway"
                    : "Enrol student"}
            </Button>
          </PermissionGate>
        ) : (
          <Button
            data-guide="student-enrol.next"
            onClick={next}
            disabled={isLoading}
          >
            {STEPS[index].optional ? "Skip" : "Next"}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDuplicate != null}
        onCancel={() => setConfirmDuplicate(null)}
        onConfirm={() => {
          setConfirmDuplicate(null);
          void submit({ confirm_duplicate: true });
        }}
        title="Is this a different child?"
        body={confirmDuplicate ?? ""}
        confirmLabel="Yes, enrol them"
        busy={isLoading}
      />
    </PageShell>
  );
}

function Section({
  title,
  note,
  children,
  ...rest
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    // On a surface, like every other panel in the app. The sections rendered
    // bare on the page background, so a form of twenty-one fields read as
    // labels floating in space with nothing holding them together - no edge
    // saying where one group of questions ends and the next begins.
    <Panel as="section" className="px-5.5 py-5" {...rest}>
      <h3 className="text-sm font-semibold text-black-01">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-gray-05">{note}</p>}
      {/* A rule under the heading, so the heading reads as a heading rather
          than as the first line of the fields below it. */}
      <div className="mt-4 border-t border-white-02 pt-4">{children}</div>
    </Panel>
  );
}

/**
 * What is about to be saved, in the order it will be read back.
 *
 * A review that only repeats the required fields is a formality. This one names
 * the things a registrar gets wrong and cannot see from the form: which branch
 * the child is being recorded at, whether an admission number was issued at
 * all, and - the one that matters - which guardian the school will actually
 * ring. Each block jumps back to the step that owns it, because spotting a
 * mistake here and having to hunt for the field is how it gets left in.
 *
 * The admission number is taken from the body the save sends, not from the
 * typed field: an untouched field sends the school's suggested number, and a
 * field the registrar may not write sends none.
 */
export function Review({
  form,
  admissionNumber,
  hidden,
  guardians,
  asApplicant,
  className,
  levelName,
  branchName,
  onJump,
}: {
  form: Record<string, string>;
  /** The admission number the save will send, blank when none is sent. */
  admissionNumber: string;
  /** Field Access on this Add form: a field it does not offer is not summarised either. */
  hidden: (name: string) => boolean;
  guardians: GuardianDraft[];
  asApplicant: boolean;
  className?: string;
  levelName?: string;
  branchName?: string;
  onJump: (step: StepKey) => void;
}) {
  const named = guardians.filter((g) =>
    g.kind === "existing" ? Boolean(g.guardianId) : draftName(g),
  );
  const primary = named.find((g) => g.is_primary);
  const fullName = [form.first_name, form.middle_name, form.last_name]
    .filter(Boolean)
    .join(" ");

  const medical = [
    ...MEDICAL_INPUTS.filter(({ name }) => !hidden(name)).map(({ name }) => form[name]),
    form.emergency_contact_name,
  ].some(Boolean);

  return (
    <div data-guide="student-enrol.step-review" className="grid gap-4">
      <Block title="Student" onEdit={() => onJump("student")}>
        <Line label="Name" value={fullName || "Not given"} />
        <Line label="Date of birth" value={form.date_of_birth || "Not given"} />
        <Line
          label="Gender"
          value={form.gender === "FEMALE" ? "Female" : form.gender === "MALE" ? "Male" : "Not given"}
        />
        {form.previous_school && (
          <Line label="Previous school" value={form.previous_school} />
        )}
      </Block>

      <Block
        title={asApplicant ? "Application" : "Placement"}
        onEdit={() => onJump("placement")}
      >
        {branchName && <Line label="Branch" value={branchName} />}
        {asApplicant ? (
          <Line label="Level applied for" value={levelName ?? "Not picked"} />
        ) : (
          <>
            <Line label="Entry class" value={className ?? "Not picked"} />
            {!hidden("enrolment_date") && (
              <Line label="Admission date" value={form.enrolment_date} />
            )}
          </>
        )}
        <Line
          label="Admission number"
          value={
            admissionNumber.trim() ||
            "Not issued - it can be added later from the record"
          }
        />
        <p className="mt-2 text-xs text-gray-05">
          {asApplicant
            ? "Saved as an applicant. They take no seat until they are confirmed."
            : "Enrolled and seated. The class seat is taken on save."}
        </p>
      </Block>

      <Block title="Guardians" onEdit={() => onJump("guardians")}>
        {named.length === 0 ? (
          <p className="text-sm text-amber-700">
            Nobody linked. At least one guardian is required.
          </p>
        ) : (
          <ul className="grid gap-1.5">
            {named.map((g, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="text-black-01">
                  {g.kind === "existing" ? g.guardianName : draftName(g)}
                </span>
                <span className="text-xs text-gray-05">
                  {RELATIONSHIPS.find((r) => r.value === g.relationship)?.label ??
                    "No relationship set"}
                </span>
                {g.is_primary && (
                  <span className="rounded-full bg-white-03 px-2 py-0.5 text-xs text-primary">
                    Primary contact
                  </span>
                )}
                {g.kind === "new" && (
                  <span className="text-xs text-gray-05">new record</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {primary && (
          <p className="mt-2 text-xs text-gray-05">
            The school will call{" "}
            {primary.kind === "existing" ? primary.guardianName : draftName(primary)}{" "}
            first.
          </p>
        )}
      </Block>

      <Block title="Details" onEdit={() => onJump("details")}>
        <Line label="Home address" value={form.address || "Not recorded"} />
        <Line
          label="Medical"
          value={medical ? "Recorded" : "Nothing recorded"}
        />
      </Block>
    </div>
  );
}

function Block({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Panel as="section" className="min-w-0 p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-gray-05">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          Edit
        </button>
      </div>
      {children}
    </Panel>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 py-0.5 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:gap-3">
      <span className="text-xs text-gray-05 sm:pt-0.5">{label}</span>
      <span className="min-w-0 break-words text-sm text-black-01">{value}</span>
    </div>
  );
}
