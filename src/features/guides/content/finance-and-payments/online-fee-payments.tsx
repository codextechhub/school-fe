import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "A parent paid but the row says Pending", body: "The provider has not confirmed yet. Open the row and select Re-verify to ask the provider again." },
  { title: "The money landed as credit, not against the bill", body: "The checkout had no invoice. Open Receipts & Allocation, find the receipt and allocate it to the bill." },
  { title: "No collections access", body: "Collections and Virtual Accounts need the collections view permission. Ask whoever manages roles." },
  { title: "A virtual account should stop taking money", body: "Open it and select Deactivate. Reactivate turns it back on." },
] as const;

export default function OnlineFeePaymentsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Parents can pay online in two ways: through a <strong>payment link</strong> (a checkout page) you send them, or by transfer into a <strong>virtual account</strong>, a bank account number that belongs to one pupil. Either way, once the payment provider confirms the money, the receipt is recorded for you.</p>
        <GuideChecklist items={[
          "The pupil has a customer record with the parent's email.",
          "The bill to be paid is posted.",
          "Your role can create payment links: Request payment and New checkout need it.",
        ]} />
        <GuideCallout tone="warning" title="Never record online money by hand as well">
          A confirmed online payment is already a receipt. Recording it again on Receipts &amp; Allocation credits the pupil twice.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="send-a-payment-link" title="Send a payment link for one bill">
        <GuideSteps>
          <GuideStep title="Open the invoice">On <strong>Customer Invoices</strong>, open the bill and go to its <strong>Settlements</strong> tab.</GuideStep>
          <GuideStep title="Select Request payment">The panel shows the <strong>Amount to collect</strong>, which is the bill&apos;s balance. Add a <strong>Narration</strong> if you want, then select <strong>Generate payment link</strong>.</GuideStep>
          <GuideStep title="Share the link">Use <strong>Copy</strong> to paste the checkout link into a message to the parent, then <strong>Done</strong>. When they pay, the receipt is recorded and applied to this invoice.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="create-a-checkout" title="Create a checkout from Collections">
        <GuideSteps>
          <GuideStep title="Select New checkout">Choose the <strong>Customer</strong>. Pick a bill under <strong>Invoice (optional)</strong> and the amount fills in with its balance; leave it blank to hold the payment as credit on the pupil&apos;s account.</GuideStep>
          <GuideStep title="Fill in the rest">Choose the <strong>Provider</strong>, and add the <strong>Customer email</strong> and a <strong>Narration</strong> the parent will recognise, such as <em>Third term fees, A. Williams</em>.</GuideStep>
          <GuideStep title="Select Create checkout link">The link is created and copied, ready to send.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="follow-a-payment" title="Follow a payment">
        <p><strong>Collections</strong> lists every online payment as <strong>Pending</strong>, <strong>Paid</strong>, <strong>Failed</strong> or <strong>Refunded</strong>, with cards for what has been collected, what is pending and the success rate. Open a row for its <strong>Status timeline</strong>: when the checkout was created, whether the link is ready, and when the payment was confirmed. Once paid, it names the receipt it created.</p>
        <p>While a payment is still pending, <strong>Re-verify</strong> asks the provider for its latest answer, and <strong>Copy link</strong> copies the checkout link again.</p>
        <p>When the provider refused a checkout or a payment failed, open <strong>Payment provider activity</strong> under Payments. It lists every request made to the payment provider, the refused and failed ones included, with the reason in full. Select the copy button beside a reference to quote it to the provider.</p>
        <p>A paid online payment waits with the provider until it reaches the branch&apos;s bank. How it gets there, and how the provider&apos;s deposit is booked, has a guide of its own.</p>
      </GuideSection>

      <GuideSection id="virtual-accounts" title="Give a pupil a virtual account">
        <GuideSteps>
          <GuideStep title="Open Virtual Accounts and select New virtual account">Choose the <strong>Customer</strong> and the <strong>Provider</strong>. The deposit account and bank code are optional.</GuideStep>
          <GuideStep title="Select Provision account">The provider issues an account number that belongs to this pupil only. Give it to the parent.</GuideStep>
          <GuideStep title="Watch the money arrive">Every transfer into it appears on Collections as a virtual account transfer, and on the account&apos;s own panel under <strong>Funds received through this account</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Treat the account number like the pupil's own">
          Give each number only to that pupil&apos;s family. Money a stranger sends to it is credited to that pupil.
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
        <GuideCallout tone="tip" title="It is working when">
          Each online payment reads Paid on Collections and names its receipt, nobody has recorded it a second time by hand, and any payment not tied to a bill has been allocated on Receipts &amp; Allocation.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
