import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const DECISIONS = [
  ["Approve", "Counts your vote towards the step. Whether one vote clears it, or it needs a set number or everybody, is shown above the buttons."],
  ["Reject", "Needs a reason. The step decides whether a rejection ends the request or sends it back to the person who raised it, and the reason label says which."],
  ["Return to requester", "Needs a reason. The request goes back for corrections, and the person who raised it can resubmit at this step."],
] as const;

const PROBLEMS = [
  ["\"Your role can't view running approvals. Ask your administrator.\"", "Your role cannot read the school's running approvals. Your own Pending Approvals still shows what waits for your vote."],
  ["The request left my queue", "It moved on, ended, was withdrawn, or you already voted. Items you have voted on are hidden from Pending Approvals."],
  ["\"You are not an eligible approver for this stage.\"", "The step is waiting on someone else. Ask whoever manages approvals in your school to check who the step is sent to."],
  ["\"This workflow is not awaiting votes.\"", "The request is already approved, rejected, returned or withdrawn. Read Activity to see what happened."],
  ["The details cannot be shown", "Select View full document and review the record itself before you decide."],
  ["I chose the wrong decision", "You cannot undo a vote from this screen. Tell the requester and your school administrator straight away, and do not try to balance it with a second decision."],
] as const;

export default function DecideAnApprovalArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Approvals is where documents wait for your decision: a requisition from a head of department, a purchase order, a supplier bill, a change to someone&apos;s role. You see an item only when the step it has reached names you, or when a colleague has delegated their approvals to you.</p>
        <GuideChecklist items={[
          "Open Workflow under Administration in the sidebar, then Approvals. A number beside Workflow counts what is waiting.",
          "Allow a few minutes to read what is being asked before you decide.",
          "Know your school's own spending limits and rules for this kind of request.",
        ]} />
        <GuideCallout tone="danger" title="Your decision is recorded">Approve, Reject and Return to requester are each saved with your name and the time. Read the request before you choose.</GuideCallout>
      </GuideSection>

      <GuideSection id="find-an-approval" title="Find an approval">
        <GuideSteps>
          <GuideStep title="Open Pending Approvals">The list shows only what is waiting for your vote. When nothing is, the page says <strong>You&apos;re all caught up.</strong></GuideStep>
          <GuideStep title="Narrow the list">Under <strong>Document type</strong>, choose <strong>All types</strong> or one kind of document. Under <strong>Acting as</strong>, choose <strong>My queue</strong> for everything, or <strong>On behalf of</strong> for items you are covering for a colleague. The search box filters by ID, type or requester.</GuideStep>
          <GuideStep title="Select Review">Each row shows who raised it, the step it is on and how long it has been in your queue. Select <strong>Review</strong> to open it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="review-the-request" title="Review the request">
        <p>The page opens with the document&apos;s name and status, then a <strong>Summary</strong> with who requested it and when. Under it, <strong>Details</strong> shows what is being asked for: labelled fields, a table of items, or a list of what is added and removed. You can review it there without leaving the approval.</p>
        <p>The <strong>Workflow</strong> panel shows every step and where the request is now, for example <em>Stage 2 of 3 · Awaiting your vote</em>. <strong>Activity</strong> lists everything that has happened so far, including earlier returns and comments.</p>
        <p>When you need the attachments or the record as it stands today, select <strong>View full document</strong>. It opens the document on its own screen, such as the requisition in Procurement.</p>
        <GuideCallout tone="warning" title="Do not approve from the title alone">A requisition called &quot;Science lab supplies&quot; could be for twenty thousand naira or two million. Read the amounts and lines in Details, and open the full document when something is missing.</GuideCallout>
      </GuideSection>

      <GuideSection id="choose-a-decision" title="Choose a decision">
        <p>Your choices are under <strong>Your decision</strong>. A line above the buttons says what your vote does, such as <em>A single approval clears this step.</em></p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {DECISIONS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <GuideSteps>
          <GuideStep title="Give a reason when rejecting or returning">Write what is wrong and what would fix it. The reason must be at least 5 characters and no more than 500, and the requester sees it. Select <strong>Continue</strong>.</GuideStep>
          <GuideStep title="Confirm">A dialog repeats what will happen, for example that this is the final approval. Select <strong>Confirm approval</strong>, <strong>Confirm rejection</strong> or <strong>Confirm return</strong>, or <strong>Cancel</strong> to go back.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="understand-the-result" title="Understand the result">
        <p>A message confirms what your decision did:</p>
        <GuideChecklist items={[
          "Approved - request fully approved.",
          "Approved - moved to the next step, named in the message.",
          "Approval recorded. The step still needs other approvers.",
          "Rejected - workflow ended, or Rejected - returned to the requester.",
          "Returned to the requester for corrections.",
        ]} />
        <p>A returned request comes back to your queue only after the requester corrects it and resubmits.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-2 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The confirmation message appears, your action shows in Activity, and the item has left Pending Approvals.</GuideCallout>
      </GuideSection>
    </div>
  );
}
