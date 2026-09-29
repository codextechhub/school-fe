import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";
import { useGuideWords } from "../../guide-words";

const PROBLEMS = [
  { title: "New plan is missing", body: "Creating a plan also starts it, so you need both the create and the activate permission for payment plans." },
  { title: "The invoice is not listed", body: "Pick the customer first. Only posted invoices with a balance still owing can be spread." },
  { title: "Record installment is missing", body: "It shows on an active plan with an unpaid installment, for people who can record payments." },
  { title: "A plan shows At risk", body: "The next unpaid installment is past its due date. Contact the parent, then record what they pay." },
] as const;

export default function PaymentPlansArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A payment plan spreads one invoice&apos;s balance into dated installments, for a parent who has agreed to pay the {w.term}&apos;s fees in parts. The invoice stays the debt; the plan only tracks when each part is due.</p>
        <GuideChecklist items={[
          "The invoice is posted and still has a balance.",
          "You have agreed the number of installments and how often with the parent.",
          "You know the date of the first installment.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-plan" title="Create the plan">
        <GuideSteps>
          <GuideStep title="Open Payment Plans and select New plan">Choose the <strong>Customer</strong>, then the invoice under <strong>Against invoice</strong>. <strong>Total</strong> fills in with its balance.</GuideStep>
          <GuideStep title="Set the schedule">Enter the <strong>Start date</strong>, the number of <strong>Installments</strong> (up to 60) and the <strong>Frequency</strong>: Weekly, Fortnightly, Monthly or Quarterly.</GuideStep>
          <GuideStep title="Check the preview">The <strong>Schedule preview</strong> lists every installment with its due date and amount. Read it to the parent, or print it, before you save.</GuideStep>
          <GuideStep title="Select Create plan">The plan starts straight away and appears as <strong>On track</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="record-an-installment" title="Record an installment">
        <GuideSteps>
          <GuideStep title="Open the plan and select Record installment">The amount starts at the installment&apos;s balance; change it to what the parent actually paid.</GuideStep>
          <GuideStep title="Enter how it was paid">Choose the <strong>Date</strong>, <strong>Method</strong> and <strong>Deposit account</strong>.</GuideStep>
          <GuideStep title="Select Record receipt">This posts a real receipt against the invoice, and the plan&apos;s progress updates on its own. The receipt email to the parent is queued.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Record it once">
          An installment recorded here is already a receipt. Do not record the same money again on Receipts &amp; Allocation.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="follow-and-cancel" title="Follow a plan, or cancel it">
        <p>The list shows each plan&apos;s <strong>Progress</strong>, <strong>Next due</strong> date and status: <strong>On track</strong>, <strong>At risk</strong>, <strong>Completed</strong> or <strong>Cancelled</strong>. Inside a plan, each installment reads <strong>Paid</strong>, <strong>Partial</strong>, <strong>Due</strong> or <strong>Scheduled</strong>.</p>
        <p><strong>Cancel plan</strong> stops tracking the installments. Payments already recorded stay posted, and the invoice keeps whatever balance is left.</p>
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
          The schedule matches what the parent agreed, every payment is recorded once against the plan, and the plan reads Completed when the invoice is cleared.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
