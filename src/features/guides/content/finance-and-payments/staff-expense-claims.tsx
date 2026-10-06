import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "A receipt shows Missing", body: "Receipts can be attached only while the claim is a draft, or by whoever sent it for approval once it is sent back to them. Select Missing on the line to upload one." },
  { title: "The claim was saved as a draft instead", body: "A receipt did not attach, or no approval route is set up. Open the draft and submit it again, or approve it directly if the screen offers Approve." },
  { title: "There are no buttons on a claim", body: "It is Awaiting approval. The decision is made in the approvals queue, not here." },
  { title: "Void is missing", body: "A claim can be voided only while nothing has been paid on it." },
] as const;

export default function StaffExpenseClaimsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>An expense claim pays a member of staff back for school spending out of their own pocket: exam materials, a taxi to a competition, repairs bought in a hurry.</p>
        <GuideChecklist items={[
          "You have the receipts, as photos or PDFs of up to 10MB each.",
          "You know which expense account each item belongs to.",
          "You know who the claim is for and what it was for.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-claim" title="Create the claim">
        <GuideSteps>
          <GuideStep title="Open Expense Claims and select New claim">Type the <strong>Claimant</strong>, the <strong>Date</strong> and the <strong>Purpose</strong>, for example <em>Inter-house sports supplies</em>.</GuideStep>
          <GuideStep title="Add a line per item">For each item enter the <strong>Description</strong>, <strong>Expense account</strong>, an optional <strong>Cost center</strong>, the <strong>Amount</strong> and any <strong>Tax</strong>. The total shows as <strong>Total (net)</strong>.</GuideStep>
          <GuideStep title="Drop in the receipts">Drag the receipt files onto <strong>Receipts</strong>. They attach to the lines in order.</GuideStep>
          <GuideStep title="Save or submit">Select <strong>Create and submit</strong> to send it for approval, or <strong>Save draft</strong> to finish later.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="approve-the-claim" title="Approve the claim">
        <p>A submitted claim reads <strong>Awaiting approval</strong> and is decided in the approvals queue. Where the school has no approval route for claims, a draft shows <strong>Approve</strong> and <strong>Reject</strong> buttons instead.</p>
        <p>Once approved, the claim reads <strong>Approved</strong> and the amount is owed to the member of staff. The <strong>Approval workflow</strong> steps inside the claim show where it is.</p>
        <p>If the approver sends a claim back, it reads <strong>Sent back</strong>, on its row and when you open it, and the status filter lists it under <strong>Draft</strong>. The person who sent it for approval sees <strong>Sent back to you</strong> on it, with the approver&apos;s reason. They can attach or remove receipts on its lines, then select <strong>Resume</strong> to send it back into the same approval. To change anything else, withdraw it under Workflow, My Submissions. Nobody else can change the receipts or resume it.</p>
      </GuideSection>

      <GuideSection id="pay-the-claim" title="Pay the member of staff">
        <GuideSteps>
          <GuideStep title="Open the approved claim and select Pay">Choose the <strong>Bank account</strong> it is paid from and the <strong>Payment date</strong>.</GuideStep>
          <GuideStep title="Confirm the amount">The button reads <strong>Pay</strong> with the balance due. The whole balance is paid in one go, and the claim reads <strong>Paid</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="void-a-mistake" title="Void a claim approved in error">
        <GuideCallout tone="warning" title="Only before any payment">
          <strong>Void</strong> reverses the claim&apos;s entry and cancels it. It is available only while nothing has been paid, so check a claim carefully before selecting Pay.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(({ title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="The claim is done when">
          Every line has its receipt, the claim was approved, the member of staff was paid once, and the claim reads Paid.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
