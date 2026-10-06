import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords } from "../../guide-words";

export default function TrackSubmissionsAndDelegateArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Two screens under <strong>Workflow</strong> are about your own requests and your own approvals. <strong>My Submissions</strong> lists what you sent for approval and are waiting on. <strong>Delegations</strong> lets a colleague approve for you while you are away, for example over a {w.term} break.</p>
        <GuideChecklist items={[
          "Only requests you raised appear in My Submissions.",
          "You can see and change only your own delegations.",
          "A request is changed in the screen it came from, such as the requisition in Procurement, never on the approval itself.",
        ]} />
      </GuideSection>

      <GuideSection id="track-a-submission" title="Track a submission">
        <GuideSteps>
          <GuideStep title="Open My Submissions">Choose <strong>All</strong>, <strong>In Progress</strong>, <strong>Returned</strong>, <strong>Approved</strong> or <strong>Rejected</strong>. Each row shows the document, its status, the current stage and when it last changed.</GuideStep>
          <GuideStep title="Open the request">Select a row. <strong>Workflow progress</strong> shows each step and who it is waiting on. <strong>Activity</strong> lists every decision and comment, including why a request was returned.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="resubmit-or-withdraw" title="Resubmit or withdraw">
        <p>When an approver returns your request, the page says <em>This submission was returned to you for corrections.</em></p>
        <GuideSteps>
          <GuideStep title="Correct the document">Read the reason in Activity, then open the document in its own screen and make the correction there.</GuideStep>
          <GuideStep title="Select Resubmit">Confirm in the <strong>Resubmit for approval?</strong> dialog. The request picks up again at the step that returned it, with the approvers who hold that step today.</GuideStep>
          <GuideStep title="Withdraw only to stop the request">While a request is submitted, in progress or returned, <strong>Withdraw</strong> ends it. To start again you submit a fresh request from the document&apos;s own screen.</GuideStep>
        </GuideSteps>
        <p><strong>Finance and Procurement documents</strong> can be corrected and resumed on their own screen, without coming back here. Open the document, for example the requisition in Procurement or the credit note in Receivables. A note headed <strong>Sent back to you</strong> says who sent it back, when, and why. Under it:</p>
        <GuideChecklist items={[
          "Edit corrects the document in place. Your role must also be allowed to edit that kind of document.",
          "Resume sends the corrected version back into the same approval, at the step that sent it back. The approvers then see the corrected version.",
        ]} />
        <p>Edit is offered on requisitions, purchase orders, vendor invoices, vendor payments, vendor credit notes, credit and debit notes, concessions, manual journals, and bank transactions and transfers. On an expense claim you attach or remove receipts instead. Refunds, write-offs, credit transfers, doubtful-debt provision runs, inter-branch sends and journals raised by another document can only be resumed as they are: to change one, withdraw it here and send it again from its own screen.</p>
        <GuideCallout tone="info" title="Only the person who sent it gets Edit and Resume">
          Ngozi sends back a stationery requisition that Tunde sent for approval, asking for a cheaper supplier. Tunde opens the requisition, selects <strong>Edit</strong>, changes the supplier, then selects <strong>Resume</strong>. Tunde&apos;s colleague Amaka, who may also edit requisitions, sees the note headed <strong>Sent back</strong> but neither button, and so does Ngozi. While a document is with its approvers, nobody can change it: its screen says <em>With the approver.</em>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="create-a-delegation" title="Delegate your approvals">
        <GuideSteps>
          <GuideStep title="Select New Delegation">On <strong>Approval Delegations</strong>, select <strong>New Delegation</strong>.</GuideStep>
          <GuideStep title="Choose who covers for you">In <strong>Delegate to</strong>, search for the colleague. Only colleagues with an active account, other than you, are offered.</GuideStep>
          <GuideStep title="Set the dates">The delegation starts at the beginning of the <strong>Start date</strong> and lasts until the end of the <strong>End date</strong>. The end date cannot be before the start date.</GuideStep>
          <GuideStep title="Limit what they cover, if you want">In <strong>Applies to</strong>, choose one kind of document, or leave it on <strong>All document types</strong>.</GuideStep>
          <GuideStep title="Decide whether you still approve too">With <strong>Exclusive delegation</strong> off, both of you can act and either vote counts. With it on, only your delegate appears in approver queues for the period.</GuideStep>
          <GuideStep title="Add a reason and save">The reason is optional, up to 240 characters, such as &quot;Out of office for {w.term} break.&quot; Check the summary line, then select <strong>Save delegation</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="A delegation hands over your decisions, not your account">Your delegate approves in their own name. Never share your password to cover an absence.</GuideCallout>
      </GuideSection>

      <GuideSection id="review-and-revoke" title="Review and revoke delegations">
        <p><strong>My Delegations</strong> lists the cover you have given, and <strong>Delegated to me</strong> lists the colleagues you are covering for. Each shows the dates, what it applies to, and whether it is <strong>Active</strong>, <strong>Scheduled</strong>, <strong>Expired</strong> or <strong>Revoked</strong>.</p>
        <p>To end cover early, select <strong>Revoke</strong> on an active or scheduled delegation and confirm. Your delegate stops appearing in approver queues for you at once.</p>
        <p>When you are covering for someone, their items appear in your <strong>Approvals</strong>. Choose <strong>On behalf of</strong> there to see only those.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "\"Your role can't view your submissions. Ask your administrator.\": your role cannot open My submissions. It does not mean you have raised nothing.",
          "Resubmit is missing: only the person who raised a request can resubmit it, and only while it is Returned.",
          "Edit and Resume are missing on a document sent back: only the person who sent it for approval gets them, and Edit also needs a role that may edit that kind of document.",
          "My delegate cannot see my items: check that today is inside the dates and that Applies to covers that document.",
          "Both of us are still being asked: Exclusive delegation was left off, so either of you can act.",
          "A colleague is not in the Delegate to list: only active accounts are offered.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Your request shows the status you expect, and any delegation shows the right person, dates and scope as Active or Scheduled.</GuideCallout>
      </GuideSection>
    </div>
  );
}
