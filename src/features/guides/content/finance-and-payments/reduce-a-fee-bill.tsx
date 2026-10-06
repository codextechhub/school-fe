import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The button says Submit for approval", body: "The amount is at or over your school's approval threshold, so a second person must approve it before it reaches the ledger. Nothing changes on the bill until then." },
  { title: "Nobody can approve this", body: "No one currently holds the approving role. Leave it waiting and ask whoever manages roles to assign someone. Continue anyway approves it without review and records your name." },
  { title: "Against invoice is empty", body: "Pick the customer first. Only posted invoices with a balance still owing are listed." },
  { title: "The date is refused", body: "A concession cannot be dated before the invoice it reduces, and the date must fall in an open fiscal period. Sending it for approval, or resuming it, checks the month of its own branch: if Ikeja Branch has closed September 2026, an Ikeja concession dated in September is refused at once, with a message naming Ikeja Branch and September 2026. At a school with one branch the message names only the month." },
  { title: "Apply to balance is missing", body: "It appears on an issued credit note that still has unapplied credit, for people who hold the apply permission. Debit notes are settled by receipts instead." },
] as const;

export default function ReduceAFeeBillArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A correct bill that the school has agreed to reduce is adjusted, not voided. Keep the approval behind it (a scholarship letter, the sibling policy, a head&apos;s note) so the adjustment can be explained later.</p>
        <GuideChecklist items={[
          "You know which pupil and which invoice the adjustment is for.",
          "You know the amount, or the percentage of the balance.",
          "You have the reason in words a parent or auditor would accept.",
        ]} />
      </GuideSection>

      <GuideSection id="choose-the-adjustment" title="Choose the right adjustment">
        <GuideSteps>
          <GuideStep title="Concession">For a <strong>Waiver</strong>, <strong>Discount</strong> or <strong>Scholarship</strong> against one invoice: a sibling discount, a staff child&apos;s waiver, a scholarship. It reduces the fee income and what the pupil owes.</GuideStep>
          <GuideStep title="Credit note">For a bill that charged too much: a fee billed in error, a withdrawn optional item. It lowers the pupil&apos;s balance and reverses the income.</GuideStep>
          <GuideStep title="Debit note">For something the bill left out: an extra charge after the invoice went out. It raises the pupil&apos;s balance.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Wrong bill altogether?">
          If the invoice should never have been raised, void it from its detail panel on Customer Invoices instead.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="grant-a-concession" title="Grant a concession">
        <GuideSteps>
          <GuideStep title="Open Concessions and select New concession">Choose the <strong>Type</strong>, the <strong>Customer</strong> and the invoice under <strong>Against invoice</strong>.</GuideStep>
          <GuideStep title="Enter the size">Under <strong>Enter as</strong>, choose <strong>Amount</strong> or <strong>% of balance</strong>. The screen shows the other figure beside it, so you can check a 10% discount comes to the naira amount you expect.</GuideStep>
          <GuideStep title="Give the reason">Fill in <strong>Basis / reason</strong>, for example <em>Sibling discount 10%</em>. Leave <strong>Allowance account</strong> on its default unless your accountant says otherwise.</GuideStep>
          <GuideStep title="Post, submit or save">The main button reads <strong>Post concession</strong> or <strong>Submit for approval</strong>, depending on the amount. <strong>Save draft</strong> keeps it for later; a draft is posted or submitted from its detail panel.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="issue-a-note" title="Issue a credit or debit note">
        <GuideSteps>
          <GuideStep title="Open Credit / Debit Notes and select Issue note">Choose <strong>Credit note</strong> or <strong>Debit note</strong>, the <strong>Date</strong> and the <strong>Customer</strong>.</GuideStep>
          <GuideStep title="Choose the account and invoice">Pick the income account the note affects. <strong>Against invoice</strong> is optional; linking it keeps the story on one bill.</GuideStep>
          <GuideStep title="Enter the amount and reason">Both are required. A cost centre is optional.</GuideStep>
          <GuideStep title="Decide what happens to a credit">For a credit note, <strong>Apply on issue?</strong> offers <strong>Leave as credit (Issued)</strong> or <strong>Apply to oldest invoices (Applied)</strong>. Credit left on the account can be applied later with <strong>Apply to balance</strong>.</GuideStep>
          <GuideStep title="Select Issue note">Or <strong>Submit for approval</strong>, when the amount needs it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="approval" title="When approval is needed">
        <p>Credit notes and concessions need a second person&apos;s approval at or above the school&apos;s threshold, and the form says so before you save. A submitted document waits in the approvals queue and reaches the ledger only once it is approved. Its status reads <strong>Awaiting approval</strong> until then. A draft credit note is sent with <strong>Submit for approval</strong>. Any draft credit note, debit note or concession, including one whose approval was rejected or withdrawn, can be corrected with <strong>Edit</strong> before it is sent again, by anyone who may create that kind of document.</p>
        <p>If an approver sends a credit note, debit note or concession back, the person who sent it for approval sees <strong>Sent back to you</strong> on it, with the approver&apos;s reason. <strong>Edit</strong> corrects it in place, and <strong>Resume</strong> sends the corrected version back into the same approval. On a note with several lines, Edit changes the date, reference and reason, and the lines stay as they are. Nobody else gets these buttons. Meanwhile its status reads <strong>Sent back</strong>, on its row and when you open it. The status filters on credit notes and on concessions have a <strong>Sent back</strong> choice that lists them, and no other status lists them.</p>
        <GuideCallout tone="warning" title="Void undoes the adjustment">
          <strong>Void concession</strong> and <strong>Void credit note</strong> put the pupil&apos;s balance back as it was and reverse the ledger entry. The original stays in history. Use them for mistakes, not to change your mind quietly.
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
          The adjustment is posted (or approved), the invoice&apos;s Settlements tab shows it, the pupil&apos;s balance is what the policy says, and the reason is written on the document.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
