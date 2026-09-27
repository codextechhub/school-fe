import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function ChangeEmploymentStatusArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Employment status records where somebody stands with the school, such as Active, On leave, Suspended, Resigned or Terminated. Changing it is written to the person&apos;s history.</p>
        <GuideChecklist items={[
          "Your role lets you change employment status.",
          "You know the date the change takes effect, and the reason.",
          "For somebody leaving, you know their last working day.",
          "You have a plan for the classes they teach.",
        ]} />
      </GuideSection>

      <GuideSection id="employment-and-account" title="Employment and account are separate">
        <p>Employment says whether the person works here. Their account says whether they can sign in. Some moves change the account and some do not, and the drawer says which before you save.</p>
        <GuideCallout tone="warning" title="Leaving does not close the account by itself">When somebody resigns, their account stays open until an administrator closes it. Nothing closes it automatically on the last working day.</GuideCallout>
        <GuideCallout tone="info" title="Invited people activate themselves">An invited person becomes Active only by opening their own link and setting a password. Nobody can move them to Active on their behalf; resend the invitation instead.</GuideCallout>
      </GuideSection>

      <GuideSection id="change-the-status" title="Change the status">
        <GuideSteps>
          <GuideStep title="Open the drawer">On the person&apos;s profile, select <strong>Change status</strong>. From the Staff Directory, open the row menu and choose <strong>Change status</strong>. The drawer shows their employment and account status as they stand.</GuideStep>
          <GuideStep title="Choose the move">In <strong>Move to</strong>, only the moves allowed from the current status are listed. When you pick one, a sentence says what it does to their account.</GuideStep>
          <GuideStep title="Set the dates">Set the <strong>Effective date</strong>. It starts on today. Where the move needs it, the drawer also asks for the <strong>Last working day</strong>.</GuideStep>
          <GuideStep title="Give the reason">Write the <strong>Reason</strong>, required for some moves, and any <strong>Notes</strong>.</GuideStep>
          <GuideStep title="Read the classes needing cover">If the person teaches, the drawer lists <strong>These classes will need cover</strong>. The change does not cancel those duties; reassign them on Teaching duties.</GuideStep>
          <GuideStep title="Save">Select the button, which names the move, such as <strong>Move to</strong> and the status. A message repeats what happened to their account.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="There is no second confirmation">The change is made when you select the button. Check the person&apos;s name at the top of their profile before you open the drawer.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Change status is missing", body: "Your role cannot change employment status, or the person works beyond your branch and only a school-wide administrator can change them." },
          { title: "There is no move to make", body: "The person is Invited and must activate their own account, or their record has been closed and stays closed." },
          { title: "The person still cannot sign in after returning", body: "Their account may be locked, which is separate from employment. Use Unlock account on their profile if your role allows it." },
          { title: "Their classes still list them as teacher", body: "Changing status leaves duties in place. Open Teaching duties and give each class subject somebody else." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The profile shows the employment status you intended, the account status is what the drawer said it would be, and every class the person taught has cover.</GuideCallout>
      </GuideSection>
    </div>
  );
}
