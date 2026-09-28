import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const MATCHING = [
  ["Email, then phone", "Two children whose guardian shares an email, or failing that a phone number, share one guardian record. This is what a school has until it chooses."],
  ["Email only", "Only a shared email makes siblings. Families who share a landline stay separate."],
] as const;

const PROBLEMS = [
  ["Guardians is not in Settings", "It opens for a role that can view school settings, and only when your school's plan includes the students module."],
  ["The boxes are greyed out and there is no Save", "Your role can read these rules but not change them. The screen says so at the bottom. A school administrator makes the changes."],
  ["Choose 1 to 4 guardians", "At least takes a whole number from 1 to 4."],
  ["That relationship is already on the list", "The word is one of the fixed relationships, such as Mother, or one your school has already added. Capitals do not make it different."],
  ["A child was imported with fewer guardians than the minimum", "That is expected. An import brings in one guardian per row and warns that the student needs more. Add the others on the student's record or with the guardians import."],
  ["A relationship you removed still shows on a child", "Removing a word stops it being offered. Children already linked with it keep it."],
] as const;

export default function SettingsGuardiansArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Guardians</strong> in <strong>Settings</strong> holds the rules every guardian on the school&apos;s records is checked against: how many each child needs, what a new guardian must give, how one family is recognised across several children, and the relationship words your school uses. The enrolment form, the guardian drawers, both imports and the server all apply the same rules.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "Your school's plan includes the students module.",
          "You have agreed the rules with whoever runs admissions.",
        ]} />
      </GuideSection>

      <GuideSection id="guardians-per-child" title="Guardians per child">
        <p>Under <strong>Guardians per child</strong>, set <strong>At least</strong> to a number from 1 to 4. It starts at 1.</p>
        <p>Set it to 2 and a child cannot be enrolled with one guardian: the form says <strong>This school asks for 2 guardians for every child.</strong> A guardian also cannot be unlinked from a child who would then have fewer.</p>
        <GuideCallout tone="info" title="An import is not held back">A student import brings in one guardian per row. Where the minimum is higher, each such row is imported with a warning, and the student&apos;s record shows that more guardians are needed. Add them on the record or with the guardians import.</GuideCallout>
      </GuideSection>

      <GuideSection id="contact-details" title="Contact details">
        <p>A phone number is always required for a new guardian. Turn on <strong>Email required for a new guardian</strong> and an email is required too: the forms drop &quot;(optional)&quot; from <strong>Email</strong>, and a new guardian without one is refused with <strong>A guardian email is required at this school.</strong></p>
        <p>A guardian already on the school&apos;s records without an email can still be linked to another child, because nothing new is written about them.</p>
      </GuideSection>

      <GuideSection id="recognising-siblings" title="Recognising siblings">
        <p>When a new child&apos;s guardian matches one already at the school, the two children share that guardian rather than creating a second record for the same parent. Under <strong>Recognising siblings</strong>, choose how a match is made:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MATCHING.map(([title, body]) => (
            <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="your-own-relationships" title="Your own relationships">
        <p>Every picker offers Mother, Father, Uncle, Aunt, Grandparent, Legal guardian, Sibling and Other. Under <strong>Your own relationships</strong>, add the words your school also uses, such as Sponsor or Driver.</p>
        <GuideSteps>
          <GuideStep title="Add a word">Type it in the box and select <strong>Add</strong>, or press Enter. A word is at most 30 characters, and a school can add up to 10.</GuideStep>
          <GuideStep title="Remove a word">Select the cross on its chip. Children already linked with it keep it; it is simply no longer offered.</GuideStep>
        </GuideSteps>
        <p>Your words appear in every relationship picker between the fixed ones and Other, and a guardian&apos;s page and a student&apos;s profile show your word.</p>
      </GuideSection>

      <GuideSection id="save-the-rules" title="Save the rules">
        <GuideSteps>
          <GuideStep title="Make your changes">Change any of the four panels. <strong>Unsaved changes</strong> appears beside the button while something is not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save guardian rules</strong>. XVS confirms with <strong>Guardian rules saved.</strong> and the next guardian added or linked follows them.</GuideStep>
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
        <GuideCallout tone="tip" title="You are done when">The minimum, the email rule, the way siblings are recognised and your own relationship words are the ones your school agreed, no unsaved changes are left, and the enrolment form asks for guardians the way you set.</GuideCallout>
      </GuideSection>
    </div>
  );
}
