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
  ["Enrolment refuses a real admission number", "The rule does not match the numbers your school uses. Try that number in Try a number, adjust the rule until it is accepted, and save again. If the child joins a branch with its own rule, check that branch's rule rather than the school's."],
  ["A blank number was not issued automatically", "Automatic numbers continue the series already issued. With no number issued yet, or when the next one would break the rule (for example a year inside the number that has moved on), nothing is issued and the rule applies as it stands."],
  ["There is no branch picker", "Your school has one branch, so there is only the school's rule."],
] as const;

export default function SettingsAdmissionNumbersArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Admission numbers</strong> in <strong>Settings</strong> sets whether every child must have an admission number when they are enrolled, what a valid one looks like at your school, and whether XVS issues the next one for you. A branch can keep a rule of its own. A number is unique across the whole school whichever rule it follows.</p>
        <GuideChecklist items={[
          "Your role can edit student records.",
          "You have a few real admission numbers to hand, to test the rule against.",
        ]} />
      </GuideSection>

      <GuideSection id="whole-school-or-branch" title="Choose the whole school or a branch">
        <p>If your school has more than one branch, a picker at the top lists <strong>Whole school</strong> and the branches you work in. The sentence beside it says which rule you are editing:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Whole school</strong> is the school&apos;s rule, followed by every branch that has not set its own.</li>
          <li>A branch that <strong>follows the school&apos;s rule</strong> shows the school&apos;s values. Saving here gives it a rule of its own.</li>
          <li>A branch that <strong>has its own rule</strong> shows that rule. A child joining that branch is checked against it.</li>
        </ul>
        <p>For example, the Lekki Branch can number its pupils LK/0001 while the rest of the school uses BSS/0001.</p>
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
          <GuideStep title="Save">Select <strong>Save rule</strong>. XVS confirms with <strong>Admission number rule saved.</strong>, or names the branch when you saved a branch&apos;s rule.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Test before you save">A rule that refuses your real numbers stops enrolment until it is fixed. Always check a few genuine numbers in <strong>Try a number</strong> first.</GuideCallout>
      </GuideSection>

      <GuideSection id="issue-automatically" title="Issue numbers automatically">
        <p>Turn on <strong>Issue numbers automatically</strong> and an enrolment that leaves the admission number blank is given the next number in the series. After BSS/0142, the next child gets BSS/0143. Save the rule to keep the switch.</p>
        <p>The next number is worked out from the last one issued, so it needs numbers that end in digits and at least one already issued. A branch with its own rule keeps its own series. A number another child already holds is skipped.</p>
      </GuideSection>

      <GuideSection id="use-the-schools-rule" title="Put a branch back on the school's rule">
        <p>With a branch picked that has its own rule, <strong>Use the school&apos;s rule</strong> appears beside <strong>Save rule</strong>. Select it to drop the branch&apos;s rule. It takes effect straight away, and the branch follows the school&apos;s rule and series from then on.</p>
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
        <GuideCallout tone="tip" title="You are done when">Your real admission numbers are accepted in <strong>Try a number</strong>, the hint gives a clear example, <strong>Issue numbers automatically</strong> is set the way your school works, and each branch you picked follows the rule you intend.</GuideCallout>
      </GuideSection>
    </div>
  );
}
