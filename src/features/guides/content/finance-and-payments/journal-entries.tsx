import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Post entry stays disabled", body: "The entry does not balance, or a line has an amount but no account. The bar at the bottom reads Must balance until debits equal credits." },
  { title: "The date cannot be picked", body: "Only dates in an open fiscal period are offered. If none is open, the field says so; ask whoever runs period close." },
  { title: "Reverse is missing on a journal", body: "The journal came from an invoice, receipt or other document. Void that document instead, so the pupil's account and the ledger stay together." },
  { title: "New journal is missing", body: "Posting a journal directly needs its own permission. Ask whoever manages roles." },
] as const;

export default function JournalEntriesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Almost every entry in the ledger is made for you: invoices, receipts, payroll and bank adjustments each post their own. A manual journal is for what nothing else records, such as opening balances, a loan, or a correction your accountant has agreed.</p>
        <GuideChecklist items={[
          "You know every account and amount, and the debits equal the credits.",
          "The date falls in an open fiscal period.",
          "You have the paperwork behind it: a board minute, a loan letter, an accountant's note.",
        ]} />
        <GuideCallout tone="danger" title="Never fix a fee balance with a journal">
          A journal changes the ledger but not the pupil&apos;s account. To change what a pupil owes, use a credit note, concession, refund or void in Receivables.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="find-a-journal" title="Find a journal">
        <p>Open <strong>General Ledger</strong>. The <strong>Journal Entries</strong> screen lists every journal, with tabs for <strong>All</strong>, <strong>Drafts</strong>, <strong>Pending</strong>, <strong>Approved</strong>, <strong>Posted</strong>, <strong>Reversed</strong> and <strong>Cancelled</strong>. Narrow it by <strong>Source</strong> (Manual, Sales, Bank, Payroll and so on) and by period, or search by journal number or reference. Select a row to see its lines.</p>
      </GuideSection>

      <GuideSection id="post-a-journal" title="Post a journal">
        <GuideSteps>
          <GuideStep title="Select New journal">Choose the <strong>Date</strong>. Add a <strong>Reference</strong> and a <strong>Narration</strong> that says what the entry is for.</GuideStep>
          <GuideStep title="Add the lines">Under <strong>Postings</strong>, pick an account on each line, set it to <strong>Debit</strong> or <strong>Credit</strong>, and enter the amount. A cost centre is optional. Use <strong>Add line</strong> for more.</GuideStep>
          <GuideStep title="Check it balances">The bar at the bottom shows the debit and credit totals and reads <strong>Balanced</strong> when they agree.</GuideStep>
          <GuideStep title="Select Post entry">There is no draft step on this form. Where the school has no approval route for journals, the journal posts straight away. Where it has one, the journal waits for approval instead, and the message says so.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="drafts-and-approval" title="Drafts and approval">
        <p>A journal in <strong>Drafts</strong> shows a <strong>Submit</strong> button. Submitting sends it for approval, and it posts only once the final approver agrees.</p>
        <p>If an approver sends a journal back, the person who sent it for approval sees <strong>Sent back to you</strong> on it, with the approver&apos;s reason. On a manual journal, <strong>Edit</strong> opens the entry to correct it; select <strong>Save changes</strong>, then <strong>Resume</strong> to send the corrected version back into the same approval. A journal raised by another document can only be resumed as it is. Nobody else gets these buttons.</p>
      </GuideSection>

      <GuideSection id="reverse-a-journal" title="Reverse a journal">
        <GuideCallout tone="warning" title="Reversing cannot be undone">
          <strong>Reverse</strong> on a posted manual journal posts a mirror entry that cancels it. The original stays in the ledger. A journal raised by a document offers the document&apos;s void button instead, because the document must be undone with it.
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
        <GuideCallout tone="tip" title="The journal is done when">
          It reads Posted, the Difference card reads Balanced, the narration explains it, and the paperwork behind it is filed.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
