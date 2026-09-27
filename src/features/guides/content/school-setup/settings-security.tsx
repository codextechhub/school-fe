import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const RULES = [
  ["Wrong passwords before an account locks", "How many times someone can mistype a password before their account locks. Stricter means fewer."],
  ["How long a locked account stays locked", "After this, the person can try again, or an administrator can unlock them sooner. Stricter means longer."],
  ["Password reset link a person asks for", "How long the link in a forgot-password email keeps working. Stricter means shorter."],
  ["Password reset link an administrator sends", "How long the link keeps working when an administrator resets someone's password. Stricter means shorter."],
  ["Staff invitation", "How long a new staff member has to accept their invitation, including one that was resent. Stricter means shorter."],
  ["XVS support session", "When XVS support signs in as one of your staff to help, the session ends after this long with nothing happening. Stricter means shorter."],
] as const;

const BADGES = [
  ["XVS baseline", "The value XVS requires of every school. Nobody at your school has changed it."],
  ["Set by your school", "Your school has chosen its own value for this rule."],
  ["Set for this branch", "This branch holds a value of its own, set apart from the whole school's."],
  ["Default", "The value XVS uses when nothing else has been set."],
] as const;

const PROBLEMS = [
  ["The boxes are greyed out and there is no Save", "Your role can read these rules but not change them. The panel says so at the bottom. A school administrator makes the changes."],
  ["Must be N or more, or Must be N or less", "The value is looser than the parent allows. Read the limit under the rule and choose a stricter value."],
  ["Save stays disabled", "Nothing has changed yet, or a box is empty or not a whole number."],
  ["There is no branch picker", "Your school has one branch, so there is nothing to choose between. The rules apply to the whole school."],
] as const;

export default function SettingsSecurityArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Sign-in and security</strong> sets how strict sign-in and password recovery are for your staff. Open it from <strong>Settings</strong>, then <strong>Sign-in and security</strong>.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "You know whether the change is for the whole school or for one branch.",
        ]} />
      </GuideSection>

      <GuideSection id="the-rules" title="The six rules">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RULES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p>A label beside each rule says where its value comes from:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BADGES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="stricter-never-looser" title="Stricter, never looser">
        <p>Each rule is bounded by the one above it. Your school can be stricter than the XVS baseline, and a branch can be stricter than the whole school, but neither can be looser. A school that shortens reset links to 2 hours is safer than XVS requires, and allowed. One that stretches invitations beyond what XVS allows is refused.</p>
        <p>The text under each rule names its limit, for example <strong>At most 5 attempts, because the XVS baseline is 5.</strong> For a branch the limit is the school&apos;s own setting rather than the baseline.</p>
      </GuideSection>

      <GuideSection id="change-a-rule" title="Change a rule">
        <GuideSteps>
          <GuideStep title="Choose whole school or a branch">If your school has more than one branch, a picker sits at the top listing <strong>Whole school</strong> and the branches you work in. Leave it on <strong>Whole school</strong> to change the rule for every branch, or pick a branch to change it for that branch only. The sentence beside the picker says which you are editing.</GuideStep>
          <GuideStep title="Type the new values">Type a whole number into the box for each rule you want to change. A counter beside <strong>Save</strong> shows how many changes are not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save</strong>. XVS confirms which scope it saved for, and records every change with who made it.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A whole-school change reaches every branch">
          A branch follows the whole school&apos;s value unless it has been made stricter on its own. A branch that holds its own value keeps it.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="put-a-rule-back" title="Put a rule back">
        <p>When the scope you are editing holds its own value for a rule, a <strong>Reset</strong> button appears beside it. Select it to drop that value and follow the one above again: a branch goes back to the whole school&apos;s value, and the school goes back to the XVS baseline. The reset saves straight away.</p>
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
        <GuideCallout tone="tip" title="You are done when">Each rule shows the value you intend for the scope you picked, the label beside it matches where you set it, and no unsaved changes are left.</GuideCallout>
      </GuideSection>
    </div>
  );
}
