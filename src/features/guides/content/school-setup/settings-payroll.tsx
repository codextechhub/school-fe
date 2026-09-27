import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["Payroll is not in Settings", "It opens for a role that can view school settings, and only when your school's plan includes the advanced finance band, where payroll runs sit."],
  ["There is no Use this button", "Your role can read this setting but not change it. A school administrator makes the change."],
  ["Per-branch payroll is not possible yet", "Somebody active has no branch. Give each person the refusal names a branch on their staff record, then try again."],
] as const;

export default function SettingsPayrollArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Payroll</strong> in <strong>Settings</strong> decides whether your school pays everybody in one payroll run, or each branch runs its own. A school runs one payroll until somebody changes this.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Changing this one needs the key to update them as well.",
          "Before choosing per branch: every active member of staff has a branch on their staff record.",
        ]} />
      </GuideSection>

      <GuideSection id="the-two-ways" title="The two ways to run payroll">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">One payroll for the whole school</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">A single payroll run pays every member of staff, whichever branch they work at.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Each branch runs its own payroll</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Each branch pays its own staff in a separate run, so every active member of staff must be on a branch first.</p>
          </div>
        </div>
        <p>The way in use carries an <strong>In use</strong> label.</p>
      </GuideSection>

      <GuideSection id="switch" title="Switch between them">
        <GuideSteps>
          <GuideStep title="Choose the other way">Under <strong>How your school runs payroll</strong>, select <strong>Use this</strong> beside the way you want.</GuideStep>
          <GuideStep title="Check the result">XVS confirms the change, and the <strong>In use</strong> label moves.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Why the switch to per branch can be refused">
          A branch run covers exactly its own people, so somebody with no branch would be on nobody&apos;s run and would not be paid. While any active member of staff has no branch, XVS refuses the switch and shows <strong>Per-branch payroll is not possible yet</strong> with the people it found. Give each of them a branch on their staff record, then come back. Switching back to one payroll for the whole school is always allowed.
        </GuideCallout>
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
        <GuideCallout tone="tip" title="You are done when">The way your school pays its staff carries the <strong>In use</strong> label, and nobody active is left without a branch if you chose per branch.</GuideCallout>
      </GuideSection>
    </div>
  );
}
