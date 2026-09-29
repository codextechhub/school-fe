import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";
import { useGuideWords, type TermWords } from "../../guide-words";

const problems = (w: TermWords) => [
  { title: "Generate invoices is greyed out", body: "Only a structure whose Applies to is Customer can raise invoices. Edit the structure and check the setting, or ask for the generate permission if the button is missing altogether." },
  { title: `It says the structure is not linked to a ${w.term}`, body: `Link it from the Generate invoices drawer. That needs permission to edit fee structures; without it, ask someone who has it. A structure bills one ${w.term}, so next ${w.term} needs its own structure.` },
  { title: "No classes are offered", body: "The classes shown are those of the year the structure is linked to, at its branch if it has one. Set up that year's classes under Academics. If the drawer says your role cannot see the class lists, ask for access to students and classes." },
  { title: "A pupil was not billed", body: "The run bills pupils on the roll in the classes you chose (Enrolled, Active or Suspended), and leaves out anyone already billed from the same structure. Check the pupil is in one of those classes this year and has not been withdrawn." },
  { title: "Somebody was billed who should not be", body: "Void the invoice from its detail panel, then check the pupil's class and status before the next run." },
  { title: "The due date is not what you expected", body: `Fee bills take their due date from Fee due dates in Finance Settings, worked out against the ${w.term} the structure is linked to. The preview shows the date before anything is billed.` },
  { title: "The run is refused because the period is closed", body: "Bills are dated the day they are raised, so today's fiscal period must be open. Ask whoever runs period close to open it." },
  { title: "The fee structure is missing from Batch generate", body: "Batch generate lists active Customer structures only, and an inactive structure cannot be billed. Edit the structure and tick Active." },
] as const;

export default function BillSchoolFeesArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Fees are billed from <strong>Finance</strong>, in the <strong>Receivables</strong> part of the sidebar. A <strong>fee structure</strong> is the price list for a {w.term}. Generating invoices from it bills the pupils in the classes you choose, one bill each.</p>
        <GuideChecklist items={[
          `The ${w.term}'s fees and amounts are approved.`,
          "You know which income account each fee belongs to, such as tuition or bus fees.",
          `The ${w.term} is set up under Academics, and each pupil is in their class for it.`,
          "Today's fiscal period is open, because bills are dated the day they are raised.",
        ]} />
        <GuideCallout tone="warning" title="A posted invoice is a real debt">
          Generated invoices are posted straight away: the parent owes the money from that moment, and the ledger shows it. Read the preview before you bill, not the invoices after.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="add-customers" title="How pupils get an account">
        <p>You do not add pupils as customers yourself. The first time a pupil is billed, the run opens their account, named for the child, at the pupil&apos;s branch. Every later bill, receipt and statement for that pupil goes to the same account.</p>
        <p><strong>Customers / Payers</strong> lists those accounts with each one&apos;s balance and status. Use it to look a pupil up and to set the <strong>Billing email</strong>, which is where invoices, receipts and statements are sent.</p>
        <GuideCallout tone="warning" title="Do not add a pupil by hand">
          A customer added with <strong>New customer</strong> is not linked to the pupil, so the fee run opens a second account for them and the family ends up with two balances. Add a customer by hand only for someone who is not a pupil, and ask your accountant before entering a balance a pupil owed from before.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="build-a-fee-structure" title="Build a fee structure">
        <GuideSteps>
          <GuideStep title="Open Fee Structures and select New structure">Give it a <strong>Name</strong> a parent would recognise, such as <em>JSS 1 First Term fees</em>. <strong>Code</strong> is optional and is set from the name when left blank.</GuideStep>
          <GuideStep title="Leave Applies to on Customer">Only customer structures raise invoices. The other choices classify a structure without billing anyone.</GuideStep>
          <GuideStep title="Add a line per fee">Select <strong>Add line</strong> for each fee: <strong>Fee item</strong> (what the parent sees), <strong>GL account</strong> (the income account), <strong>Amount</strong> and, where it applies, <strong>Tax</strong>. Tick <strong>Optional</strong> for items such as bus fees that not every pupil takes.</GuideStep>
          <GuideStep title="Check the total and create">The drawer shows the <strong>Subtotal (net)</strong>. Select <strong>Create structure</strong>. Open it again from the list to see the lines, the tax and the <strong>Total per customer</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title={`Next ${w.term}, duplicate rather than retype`}>
          <strong>Duplicate</strong> copies every line into an inactive copy. Change the amounts, then tick Active when it is ready to bill. The copy is not linked to a {w.term}: you link it the first time you generate from it.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="generate-invoices" title={`Generate the ${w.term}'s invoices`}>
        <GuideSteps>
          <GuideStep title="Open the structure and select Generate invoices">Or use <strong>Batch generate</strong> on the Customer Invoices screen, pick the structure and select <strong>Continue</strong>. Both open the same drawer.</GuideStep>
          <GuideStep title={`Check the ${w.term}`}>The drawer says which {w.term} the structure bills, such as <em>Bills First Term, 2026/2027</em>. A structure that is not linked yet cannot bill anyone: choose the <strong>Academic year</strong> and <strong>{w.Term}</strong> and select <strong>Link to this {w.term}</strong>. Leave {w.Term} on <strong>The whole year</strong> for fees charged once a year.</GuideStep>
          <GuideStep title="Choose who to bill">Tick the classes this structure is for, or <strong>Every class</strong>. The classes offered are that year&apos;s. A structure that belongs to one branch offers only that branch&apos;s classes and pupils.</GuideStep>
          <GuideStep title="Select Preview">Nothing is billed yet. The preview shows how many pupils will be billed, the total with tax, the due date, and the list of names. Pupils already billed from this structure are counted separately and left alone.</GuideStep>
          <GuideStep title="Select Bill">The button names the number of pupils. The bills are dated today and fall due on the date the preview showed, from the school&apos;s <strong>Fee due dates</strong> rule. The structure&apos;s activity then reads <em>Used to generate</em> with the count.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Running it twice is safe">
          A pupil is billed once per structure. Run it again after a late admission and only the new pupil is billed. Changing the classes after a preview clears it, so the run always matches the preview you read.
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
          {problems(w).map(({ title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title={`The ${w.term} is billed when`}>
          Every pupil who owes has one invoice for the {w.term}, the totals on Customer Invoices match the approved fee schedule, the due dates are the ones the preview showed, and no one who should not owe has a bill.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
