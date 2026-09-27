import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const AREAS = [
  ["School profile", "Your crest, address, website and motto, and the details XVS set up for you."],
  ["Sign-in and security", "How many wrong passwords lock an account, and how long reset links and invitations last."],
  ["Notifications", "Which events also send an email to the people they concern."],
  ["Admission numbers", "Whether every child needs an admission number, and what a valid one looks like."],
  ["Payroll", "Whether the whole school is paid in one run, or each branch runs its own."],
  ["More settings", "Roles, field access, approval paths, and the Finance and Procurement settings."],
] as const;

const PROBLEMS = [
  ["There is no Settings in the sidebar", "Your role holds none of the keys any settings area checks. Ask your school administrator if you need one."],
  ["An area you expect is missing", "Only the areas your role can open are shown. Some areas also depend on your school's plan: Admission numbers needs the students module, Notifications needs email alerts, and Payroll needs the advanced finance band."],
  ["A link to an area opens the overview instead", "The address is right, but that area is not open to your role, so XVS shows the overview rather than an error."],
  ["An area says it is not open to your account", "Your role changed while the page was open, or your school's plan did. Ask your school administrator."],
] as const;

export default function SettingsOverviewArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Settings</strong> is where your school decides how it runs in XVS: its profile, its sign-in rules, which events send email, and the rules its records follow. Each area opens only for a role that holds the key that area checks, so two people can see a different list.</p>
        <p>Settings that belong to XVS itself, such as what your plan includes, are not here. Ask the XVS team through the headset in the header if one of those needs to change.</p>
      </GuideSection>

      <GuideSection id="open-settings" title="Open Settings">
        <GuideSteps>
          <GuideStep title="Select Settings">Select <strong>Settings</strong> in the sidebar, or type &quot;settings&quot; into the search box in the header. Your school&apos;s name shows at the top right, so you know whose settings you are changing.</GuideStep>
          <GuideStep title="Pick an area">The list of areas runs down the left on a wide screen, and across the top on a narrower screen such as a phone. Select one to open it. Each area has its own address, so you can bookmark it or share the link with a colleague who holds the same access.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="the-overview" title="Read the overview">
        <p><strong>Overview</strong> shows a card for every area your role can open. Select a card to go straight to it.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AREAS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="more-settings" title="Find the settings on other screens">
        <p>Some settings have screens of their own. <strong>More settings</strong> gathers the ways in: <strong>Roles and permissions</strong>, <strong>Field access</strong>, <strong>Branches</strong>, <strong>Approval paths</strong>, <strong>Approvers</strong>, <strong>Approval emails</strong>, <strong>Finance settings</strong> and <strong>Procurement settings</strong>.</p>
        <p>Each one is listed only when your role can open the screen behind it, so a link here never ends at a refusal. When none of them is open to you, <strong>More settings</strong> is not in the list of areas at all.</p>
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
        <GuideCallout tone="tip" title="You are done when">You can open <strong>Settings</strong>, you know which areas your role reaches, and you know where the settings with screens of their own live.</GuideCallout>
      </GuideSection>
    </div>
  );
}
