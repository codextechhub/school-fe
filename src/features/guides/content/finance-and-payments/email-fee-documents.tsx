import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The email button is missing", body: "Invoice, receipt and statement emails each have their own permission. A receipt can only be emailed once it is posted." },
  { title: "To says No recipient", body: "The customer has no billing email. Add the parent's address on the customer's Contact tab, then try again." },
  { title: "Send is disabled", body: "Wait for the recipients to load. When a send is blocked, the panel shows the reason in an amber box." },
  { title: "The parent says nothing arrived", body: "Check Previously sent. Sent means the mail service accepted it, so ask the parent to look in spam before you retry." },
] as const;

export default function EmailFeeDocumentsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Invoices, receipts and statements go to the <strong>Billing email</strong> on the pupil&apos;s customer record. Check that address before you send: an invoice sent to the wrong parent shows another family a child&apos;s fees.</p>
        <GuideCallout tone="danger" title="A sent email cannot be recalled">
          Every send stops at a confirmation panel that names the address. If it is wrong, cancel and correct the customer first.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="choose-the-document" title="Choose the document">
        <GuideSteps>
          <GuideStep title="An invoice">Open it on <strong>Customer Invoices</strong> and select <strong>Email invoice</strong>.</GuideStep>
          <GuideStep title="A receipt">Open it on <strong>Receipts &amp; Allocation</strong> and select <strong>Email receipt</strong>.</GuideStep>
          <GuideStep title="A statement">Open the pupil on <strong>Customers / Payers</strong>. The <strong>Statement</strong> tab opens first; set <strong>From</strong> and <strong>To</strong>, check the opening and closing balances, then select <strong>Send to customer</strong>. <strong>Print</strong> gives you a paper copy instead.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="check-and-send" title="Check and send">
        <p>The panel shows the <strong>Subject</strong>, who it goes <strong>To</strong>, and any <strong>BCC</strong> copy. A PDF copy is attached.</p>
        <GuideChecklist items={[
          "The To address is the parent's.",
          "The document or statement period is the one the parent asked for.",
          "Previously sent does not show it already went out.",
          "Any note you add is about this pupil only.",
        ]} />
        <p>Add a covering message in <strong>Optional note to the customer</strong> if you want, then select <strong>Send</strong>.</p>
      </GuideSection>

      <GuideSection id="retry-a-failed-send" title="Retry a failed send">
        <p>Open the same email button again. <strong>Previously sent</strong> lists every attempt as <strong>Sent</strong>, <strong>Sending</strong> or <strong>Failed</strong>, including any copy sent automatically when the document posted. A failed attempt shows the reason and a <strong>Retry</strong> button.</p>
        <GuideCallout tone="warning" title="Fix the address before retrying">
          A retry to the same wrong address fails again. Correct the billing email on the customer&apos;s Contact tab first. The failed attempt stays in the list either way.
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
          The document went to the right parent, Previously sent shows it as Sent, and any failure has been retried after the address was fixed.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
