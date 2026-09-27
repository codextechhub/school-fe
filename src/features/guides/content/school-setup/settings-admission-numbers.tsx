import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const SHAPES = [
  ["Any number", "Any admission number is accepted, whatever it looks like."],
  ["Prefix and digits", "A fixed start and a run of digits, such as BSS/0142. Fill in Starts with and Then this many digits (between 1 and 12), and XVS shows an example."],
  ["Custom pattern", "For a rule that does not fit a prefix and digits. Type it as a regular expression in Pattern (a regular expression)."],
] as const;

const PROBLEMS = [
  ["Admission numbers is not in Settings", "It opens for a role that can edit student records, and only when your school's plan includes the students module."],
  ["This pattern is not valid", "The custom pattern has a bracket or symbol out of place. Check it, or switch to Prefix and digits."],
  ["Save rule stays disabled", "Nothing has changed yet, the digits are outside 1 to 12, or the custom pattern is not valid."],
  ["Enrolment refuses a real admission number", "The rule does not match the numbers your school uses. Try that number in Try a number, adjust the rule until it is accepted, and save again."],
] as const;

export default function SettingsAdmissionNumbersArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Admission numbers</strong> in <strong>Settings</strong> sets whether every child must have an admission number when they are enrolled, and what a valid one looks like at your school.</p>
        <GuideChecklist items={[
          "Your role can edit student records.",
          "You have a few real admission numbers to hand, to test the rule against.",
        ]} />
      </GuideSection>

      <GuideSection id="require-a-number" title="Decide whether a number is required">
        <p>Turn on <strong>Required at enrolment</strong> if a child should not be enrolled without an admission number. Leave it off if numbers can be added later.</p>
      </GuideSection>

      <GuideSection id="describe-a-valid-number" title="Describe a valid number">
        <p>Under <strong>What a valid number looks like</strong>, pick one of three:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SHAPES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="test-and-save" title="Test the rule and save it">
        <GuideSteps>
          <GuideStep title="Try a real number">Type one of your school&apos;s admission numbers into <strong>Try a number</strong>. XVS says <strong>This number would be accepted.</strong> or <strong>This number would be refused.</strong> Try several before you save.</GuideStep>
          <GuideStep title="Write the hint">Fill in <strong>Hint shown on the enrolment form</strong>. It is what the person enrolling a child reads under the admission number field, so give an example, such as &quot;For example BSS/0001&quot;.</GuideStep>
          <GuideStep title="Save">Select <strong>Save rule</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Test before you save">A rule that refuses your real numbers stops enrolment until it is fixed. Always check a few genuine numbers in <strong>Try a number</strong> first.</GuideCallout>
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
        <GuideCallout tone="tip" title="You are done when">Your real admission numbers are accepted in <strong>Try a number</strong>, the hint gives a clear example, and the rule is saved.</GuideCallout>
      </GuideSection>
    </div>
  );
}
