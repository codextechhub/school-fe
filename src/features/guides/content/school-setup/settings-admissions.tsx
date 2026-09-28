import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["Admissions is not in Settings", "It opens for a role that can view school settings, and only when your school's plan includes the students module."],
  ["The boxes are greyed out and there is no Save", "Your role can read these rules but not change them. The screen says so at the bottom. A school administrator makes the changes."],
  ["A step's bin cannot be selected", "Applicants are at that step now. Hold the pointer over the bin to see how many. Move them to another step on the applicants board first."],
  ["Two steps have this name", "Each step needs its own name. Capitals do not make two names different."],
  ["Give the family 1 to 365 days to accept", "An offer step needs a whole number of days from 1 to 365."],
  ["An offer ran out and nothing happened", "That is by design. A lapsed offer is flagged on the applicants board for somebody to decide. XVS never closes an application on its own."],
] as const;

export default function SettingsAdmissionsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Admissions</strong> in <strong>Settings</strong> holds the steps an applicant goes through at your school, in your school&apos;s own words, and the documents a child needs before being put on the roll. A school with no steps admits on the spot, and its applicants board works as it always has.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "Your school's plan includes the students module.",
          "You have agreed the steps with whoever runs admissions, such as Interview, Assessment and Offer.",
        ]} />
      </GuideSection>

      <GuideSection id="admission-steps" title="Name your admission steps">
        <GuideSteps>
          <GuideStep title="Add a step">Under <strong>Admission steps</strong>, select <strong>Add a step</strong> and type its name, such as Interview, in up to 40 characters. A school can have up to 12 steps.</GuideStep>
          <GuideStep title="Put them in order">Use the up and down arrows beside a step. Applicants move through the steps in this order.</GuideStep>
          <GuideStep title="Remove a step">Select its bin. A step with applicants at it cannot be removed; the line under it says how many are there, and they must be moved first.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="offer-steps" title="Make a step an offer">
        <p>Turn on <strong>An offer the family accepts</strong> for a step where the school has offered a place and is waiting for the family&apos;s answer. Set <strong>within</strong> to the number of days the family has, from 1 to 365. It starts at 14.</p>
        <p>An applicant moved to that step has an offer open until that many days later, and the applicants board shows the date.</p>
        <GuideCallout tone="warning" title="A lapsed offer waits for a person">When the days run out, the card on the applicants board says the offer has expired and asks somebody to extend it, move the child on, or close the application. XVS never closes or rejects an application by itself.</GuideCallout>
      </GuideSection>

      <GuideSection id="documents-before-enrolling" title="Documents needed before enrolling">
        <p>Under <strong>Documents needed before enrolling</strong>, tick each document an applicant must have on their record before they can be put on the roll. Leave them all unticked to allow it at once.</p>
        <p>This checks applicants only. A child enrolled directly with the enrolment form, or brought in from a spreadsheet, is not held back.</p>
        <GuideCallout tone="info" title="This is a gate, unlike enrolment's list">The documents under Enrolment are a prompt, and a child can be enrolled without them. The ones ticked here stop an applicant being put on the roll until each is uploaded on their record: <em>Tunde Bello cannot be confirmed until the birth certificate and transfer certificate are on their record.</em></GuideCallout>
      </GuideSection>

      <GuideSection id="save-the-rules" title="Save the rules">
        <GuideSteps>
          <GuideStep title="Make your changes"><strong>Unsaved changes</strong> appears beside the button while something is not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save admission rules</strong>. XVS confirms with <strong>Admission rules saved.</strong></GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Your steps are named and in order, each offer step has the days your school gives families, the documents you require are ticked, and nothing is left unsaved.</GuideCallout>
      </GuideSection>
    </div>
  );
}
