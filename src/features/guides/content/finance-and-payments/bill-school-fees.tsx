import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Generate invoices is greyed out", body: "Only a structure whose Applies to is Customer can raise invoices. Edit the structure and check the setting, or ask for the generate permission if the button is missing altogether." },
  { title: "The invoice date is refused", body: "Invoice date must fall in an open fiscal period. Ask whoever runs period close to open or reopen the period, rather than picking a different date." },
  { title: "A pupil was not billed", body: "The run bills active customers only, and skips anyone already billed from the same structure. Check the pupil's customer record is Active, then raise a single invoice if they genuinely owe." },
  { title: "Somebody was billed who should not be", body: "Void the invoice from its detail panel, then check which customers are active before the next run." },
  { title: "The due date is not what you expected", body: "A blank Due date takes Default invoice due days from Finance Settings, Documents. Type the date on the form when it matters." },
  { title: "The fee structure is missing from the list", body: "Batch generate and the invoice shortcut list active structures only, and an inactive structure cannot be billed. Edit the structure and tick Active." },
] as const;

export default function BillSchoolFeesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Fees are billed from <strong>Finance</strong>, in the <strong>Receivables</strong> part of the sidebar. Everyone you bill is a <strong>customer</strong>: a pupil or a family paying for one. A <strong>fee structure</strong> is the price list for a term, and generating invoices from it raises one bill per customer.</p>
        <GuideChecklist items={[
          "The term's fees and amounts are approved.",
          "You know which income account each fee belongs to, such as tuition or bus fees.",
          "The fiscal period for the invoice date is open.",
          "Each pupil you intend to bill has an active customer record.",
        ]} />
        <GuideCallout tone="warning" title="A posted invoice is a real debt">
          Generated invoices are posted straight away: the parent owes the money from that moment, and the ledger shows it. Check the structure and the customer list before you generate, not after.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="add-customers" title="Add the pupils you bill">
        <GuideSteps>
          <GuideStep title="Open Customers / Payers">The list shows each customer&apos;s balance and status, with tabs for <strong>All</strong>, <strong>Active</strong>, <strong>Overdue</strong>, <strong>In credit</strong> and <strong>Inactive</strong>. Search by code or name before adding anyone, so a pupil does not end up with two accounts.</GuideStep>
          <GuideStep title="Select New customer">Enter the <strong>Name</strong>, <strong>Billing email</strong> and <strong>Billing phone</strong>. The email is where invoices, receipts and statements are sent, so use the parent&apos;s address. Leave <strong>Receivable account</strong> on its default unless your accountant says otherwise.</GuideStep>
          <GuideStep title="Bring across an old balance, if any">When a pupil already owes from before, enter it in <strong>Opening balance (₦)</strong> and set <strong>Opening as of</strong> to the date it was owed. That period must be open.</GuideStep>
          <GuideStep title="Keep Active ticked">Select <strong>Create customer</strong>. Only active customers are billed by a fee run, so untick Active on the Contact tab when a pupil leaves.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="build-a-fee-structure" title="Build a fee structure">
        <GuideSteps>
          <GuideStep title="Open Fee Structures and select New structure">Give it a <strong>Name</strong> a parent would recognise, such as <em>JSS 1 First Term fees</em>. <strong>Code</strong> is optional and is set from the name when left blank.</GuideStep>
          <GuideStep title="Leave Applies to on Customer">Only customer structures raise invoices. The other choices classify a structure without billing anyone.</GuideStep>
          <GuideStep title="Add a line per fee">Select <strong>Add line</strong> for each fee: <strong>Fee item</strong> (what the parent sees), <strong>GL account</strong> (the income account), <strong>Amount</strong> and, where it applies, <strong>Tax</strong>. Tick <strong>Optional</strong> for items such as bus fees that not every pupil takes.</GuideStep>
          <GuideStep title="Check the total and create">The drawer shows the <strong>Subtotal (net)</strong>. Select <strong>Create structure</strong>. Open it again from the list to see the lines, the tax and the <strong>Total per customer</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Next term, duplicate rather than retype">
          <strong>Duplicate</strong> copies every line into an inactive copy. Change the amounts, then tick Active when it is ready to bill.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="generate-invoices" title="Generate the term's invoices">
        <GuideSteps>
          <GuideStep title="Open the structure and select Generate invoices">Or use <strong>Batch generate</strong> on the Customer Invoices screen and pick the structure there. Both do the same thing.</GuideStep>
          <GuideStep title="Set the dates">Choose the <strong>Invoice date</strong>. Type a <strong>Due date</strong> when you want a specific one; left blank, the due date comes from <strong>Default invoice due days</strong> in Finance Settings, Documents.</GuideStep>
          <GuideStep title="Select Generate">The screen confirms how many invoices were raised. The structure&apos;s activity then reads <em>Used to generate</em> with the count.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Generate bills every active customer">
          The run raises one posted invoice for every active customer, from this one structure. It does not pick a class. Before generating, make sure the active customers are exactly the pupils this structure is for. Customers already billed from the same structure are skipped, so running it twice does not double-bill anybody.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="raise-a-single-invoice" title="Raise a single invoice">
        <p>Use a single invoice for one pupil: a late admission, a replacement uniform, an exam fee.</p>
        <GuideSteps>
          <GuideStep title="Select New invoice">On <strong>Customer Invoices</strong>, choose the <strong>Customer</strong> and <strong>Invoice date</strong>. <strong>Reference</strong> and <strong>Narration</strong> are optional and print on the invoice.</GuideStep>
          <GuideStep title="Start from a fee structure, if one fits">Picking one under <strong>Start from a fee structure (optional)</strong> fills the lines, which you can still change, add to or remove.</GuideStep>
          <GuideStep title="Check each line">Each line needs an income account and a unit price. The drawer shows Subtotal, Tax and Total as you type.</GuideStep>
          <GuideStep title="Issue or save a draft">With <strong>Issue now (post the AR journal)</strong> ticked the button reads <strong>Issue invoice</strong> and the bill is posted. Untick it to <strong>Save draft</strong> and post later.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="check-an-invoice" title="Check an invoice">
        <p>Select any row on <strong>Customer Invoices</strong> to open it. The cards show <strong>Total</strong>, <strong>Paid (cash)</strong>, <strong>Credited</strong>, <strong>Settled</strong>, <strong>Balance due</strong> and <strong>Aging</strong>. The tabs underneath hold the <strong>Lines</strong>, the <strong>Settlements</strong> applied to it, its <strong>GL postings</strong>, <strong>Reminders</strong> and <strong>Activity</strong>.</p>
        <p>The status tabs on the list (<strong>All</strong>, <strong>Draft</strong>, <strong>Issued</strong>, <strong>Partial</strong>, <strong>Paid</strong>, <strong>Overdue</strong>) are the quickest way to see who owes what. <strong>Print PDF</strong> opens the invoice for printing.</p>
        <GuideCallout tone="warning" title="Void only a bill raised in error">
          <strong>Void invoice</strong> removes the debt and reverses its ledger entry. The original stays in history. To reduce a correct bill, for a scholarship or a sibling discount, use a concession or credit note instead.
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
        <GuideCallout tone="tip" title="The term is billed when">
          Every pupil who owes has one invoice for the term, the totals on Customer Invoices match the approved fee schedule, the due dates are the ones you intended, and no one who should not owe has a bill.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
