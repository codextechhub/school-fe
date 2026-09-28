import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const DOCUMENTS = [
  "Birth certificate",
  "Previous report card",
  "Passport photograph",
  "Transfer certificate",
  "Immunisation record",
] as const;

const DETAILS = [
  "Middle name",
  "Nationality",
  "State of origin",
  "Previous school",
  "Home address",
  "Student phone",
  "Student email",
  "Emergency contact",
  "Emergency phone",
  "Blood group",
] as const;

const MODES = [
  ["Warn, then allow", "A full class says so, and the person enrolling can go ahead anyway. This is what a school has until it chooses."],
  ["Never over capacity", "A full class takes nobody else, whether the child is being enrolled, moved or promoted into it."],
  ["Don't check", "Capacity is shown for information only and never stops anybody."],
] as const;

const PROBLEMS = [
  ["Enrolment is not in Settings", "It opens for a role that can view school settings, and only when your school's plan includes the students module."],
  ["The boxes are greyed out and there is no Save", "Your role can read these rules but not change them. The screen says so at the bottom. A school administrator makes the changes."],
  ["The youngest age must be below the oldest", "Youngest and Oldest are the wrong way round, or the same. Ages run from 0 to 99."],
  ["Leave it blank for no limit, or enter 1 to 500", "Capacity of a new class takes a whole number from 1 to 500, or nothing at all."],
  ["A child was enrolled without a document you ticked", "That is expected. Documents are a prompt, never a gate. The child's record shows as incomplete until the file is uploaded on their Documents tab."],
  ["An existing class did not change size", "Capacity of a new class only fills in classes created without a capacity from now on. Change an existing class's capacity in Academic Structure."],
] as const;

export default function SettingsEnrolmentArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Enrolment</strong> in <strong>Settings</strong> holds the rules a new pupil&apos;s record is checked against: how old they may be, what the school asks for, and how full a class may get. The enrolment form, the student edit form and the server all read these same rules.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "Your school's plan includes the students module.",
          "You have agreed the age range, documents and class limits with whoever runs admissions.",
        ]} />
      </GuideSection>

      <GuideSection id="age-at-enrolment" title="Age at enrolment">
        <p>Under <strong>Age at enrolment</strong>, set <strong>Youngest</strong> and <strong>Oldest</strong>. They start at 2 and 25. A date of birth that puts a child outside this range is refused as a mistyped year, so 1998 typed for 2008 is caught before it reaches the roll. Age is counted in calendar years.</p>
      </GuideSection>

      <GuideSection id="documents-to-ask-for" title="Documents to ask for">
        <p>Under <strong>Documents to ask for</strong>, tick each document your school wants on file. Until you choose, only the birth certificate is asked for.</p>
        <GuideChecklist items={DOCUMENTS} />
        <GuideCallout tone="info" title="A prompt, never a gate">A child missing a ticked document can still be enrolled. Their record shows as incomplete until the file is uploaded on their <strong>Documents</strong> tab, because a school registering a child on the day they arrive rarely has every paper in hand.</GuideCallout>
      </GuideSection>

      <GuideSection id="details-required" title="Details required at enrolment">
        <p>Name, date of birth, gender and a class are always required. Under <strong>Details required at enrolment</strong>, tick anything else a new record must have:</p>
        <GuideChecklist items={DETAILS} />
        <p>A ticked detail loses &quot;(optional)&quot; on the enrolment form, and the form will not save without it: an empty one reads <strong>Required at this school.</strong> If XVS refuses the save itself, its message names the detail, for example <strong>Home address is required at this school.</strong> The details carry the same names here as on the form. Student phone and Student email are the student&apos;s own, not a guardian&apos;s.</p>
        <p>Records already on the roll are not affected until somebody edits that detail. From then on it cannot be emptied.</p>
      </GuideSection>

      <GuideSection id="class-capacity" title="Class capacity">
        <p>Under <strong>Class capacity</strong>, choose what happens when a class is full:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p><strong>Capacity of a new class</strong> is the size a class gets when it, or a set of arms, is created without one. Leave it blank for no limit. Existing classes keep the capacity they have.</p>
        <GuideCallout tone="warning" title="Never over capacity applies to promotion too">Under <strong>Never over capacity</strong>, a promotion that would overfill a class cannot be run until the class is made bigger, an arm is added, or some pupils are held back. Choose it only if every class has a capacity you are happy to be held to.</GuideCallout>
      </GuideSection>

      <GuideSection id="save-the-rules" title="Save the rules">
        <GuideSteps>
          <GuideStep title="Make your changes">Change any of the four panels. <strong>Unsaved changes</strong> appears beside the button while something is not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save enrolment rules</strong>. XVS confirms with <strong>Enrolment rules saved.</strong> and the next enrolment follows them.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The age range, documents, required details and capacity rule are the ones your school agreed, no unsaved changes are left, and the enrolment form marks the details you required.</GuideCallout>
      </GuideSection>
    </div>
  );
}
