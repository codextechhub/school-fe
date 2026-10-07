import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The payment can only settle the payer's own bills", body: "The payer is not linked to anyone yet. Open the payer's customer record, go to Payers, and link the children they pay for." },
  { title: "Record payment stays greyed out", body: "Something changed after the preview. Select Preview again, check the split, then record." },
  { title: "The amounts come to more than was received", body: "Amounts typed by hand may add up to less than the payment, never to more. Lower one of them." },
  { title: "A child's bills are not listed", body: "They are billed at a branch you do not work in. You see the child and the amount, not their bills; that branch settles them." },
  { title: "Void payment is refused", body: "A share has already been forwarded to another branch, or the payment's bank line is matched on a reconciliation. Void the forward, or unmatch the line, first." },
  { title: "One receipt of a payer payment cannot be voided", body: "Its receipts are voided together, from the payer payment, never one at a time." },
  { title: "The credit transfer has not moved anything", body: "It is still a draft or waiting for approval. Nothing moves until a second person approves it under Workflow, Approvals." },
] as const;

/**
 * Payer links, payer payments and credit transfers.
 *
 * A payer payment is recorded into a bank account of the reader's own
 * branches, and bills at a branch the reader does not work in are shown as an
 * amount only. A credit transfer never posts directly: it always waits for a
 * second person's approval.
 */
export default function PayerPaymentsAndCreditTransfersArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A receipt settles only its own customer&apos;s bills. When one person pays for several children, for example a parent paying one transfer for two children, or a sponsor paying for a group of pupils, record it once as a <strong>payer payment</strong>. It makes one receipt for each child. When credit one child has left over should pay another child&apos;s fees, move it with a <strong>credit transfer</strong>.</p>
        <GuideChecklist items={[
          "The payer has a customer account of their own, under Customers / Payers.",
          "The payer is linked to each child they pay for.",
          "You know which bank account the money arrived in, and its date and reference.",
        ]} />
      </GuideSection>

      <GuideSection id="link-payers" title="Link a payer to the children they pay for">
        <GuideSteps>
          <GuideStep title="Open the payer's customer record">On <strong>Customers / Payers</strong>, open the payer&apos;s account and go to its <strong>Payers</strong> tab.</GuideStep>
          <GuideStep title="Add each child">Under <strong>Pays for</strong>, pick the child in <strong>Add a customer they pay for</strong> and select <strong>Link</strong>. Repeat for each child.</GuideStep>
        </GuideSteps>
        <p>A payer can pay for many children, and a child can have several payers, such as a parent and a sponsor; a child&apos;s record lists them under <strong>Paid by</strong>. To stop a payer paying for a child, select <strong>End</strong> on the link. The link is kept, so payments already split under it keep their shares, and linking the two again switches it back on.</p>
        <GuideCallout tone="info" title="Fee runs leave payer accounts out">
          A fee run that bills every active customer does not bill a payer&apos;s own account.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="record-a-payer-payment" title="Record one payment for several children">
        <p>Say Mr Okafor pays ₦500,000 into Bright Star&apos;s Ikeja bank account for Ada and Emeka.</p>
        <GuideSteps>
          <GuideStep title="Open Payer Payments and select Record payer payment">Choose the <strong>Payer</strong> and the account it was <strong>Received into</strong>. Only your own branches&apos; bank accounts are offered.</GuideStep>
          <GuideStep title="Enter the payment">Fill in the <strong>Amount</strong>, <strong>Payment date</strong>, <strong>Method</strong> and <strong>Reference</strong>.</GuideStep>
          <GuideStep title="Choose how to split it">Under <strong>How to split it</strong>, keep the school&apos;s setting, which the first choice names, such as <strong>School setting: Oldest bill first, across every customer</strong>. Or choose <strong>Oldest bill first, across every customer</strong>, <strong>In proportion to what each customer owes</strong>, or <strong>I will enter each customer&apos;s amount</strong>. Everyone who may record a payer payment sees these same names, whether or not they can open the finance settings. Amounts typed by hand may come to less than the payment, never more.</GuideStep>
          <GuideStep title="Select Preview split">The preview names the split, shows each child, how their share will be booked, the amount, and the bills it settles. Opening a recorded payment shows the same name under <strong>Split</strong>, or <strong>Entered per customer</strong> when the amounts were typed by hand. Select <strong>Change the amounts</strong> to adjust it by hand.</GuideStep>
          <GuideStep title="Select Record payment">Nothing is saved until you do. If you change the form after the preview, preview it again first.</GuideStep>
        </GuideSteps>
        <p>An amount entered for a child above what they owe stays as that child&apos;s credit. Money that no bill takes goes where the school&apos;s setting under Finance Settings, <strong>Receivables</strong>, says.</p>
      </GuideSection>

      <GuideSection id="other-branch" title="A child billed at another branch">
        <p>No branch&apos;s receipt settles another branch&apos;s bill. If Emeka is billed at Lekki, Emeka&apos;s share of the money Ikeja received is <strong>held for Lekki</strong> and forwarded through the usual approval route. Opening the payment shows each share, and a held one reads as held for Lekki until it is forwarded. It settles Emeka&apos;s bills when it reaches Lekki.</p>
        <p>You see the bills only at branches you work in. For a child billed elsewhere, the preview shows the child and the amount, not their bills.</p>
      </GuideSection>

      <GuideSection id="void-a-payer-payment" title="Void a payer payment">
        <p>Open the payment, select <strong>Void payment</strong>, and confirm. Every receipt and held share it made is voided together, and the bills they settled are owed again. No single receipt of a payer payment can be voided on its own.</p>
        <GuideCallout tone="warning" title="When a void is refused">
          A void is refused once a held share has been forwarded to the other branch, or once the payment&apos;s bank line is matched on a reconciliation.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="credit-transfer" title="Move credit from one child to another">
        <p>Say Tunde overpaid by ₦15,000 and the family asks for it to go towards their sibling Ada&apos;s fees.</p>
        <GuideSteps>
          <GuideStep title="Open Credit Transfers and select New transfer">Choose the <strong>From customer</strong> and the <strong>To customer</strong>. The drawer shows the <strong>Unused credit available</strong> on the first.</GuideStep>
          <GuideStep title="Enter the amount and reason">Fill in the <strong>Amount</strong>, the <strong>Transfer date</strong> and the <strong>Reason</strong>.</GuideStep>
          <GuideStep title="Submit for approval">Select <strong>Submit for approval</strong>, or <strong>Save draft</strong> to submit it later. Neither child&apos;s credit changes until a second person approves it under Workflow, Approvals.</GuideStep>
        </GuideSteps>
        <p>Once approved, Tunde&apos;s credit drops by ₦15,000 and Ada&apos;s rises by the same. A transfer belongs to the first child&apos;s branch, and both children must be filed under that branch or shared by every branch. A posted transfer made in error is undone with <strong>Void</strong>, which gives the credit back.</p>
        <p>If the approver sends a transfer back, its status reads <strong>Sent back</strong>, on its row and when you open it, and the status filter lists it only under <strong>Sent back</strong>, not under <strong>Draft</strong>. The person who sent it for approval sees <strong>Sent back to you</strong> and <strong>Resume</strong>, which sends it back to the approver as it is. A credit transfer has no Edit: to change one, withdraw it under Workflow, My Submissions and submit it again.</p>
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
        <GuideCallout tone="tip" title="It is right when">
          Each payer is linked to the children they pay for, every payment from a payer is recorded once with one receipt per child, held shares have been forwarded, and every credit transfer has been approved or cancelled.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
