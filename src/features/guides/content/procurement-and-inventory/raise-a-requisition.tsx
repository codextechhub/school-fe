import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function RaiseARequisitionArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A requisition is the school&apos;s internal request to buy something, such as a head of science asking for lab reagents or the stores keeper asking for exercise books. Nothing is ordered from a supplier until it is approved and the bursar turns it into a purchase order.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations in the sidebar, then Requisitions.",
          "Know what you need, roughly how many, and what each costs.",
          "Know the cost centre it should be charged to, if your school uses them.",
          "Have a short reason ready: approvers read it before deciding.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-requisition" title="Create the requisition">
        <GuideSteps>
          <GuideStep title="Select New Requisition">On <strong>Purchase Requisitions</strong>, select <strong>New Requisition</strong>.</GuideStep>
          <GuideStep title="Fill in Request Details">Give it a <strong>Title</strong> such as &quot;JSS2 science practical supplies&quot;, choose the <strong>Cost Centre</strong>, and set the <strong>Request date</strong> and, if it matters, <strong>Needed by</strong>.</GuideStep>
          <GuideStep title="Check Budget Availability">Once a cost centre is chosen, the drawer shows the <strong>Approved budget</strong>, what is already committed to purchase orders, and what is <strong>Available</strong>. If no budget is set up for that cost centre, it says so.</GuideStep>
          <GuideStep title="Add the lines">For each item, pick a <strong>Catalog item</strong> if it is in the catalogue, which fills in the description, unit and price, or type an <strong>Item description</strong>. Enter the quantity, unit and estimated unit price. Select <strong>Add line</strong> for more.</GuideStep>
          <GuideStep title="Explain why">Write the <strong>Business case</strong>, for example &quot;Needed for the JSS2 practical exams in week 6&quot;.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="submit-for-approval" title="Submit for approval">
        <p><strong>Save Draft</strong> keeps the requisition to finish later. <strong>Create Requisition</strong> saves it and sends it for approval in one step. A saved draft is sent with <strong>Submit for Approval</strong> in its drawer.</p>
        <p>Once submitted, the requisition shows <strong>Pending Approval</strong> and cannot be edited. It waits in the approvers&apos; queues and in your <strong>My Submissions</strong> under Workflow.</p>
        <GuideCallout tone="danger" title="If you see &quot;Nobody can approve this&quot;">This means nobody can currently approve the request, so it would wait for ever. <strong>Continue anyway</strong> records it as approved without anyone reviewing it, against your name. Unless your school has agreed that, choose <strong>Leave it waiting</strong> and ask whoever manages approvals to add an approver.</GuideCallout>
      </GuideSection>

      <GuideSection id="approve-in-procurement" title="Approve a requisition">
        <p>Approvers can decide in three places, and all three record the same decision: the shared <strong>Approvals</strong> under Workflow, the <strong>Approvals</strong> screen in Procurement, which lists only purchasing documents, or the requisition&apos;s own drawer.</p>
        <GuideSteps>
          <GuideStep title="Open the request">In Procurement <strong>Approvals</strong>, filter by document type if you want, and open the requisition. The drawer shows <strong>This document is awaiting your approval</strong> and how many approvals the step needs.</GuideStep>
          <GuideStep title="Decide">Select <strong>Approve</strong>, <strong>Request Revision</strong> to send it back for changes, or <strong>Reject</strong>. Request Revision and Reject need a comment.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="follow-and-correct" title="Follow it and correct it">
        <GuideSteps>
          <GuideStep title="Follow progress">Open the requisition and read <strong>Approval Trail</strong>, or open it from <strong>My Submissions</strong> under Workflow to see which step it is waiting on.</GuideStep>
          <GuideStep title="When it comes back for revision">Its badge reads <strong>Sent back</strong>, in its own colour, on its row and in its drawer, and it stays under the <strong>Pending Approval</strong> tab. The <strong>Sent back</strong> tab lists only the requisitions sent back. The drawer shows <strong>Sent back to you</strong> with who sent it back and why. Select <strong>Edit</strong>, make the correction and select <strong>Save changes</strong>, then select <strong>Resume</strong>. The corrected requisition goes back into the same approval, at the step that sent it back, and the approvers see the corrected version. There is no need to withdraw it. Only the person who sent it for approval gets Edit and Resume.</GuideStep>
          <GuideStep title="When it is approved">The status reads <strong>Approved</strong>, and the bursar or procurement officer can raise a purchase order from it.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A rejected requisition is closed">A final rejection shows <strong>Rejected</strong> and cannot be reopened. Raise a new requisition if the need remains.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "New Requisition is missing: your role does not include raising requisitions.",
          "Edit is missing: only a Draft, or a requisition sent back to you, can be edited. While it is with its approvers, nobody can change it.",
          "The budget panel says no budget is configured: ask the bursar, or continue and let the approvers decide.",
          "An item is not in the catalogue: type its description instead.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The requisition shows Pending Approval with the right lines and total, and it appears in My Submissions.</GuideCallout>
      </GuideSection>
    </div>
  );
}
