import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["Days signed in will not save", "Enter a whole number from 1 to 90."],
  ["Student portal is not in Settings", "It opens for a role that can view school settings, at a school whose plan includes students. Ask whoever manages roles at your school."],
  ["The switch is greyed out and there is no Save", "Your role reads these rules without changing them, or you work in one branch. The rule covers every branch, so only somebody who covers the whole school can change it."],
  ["A student cannot sign in at all", "Signing in is not set here. Give the student portal access from their profile, or a whole class from the class page."],
  ["A student says there is no Pay button", "Students paying their own fees is set in Finance settings, under Fee due dates, beside the fee due date."],
] as const;

export default function SettingsStudentPortalArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Student portal</strong> in <strong>Settings</strong> sets what students may change for themselves once they can sign in. A student signs in on your school&apos;s own sign-in page with their admission number or email, after portal access has been given from their profile. Most of what they see, such as their timetable, attendance and results, they can only read.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update settings as well, and a reach over the whole school.",
        ]} />
      </GuideSection>

      <GuideSection id="photograph" title="Decide who changes the photograph">
        <GuideSteps>
          <GuideStep title="Choose">Turn on <strong>Students may change their own photograph</strong> to let a student upload a new photograph or remove theirs from the portal. Turn it off and only staff change it, from the student&apos;s profile.</GuideStep>
          <GuideStep title="Save">Select <strong>Save student portal rules</strong>. XVS confirms with <strong>Student portal rules saved.</strong> It applies to every branch straight away.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A school that never sets it">Students may change their own photograph until the rule is turned off.</GuideCallout>
      </GuideSection>

      <GuideSection id="staying-signed-in" title="Decide how long students stay signed in">
        <p>Students use the student app on their own phone or tablet, or a family one. Under <strong>Staying signed in</strong>, <strong>Days signed in</strong> is how long a student stays signed in without opening the app, from 1 to 90 days. Each time they open it the count starts again, so a student who uses the app every week never has to sign in. Select <strong>Save student portal rules</strong>; it applies from each student&apos;s next use of the app.</p>
        <GuideCallout tone="info" title="A school that never sets it">Students stay signed in for 30 days between uses. Staff are not affected: they sign in as they always have.</GuideCallout>
      </GuideSection>

      <GuideSection id="paying-fees" title="Students paying their own fees">
        <p>Whether a student may pay their own fees from the portal, and the smallest part payment they may make, is a fee rule. It is kept in <strong>Finance settings</strong>, under <strong>Fee due dates</strong>, beside the fee due date.</p>
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
        <GuideCallout tone="tip" title="You are done when">The photograph switch and the days signed in are set the way your school works, and you know where the fee rule for students is kept.</GuideCallout>
      </GuideSection>
    </div>
  );
}
