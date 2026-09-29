import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const SHAPES = [
  ["Any number", "Any staff ID is accepted, whatever it looks like."],
  ["Prefix and digits", "A fixed start and a run of digits, such as BS/STF/0042. Fill in Starts with and Then this many digits (between 1 and 12), and XVS shows an example."],
  ["Custom pattern", "For a rule that does not fit a prefix and digits. Type it as a regular expression in Pattern (a regular expression)."],
] as const;

const PROBLEMS = [
  ["Staff IDs is not in Settings", "It opens for a role that can view both school settings and staff. Ask whoever manages roles at your school."],
  ["The boxes are greyed out and there is no Save", "Your role reads this rule without changing it, or you work in one branch and are looking at the whole school's rule. Pick your own branch in the picker to set its rule."],
  ["This pattern is not valid", "The custom pattern has a bracket or symbol out of place. Check it, or switch to Prefix and digits."],
  ["Save rule stays disabled", "Nothing has changed yet, the digits are outside 1 to 12, or the custom pattern is not valid."],
  ["Add staff refuses a real staff ID", "The rule does not match the IDs your school uses. Try that ID in Try a number, adjust the rule until it is accepted, and save again. If the person is posted to a branch with its own rule, check that branch's rule rather than the school's."],
  ["A blank staff ID was not issued automatically", "Automatic IDs continue the series already issued, so with no ID issued yet there is nothing to continue. Where staff IDs are required, the Add staff form asks for the first one, and the next follows it."],
  ["There is no branch picker", "Your school has one branch, so there is only the school's rule."],
] as const;

export default function SettingsStaffIdsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Staff IDs</strong> in <strong>Settings</strong> sets whether everybody must have a staff ID when they are added to the staff, what a valid one looks like at your school, and whether XVS issues the next one for you. A branch can keep a rule of its own. A staff ID is unique across the whole school whichever rule it follows, and it also works for signing in.</p>
        <GuideChecklist items={[
          "Your role can view school settings and view staff. Saving a change needs the key to update settings as well.",
          "You have a few real staff IDs to hand, to test the rule against.",
        ]} />
      </GuideSection>

      <GuideSection id="whole-school-or-branch" title="Choose the whole school or a branch">
        <p>If your school has more than one branch, a picker at the top lists <strong>Whole school</strong> and the branches you work in. The sentence beside it says which rule you are editing:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Whole school</strong> is the school&apos;s rule, followed by every branch that has not set its own.</li>
          <li>A branch that <strong>follows the school&apos;s rule</strong> shows the school&apos;s values. Saving here gives it a rule of its own.</li>
          <li>A branch that <strong>has its own rule</strong> shows that rule. A person posted to that branch is checked against it.</li>
        </ul>
        <p>For example, the Lekki Branch can number its staff LK/STF/001 while the rest of the school uses BS/STF/0001. If you work in one branch, the screen opens on your branch, and you read the school&apos;s rule without changing it.</p>
      </GuideSection>

      <GuideSection id="require-a-number" title="Decide whether a staff ID is required">
        <p>Turn on <strong>Required when someone is added</strong> if nobody should be added to the staff without a staff ID. Leave it off if IDs can be added later. The Staff ID box on the Add staff form is marked as required when a blank would be refused.</p>
      </GuideSection>

      <GuideSection id="describe-a-valid-number" title="Describe a valid staff ID">
        <p>Under <strong>What a valid number looks like</strong>, pick one of three:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SHAPES.map(([title, body]) => (
            <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="test-and-save" title="Test the rule and save it">
        <GuideSteps>
          <GuideStep title="Try a real staff ID">Type one of your school&apos;s staff IDs into <strong>Try a number</strong>. XVS says <strong>This number would be accepted.</strong> or <strong>This number would be refused.</strong> Try several before you save.</GuideStep>
          <GuideStep title="Write the hint">Fill in <strong>Hint shown when adding staff</strong>. It is what the person adding somebody reads under the Staff ID box, and what they are told when an ID is refused, so give an example, such as &quot;For example BS/STF/0042&quot;.</GuideStep>
          <GuideStep title="Save">Select <strong>Save rule</strong>. XVS confirms with <strong>Staff ID rule saved.</strong>, or names the branch when you saved a branch&apos;s rule.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Test before you save">A rule that refuses your real staff IDs stops anybody being added until it is fixed. Always check a few genuine IDs in <strong>Try a number</strong> first.</GuideCallout>
      </GuideSection>

      <GuideSection id="issue-automatically" title="Issue staff IDs automatically">
        <p>Turn on <strong>Issue numbers automatically</strong> and a person added with the Staff ID left blank is given the next one in the series. After BS/STF/0042, the next person gets BS/STF/0043. Save the rule to keep the switch.</p>
        <p>The Add staff form shows the next ID in the empty box, for example <strong>Next: BS/STF/0043</strong>, and says it is issued if the box is left blank. Typing an ID uses that one instead. The next ID is worked out from the last one issued, so it needs IDs that end in digits and at least one already issued. A branch with its own rule keeps its own series.</p>
      </GuideSection>

      <GuideSection id="use-the-schools-rule" title="Put a branch back on the school's rule">
        <p>With a branch picked that has its own rule, <strong>Use the school&apos;s rule</strong> appears beside <strong>Save rule</strong>. Select it to drop the branch&apos;s rule. It takes effect straight away, and the branch follows the school&apos;s rule and series from then on.</p>
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
        <GuideCallout tone="tip" title="You are done when">Your real staff IDs are accepted in <strong>Try a number</strong>, the hint gives a clear example, <strong>Issue numbers automatically</strong> is set the way your school works, and each branch you picked follows the rule you intend.</GuideCallout>
      </GuideSection>
    </div>
  );
}
