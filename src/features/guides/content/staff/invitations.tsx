import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function StaffInvitationsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Everybody added to the staff gets an invitation, and stays Invited until they open the link and set their first password. Only the invited person can do that. Open <strong>Invitations</strong> under Staff in the sidebar; its badge counts invitations nobody has accepted.</p>
        <GuideChecklist items={[
          "Your role lets you view staff.",
          "To withdraw an invitation, your role also lets you change employment status.",
          "Before resending, you have checked the email address with the person.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-list" title="Read the list">
        <p>The cards at the top count invitations <strong>Awaiting response</strong>, those under <strong>Needs follow-up</strong> that have waited 7 days or more, and the <strong>Oldest invitation</strong>. The table lists each person with their role, the date the invitation was sent and how long it has waited. A wait of 7 days or more is marked in amber.</p>
        <p>Search by name or email. Select a row to open the invitation&apos;s details.</p>
      </GuideSection>

      <GuideSection id="hires-awaiting-approval" title="Hires awaiting approval">
        <p>Where your school approves each hire, in <strong>Settings</strong> under <strong>Staff rules</strong>, a new person waits for the school&apos;s approvers before any invitation is sent. When more than one kind of invitation has people in it, tabs above the list read <strong>Invited</strong>, <strong>Awaiting approval</strong> and <strong>Invited at go-live</strong>, each with its number, for example <strong>Awaiting approval (2)</strong>.</p>
        <p>Select <strong>Awaiting approval</strong> to list them. The note above the list says they wait on the school&apos;s approvers in Workflow, and <strong>Open Approvals</strong> takes an approver straight there. A waiting hire has no <strong>Resend</strong>, because nothing has been sent yet. Its details, <strong>Hire awaiting approval</strong>, say that approving it sends the invitation and rejecting it closes the record without sending anything.</p>
        <p>To call a hire off before it is decided, open it and select <strong>Withdraw hire</strong>, give a <strong>Reason</strong>, and confirm with <strong>Withdraw hire</strong>, or <strong>Keep hire</strong> to back out. Its approval is cancelled and nothing is ever sent to the person.</p>
      </GuideSection>

      <GuideSection id="invited-at-go-live" title="Invitations held for go-live">
        <p>Staff imported while the school is being set up are not emailed straight away. Select <strong>Invited at go-live</strong> to list them: the note above the list says their invitations go out when the school goes live, and each row shows when they were <strong>Added</strong> and a blue <strong>Invited at go-live</strong> badge.</p>
        <p>They have no <strong>Resend</strong> before go-live, because nothing has been sent. When the school goes live, all their invitations go out together. Anybody the release missed shows a <strong>Send</strong> button once the school is live; select it, or <strong>Send invitation</strong> in the <strong>Invitation held for go-live</strong> drawer.</p>
        <p>Withdrawing one of them before go-live closes the record as Terminated, and XVS confirms <strong>Invitation withdrawn before it was sent. Nothing was sent to them.</strong></p>
      </GuideSection>

      <GuideSection id="resend-an-invitation" title="Resend an invitation">
        <GuideSteps>
          <GuideStep title="Check the address">Open the row and read the email. If it is wrong, correct it with <strong>Change email address</strong> on their record, rather than resending to the wrong inbox.</GuideStep>
          <GuideStep title="Resend">Select <strong>Resend</strong> on the row, or <strong>Resend invitation</strong> in the details. A fresh single-use link goes out by email and in the app.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="The previous link stops working">Resending keeps the same staff record and invalidates the earlier link. Ask the person to use the latest email only.</GuideCallout>
      </GuideSection>

      <GuideSection id="withdraw-an-invitation" title="Withdraw an invitation">
        <GuideSteps>
          <GuideStep title="Open the details">Select the row, then <strong>Withdraw invitation</strong>.</GuideStep>
          <GuideStep title="Give a reason">Type the <strong>Reason</strong>, such as a wrong address or a hire that fell through.</GuideStep>
          <GuideStep title="Confirm">Select <strong>Withdraw invitation</strong>, or <strong>Keep invitation</strong> to back out.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Withdrawing does not delete the person">The link stops working, and their record stays on the staff list, closed as Terminated. Inviting them again starts from the beginning.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Resend is disabled", body: "The person has already set a password, so there is nothing to resend. If they cannot sign in, check whether their account is locked on their profile." },
          { title: "The invitation never arrived", body: "Check the email address, ask the person to look in spam, then resend. Invitations are never sent by SMS." },
          { title: "Withdraw invitation is missing", body: "Withdrawing needs permission to change employment status." },
          { title: "Somebody is missing from the list", body: "They have already activated, they are still awaiting approval (select Awaiting approval above the list), or they are posted to a branch other than the one chosen in the sidebar." },
          { title: "A hire has waited days for approval", body: "Nobody in the school's hire approvers group has decided it, or the group is empty. Ask an administrator to open Approvers under Workflow and add somebody." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Nobody on the list has waited 7 days without a follow-up, no hire is left waiting for approval without somebody to decide it, and every invitation or hire made in error has been withdrawn with a reason.</GuideCallout>
      </GuideSection>
    </div>
  );
}
