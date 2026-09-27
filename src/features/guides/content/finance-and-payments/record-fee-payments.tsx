import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The payment date is refused", body: "The date must fall in an open fiscal period. Use the real date the money arrived, and ask whoever runs period close if that period is shut." },
  { title: "Apply allocation stays disabled", body: "Allocate more than zero, keep each line within that invoice's balance, and keep the total within the receipt's unallocated amount. The summary turns red when it is over." },
  { title: "No open items are listed", body: "The pupil owes nothing right now, so the money stays as credit on their account and can be applied when the next bill is raised." },
  { title: "The money went to the wrong pupil", body: "Void the receipt and record it again against the right customer. Moving it with a journal would leave both pupils' balances wrong." },
  { title: "A refunded receipt looks available", body: "The Unallocated column counts only credit still left, so a receipt that has been refunded shows nothing to apply. Check the Refunded column." },
  { title: "Record receipt is missing", body: "Recording money needs the record-payment permission, and applying it needs the allocate permission. Ask whoever manages roles." },
] as const;

export default function RecordFeePaymentsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>When a parent pays, the money is recorded once as a <strong>receipt</strong> and then <strong>allocated</strong> to the bills it pays. Recording puts the money in the bank account in the ledger; allocating reduces what the pupil owes.</p>
        <GuideChecklist items={[
          "You have the evidence: a bank alert, a teller, a cheque or cash counted.",
          "You know which pupil the money is for and how much arrived.",
          "You know which bank or cash account received it.",
          "The fiscal period for the payment date is open.",
        ]} />
        <GuideCallout tone="info" title="Paid online? It is already recorded">
          Money paid through a payment link or into a pupil&apos;s virtual account is recorded automatically once the payment provider confirms it. A payment tied to a bill is applied to it; one that is not waits as credit, and appears here as an Unallocated receipt for you to allocate. Do not record it again, or the pupil is credited twice.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="choose-where-to-record" title="Choose where to record it">
        <GuideSteps>
          <GuideStep title="From Receipts & Allocation">Best for everyday receipting. <strong>Record receipt</strong> captures the money first, then lets you choose which bills it pays.</GuideStep>
          <GuideStep title="From an invoice">Open the invoice, go to its <strong>Settlements</strong> tab and select <strong>Record payment</strong>. The money is applied to that invoice, and any excess is kept as credit on the pupil&apos;s account.</GuideStep>
          <GuideStep title="From a customer">Open the customer and select <strong>Record payment</strong>. The money is applied to their open invoices, oldest first. The button shows only while the customer owes money.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="record-the-receipt" title="Record the receipt">
        <GuideSteps>
          <GuideStep title="Select Record receipt">On <strong>Receipts &amp; Allocation</strong>, choose the <strong>Customer</strong> and the <strong>Date</strong> the money arrived.</GuideStep>
          <GuideStep title="Enter how it was paid">Pick the <strong>Method</strong> (Bank transfer, Cash, Card, Cheque, Online or Other), the <strong>Amount (₦)</strong> actually received, and the <strong>Bank account</strong> it went into. Put the teller or transfer number in <strong>Reference</strong> so the bank reconciliation can find it later.</GuideStep>
          <GuideStep title="Read the posting">Under <strong>Posting on receipt</strong> the screen shows the bank account going up and the amount owed going down. Anything more than the pupil owes is held as credit on their account.</GuideStep>
          <GuideStep title="Select Continue to allocation">The receipt is saved and its allocation panel opens straight away.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="allocate-the-receipt" title="Allocate the receipt">
        <p>Under <strong>Apply to open items</strong> you see the pupil&apos;s unpaid invoices and debit notes, each with its balance.</p>
        <GuideSteps>
          <GuideStep title="Let it split automatically">With <strong>Auto-allocate</strong> ticked, choose <strong>oldest first</strong> (the usual choice) or <strong>largest first</strong>, and the amounts fill in.</GuideStep>
          <GuideStep title="Or split it yourself">Untick Auto-allocate to type the amount for each bill, for example when a parent says the money is for this term only.</GuideStep>
          <GuideStep title="Check the summary">The <strong>Allocation summary</strong> shows the Receipt amount, what is Allocated and the Remainder. A remainder stays as credit on the pupil&apos;s account.</GuideStep>
          <GuideStep title="Select Apply allocation">The bills&apos; balances drop and their status changes to Partially Paid or Paid.</GuideStep>
        </GuideSteps>
        <p>A receipt left unallocated can be opened again at any time from the list; the <strong>Unallocated</strong> tab gathers them.</p>
      </GuideSection>

      <GuideSection id="print-or-email" title="Print or email the receipt">
        <p>Every row on <strong>Receipts &amp; Allocation</strong> has a <strong>PDF</strong> button. To send it to the parent, open the receipt and select <strong>Email receipt</strong>: the panel shows the subject and the address it goes to before anything is sent, and lists anything already sent.</p>
      </GuideSection>

      <GuideSection id="void-a-receipt" title="Void a receipt recorded in error">
        <GuideCallout tone="warning" title="Void puts the debt back">
          <strong>Void receipt</strong> undoes every allocation, so the bills it paid are owed again, and reverses the ledger entries. The original stays in history. Use it for money recorded twice or against the wrong pupil, never to hide a real payment.
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
        <GuideCallout tone="tip" title="The payment is done when">
          The receipt matches the bank evidence, it sits against the right pupil, the bills it pays show the lower balance, and any remainder is credit you meant to leave.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
