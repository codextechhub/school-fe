import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["We could not find your onboarding checklist", "Your school's control room was never set up. Select Contact XVS on that screen; there is nothing you can do on your side."],
  ["You cannot open the onboarding checklist", "Your account does not include onboarding. Ask whoever set up your account to check your role."],
  ["A step has no buttons", "Either your school is live and the checklist is read-only, or your role can read the checklist but not work it. A branch administrator sees the checklist without buttons."],
  ["Mark as done shows a message under the card", "XVS checked the step and found something missing. The message says what; fix it and try again."],
  ["Skip for now is missing", "Required steps cannot be skipped. Only optional steps offer it."],
  ["A screen says it opens when your school goes live", "That part of XVS is closed until go-live. Select Back to control room."],
] as const;

export default function OnboardingChecklistArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Until your school goes live, onboarding is the part of XVS you work in. The <strong>Onboarding Control Room</strong> lists every step XVS needs before your school can go live, and you can take them in any order.</p>
        <GuideChecklist items={[
          "You can sign in as a school administrator.",
          "You know how your school is owned, how its year is divided, and its currency.",
          "You have the spreadsheets of students, staff and guardians you want to load.",
          "You know who else will help run the system.",
        ]} />
      </GuideSection>

      <GuideSection id="welcome-screen" title="The welcome screen">
        <p>The first screen after sign-in greets you by name and shows your school and its readiness. It also says how long you have to finish onboarding. Select <strong>Enter Onboarding Control Room</strong> to start.</p>
      </GuideSection>

      <GuideSection id="read-your-status" title="Read your go-live status">
        <p>The top of the control room shows how far you are, with counts for <strong>Completed</strong>, <strong>Remaining</strong> and <strong>Blockers</strong> (and <strong>Skipped</strong> once you have skipped something). The headline says where you stand:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Not ready</strong>: some required steps are still open. The line underneath names them.</li>
          <li><strong>Ready to go live</strong>: every required step is done.</li>
          <li><strong>Waiting on XVS</strong>: you have asked to go live and XVS is reviewing it.</li>
          <li><strong>Live</strong>: your school is live and onboarding is closed.</li>
        </ul>
        <p>Select <strong>Re-check</strong> to have XVS look at your steps again. The <strong>Going live</strong> panel on the right mirrors the go-live screen, <strong>Next best action</strong> points at the next open step, and <strong>Required for go-live</strong> ticks off the required steps as you finish them.</p>
      </GuideSection>

      <GuideSection id="work-through-the-steps" title="Work through the steps">
        <p>Each card shows the step&apos;s name, its status (<strong>Not started</strong>, <strong>In progress</strong>, <strong>Done</strong> or <strong>Skipped</strong>) and whether it is <strong>Required</strong> or <strong>Optional</strong>. Your school&apos;s list comes from XVS, so it may have more or fewer steps than another school&apos;s.</p>
        <GuideSteps>
          <GuideStep title="Open the screen behind the step">Where a step has its own screen, the card has a button for it: <strong>Review</strong> for roles, <strong>Open profile</strong>, <strong>Open structure</strong> for academic structure, <strong>Open import</strong>, and <strong>Open invitations</strong>. <strong>Continue</strong> under Next best action does the same for the next open step.</GuideStep>
          <GuideStep title="Do the work">Complete the step on its screen. Some screens close the step themselves, such as <strong>Save and continue</strong> on the roles screen and <strong>Finish data setup</strong> on the import screen.</GuideStep>
          <GuideStep title="Mark it done">Back in the control room, select <strong>Mark as done</strong> on the card. For steps XVS can check, it looks before accepting; if something is missing, the reason appears in red under the card. A step marked <em>We take your word for this step</em> is accepted as you mark it.</GuideStep>
          <GuideStep title="Skip or reopen when you need to">On an optional step, <strong>Skip for now</strong> sets it aside without blocking go-live, and <strong>Do this now</strong> brings it back. On a finished step, the menu beside it offers <strong>Reopen</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Need help with a step?">Select <strong>Escalate an issue</strong> under <strong>Need a hand?</strong> to send XVS a support ticket from the page you are on.</GuideCallout>
      </GuideSection>

      <GuideSection id="before-go-live" title="What is open before go-live">
        <p>Before go-live the sidebar is short: <strong>Control Room</strong>, <strong>Academic Structure</strong> and <strong>Go-Live</strong>, as far as your role allows. A strip under the header reminds you that onboarding is the only part of the app open until you go live, and shows the date your onboarding window closes.</p>
        <p>If you reach a screen that is still closed, it says <strong>This part of XVS opens when your school goes live</strong>. Nothing is wrong; select <strong>Back to control room</strong>.</p>
        <GuideCallout tone="warning" title="Watch the onboarding window">When the window is close to ending, the strip turns amber and counts the days left. If it runs out, your sign-in is paused until XVS restores it.</GuideCallout>
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
        <GuideCallout tone="tip" title="You are done when">Every required step shows <strong>Done</strong>, the headline reads <strong>Ready to go live</strong>, and the Blockers count is 0. Your next step is to request go-live.</GuideCallout>
      </GuideSection>
    </div>
  );
}
