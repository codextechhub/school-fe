import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";
import { useGuideWords } from "../../guide-words";

const PROBLEMS = [
  { title: "The pupil is not in the refund list", body: "Only customers with credit on the refund date are offered. Money received after that date cannot fund an earlier refund, so try a later date." },
  { title: "Post now is not offered", body: "Where an approval path is set up, refunds and write-offs always need approval. Choose Submit for approval." },
  { title: "The batch was not posted", body: "At least one line needs approval, so nothing in the batch was saved. Select Submit the batch instead." },
  { title: "A write-off was a mistake", body: "Write-offs have no void button. Ask your accountant how to reverse it; do not raise a fresh invoice to cover it." },
] as const;

export default function RefundOrWriteOffArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Both actions live on <strong>Refunds &amp; Write-offs</strong>, and both take money out of the books, so both are usually approved by a second person.</p>
        <GuideChecklist items={[
          "For a refund: the pupil's account is in credit, and you know the bank account the money leaves from.",
          "For a write-off: the head or board has agreed the fees will not be collected.",
          "You have the written reason.",
        ]} />
      </GuideSection>

      <GuideSection id="refund-or-write-off" title="Refund or write-off?">
        <GuideSteps>
          <GuideStep title="Refund to bank">Pays back money the parent overpaid or paid in advance: a pupil who left mid-{w.term} with credit on the account. Cash leaves the school&apos;s bank.</GuideStep>
          <GuideStep title="Write off to expense">Clears fees the school has agreed it will never collect, recording them as a bad-debt cost. No money moves.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Reducing fees is not a write-off">
          A scholarship or discount is a concession. A write-off is for debt that has been given up on.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="process-a-refund" title="Process a refund">
        <GuideSteps>
          <GuideStep title="Select New action, then Refund to bank">Set the <strong>Date</strong> first: the credit available is measured on that date.</GuideStep>
          <GuideStep title="Pick the customer">The list shows only customers with credit, each with the amount available.</GuideStep>
          <GuideStep title="Choose the bank and amount">Pick <strong>Refund to bank account</strong>. The <strong>Amount</strong> starts at the full credit available and cannot go above it.</GuideStep>
          <GuideStep title="Choose the next step">Under <strong>Next action</strong>, choose <strong>Post now</strong>, <strong>Submit for approval</strong> or <strong>Save as draft</strong>, then select the main button. Post now is left out when the refund needs approval.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="write-off-a-debt" title="Write off a debt">
        <GuideSteps>
          <GuideStep title="Select New action, then Write off to expense">Choose the <strong>Customer</strong> and the unpaid invoice under <strong>Against invoice</strong>. The amount starts at the invoice balance.</GuideStep>
          <GuideStep title="Give the reason">Fill in <strong>Reason</strong>. Leave <strong>Write-off expense account</strong> on its default unless your accountant says otherwise.</GuideStep>
          <GuideStep title="Submit or save">Choose the <strong>Next action</strong> and select the main button.</GuideStep>
        </GuideSteps>
        <p>An invoice&apos;s own <strong>Write off</strong> button does the same for one bill; it asks for a reason before it goes.</p>
      </GuideSection>

      <GuideSection id="batch-actions" title="Many at once">
        <p><strong>Batch actions</strong> handles up to 100 refunds or write-offs in one go, for example at the end of a session. Pick <strong>Refunds</strong> or <strong>Write-offs</strong>, a <strong>Posting date</strong> and a reason, then add a line per pupil. The batch is all or nothing: if any line fails, none are saved.</p>
      </GuideSection>

      <GuideSection id="approval-and-posting" title="Approval and posting">
        <p>Where your school has an approval path for them, every refund and write-off needs a second person&apos;s approval, whatever the amount, and nothing reaches the ledger until it is approved. A draft is submitted from its detail panel. If an approver sends one back, its detail panel shows <strong>Sent back</strong> as its status, and <strong>Submit for approval</strong> is not offered on it. The person who sent it for approval sees <strong>Sent back to you</strong>, with the approver&apos;s reason, and <strong>Resume</strong>, which sends it back to the approver as it is. A refund or write-off has no Edit: to change one, withdraw it under Workflow, My Submissions and submit it again. Once posted, a refund can be voided with <strong>Void refund</strong>, which gives the pupil their credit back and reverses the entry.</p>
        <GuideCallout tone="danger" title="Pay the refund once">
          The refund records cash leaving the bank. Make sure the transfer to the parent is made exactly once, and that the bank line is matched in bank reconciliation.
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
        <GuideCallout tone="tip" title="It is done when">
          The refund or write-off is approved and posted, the pupil&apos;s balance is what was agreed, the reason is on the document, and any refund transfer appears once on the bank statement.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
