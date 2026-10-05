import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The accrued amount is zero", body: "Nothing was posted to the obligation's payable account in that period. Check payroll was posted, and that the obligation points at the right account." },
  { title: "New filing, Mark as filed or Un-file is missing", body: "A return covers every branch, so only someone who covers the whole school sets up, files or un-files one. At a school with one branch, its bursar covers the whole school." },
  { title: "Some lines have no branch yet", body: "At a school with more than one branch, each branch's share is filed. Lines marked No branch yet must be given a branch before the return is filed." },
  { title: "Un-file is missing", body: "Something has already been paid on the return, so it can no longer go back to draft. Reverse the payment first if it was recorded in error." },
  { title: "The payment date is refused", body: "A payment cannot be dated before the return was filed, and must fall in an open period." },
  { title: "The people on a payroll return are not shown", body: "The list shows each person's pay, and your role does not see every pay figure. Ask whoever manages Field Access." },
] as const;

/**
 * Tax returns, each branch's share of them, and the payroll schedules and
 * annual PAYE return.
 *
 * Setting up an obligation, preparing, filing and un-filing a return, and
 * reversing a payment are offered only to a reader who covers the whole
 * school. Paying a share is open to any holder of the pay key. At a school with
 * one branch the shares are not shown, because the totals already say it.
 */
export default function TaxRemittanceArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Tax Remittance tracks what the school owes the tax office and other authorities: PAYE, pension, NHF, NSITF and ITF from payroll, and VAT and withholding tax from fees and suppliers. Each return moves from <strong>Open</strong> to <strong>Filed</strong> to <strong>Paid</strong>.</p>
        <GuideChecklist items={[
          "Payroll for the period is posted.",
          "You know the authority's filing deadline.",
          "You have the filing reference once the return is submitted.",
          "At a school with more than one branch, you know which branch's bank pays each share.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-obligation" title="Set up an obligation">
        <p>Do this once per tax. Select <strong>New obligation</strong>, enter the <strong>Code</strong> and <strong>Name</strong>, choose the <strong>Type</strong> (VAT, WHT, PAYE, Pension or Other levy), the <strong>Liability (payable) account</strong> it builds up in, the <strong>Authority</strong>, the <strong>Frequency</strong> and the <strong>Filing day</strong>. Select <strong>Create obligation</strong>. Only someone who covers the whole school is offered it.</p>
      </GuideSection>

      <GuideSection id="prepare-and-file" title="Prepare and file a return">
        <GuideSteps>
          <GuideStep title="Select New filing">Pick the <strong>Tax obligation</strong>, the <strong>Period start</strong> and <strong>Period end</strong>, and the <strong>Due date</strong>. <strong>Prepare filing</strong> reads the amount owed for the period from the ledger.</GuideStep>
          <GuideStep title="Check what it declares">Open the return. <strong>What it declares</strong> counts the transactions on it. A September bill posted in October is declared on October&apos;s return as a late item from September, so September&apos;s filed figure never moves and October is not short.</GuideStep>
          <GuideStep title="Submit it to the authority">File the return with the tax office or pension administrator as you normally do.</GuideStep>
          <GuideStep title="Select Mark as filed">Enter the <strong>Filed date</strong> and <strong>Filing reference</strong>, and any <strong>Adjustment / penalty</strong> with its account. At a school with more than one branch, choose the <strong>Branch that bears it</strong>, or leave it shared by each branch&apos;s share of the tax.</GuideStep>
        </GuideSteps>
        <p>A return filed in error can be taken back with <strong>Un-file</strong>, as long as nothing has been paid on it. Preparing, filing and un-filing are offered only to someone who covers the whole school.</p>
      </GuideSection>

      <GuideSection id="branch-shares" title="Each branch's share">
        <p>At a school with more than one branch, each branch pays its own share of a return from its own bank. Say Bright Star&apos;s October VAT is ₦120,000: the return lists <strong>Each branch&apos;s share</strong>, Ikeja ₦80,000 and Lekki ₦40,000, with what each has paid and still owes.</p>
        <GuideCallout tone="warning" title="No branch yet blocks filing">
          A share marked <strong>No branch yet</strong> holds lines nobody has given a branch. Give them a branch before you file: a school with several branches files each branch&apos;s share.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="pay" title="Pay what is owed">
        <p>Open the filed return and select <strong>Pay</strong>, which shows the amount outstanding. Where the return has several shares, choose the <strong>Share to pay</strong>. Choose <strong>Pay from (bank account)</strong>, the <strong>Payment date</strong> and the <strong>Amount</strong>. Part payments are allowed; the return reads Paid once every share is cleared.</p>
        <p>A payment recorded in error is undone with <strong>Reverse</strong> under <strong>Payments</strong> on the return, with a reason. The return goes back to Filed with that share unpaid. Only someone who covers the whole school is offered it.</p>
        <GuideCallout tone="warning" title="Record the payment once">
          Each payment here records money leaving the bank. Enter it once, and match it in bank reconciliation.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="payroll-returns" title="Payroll returns and the annual PAYE return">
        <p>Payroll raises a PAYE return for each state, because PAYE is owed to the state each person lives in, and a pension return for each pension administrator, as well as NHF, NSITF and ITF returns. Open one to see <strong>People on this return</strong>: each person, their Tax ID or pension PIN, their state, and what was deducted. Only what payroll deducted here is listed; pay brought forward from earlier in the year is in no monthly return.</p>
        <p><strong>Annual PAYE return</strong> lists each person&apos;s year at this school: months here, gross, taxable pay, PAYE and pension. Choose the <strong>Tax year</strong>. It includes the school&apos;s own months before its payroll ran on these books, and never a previous employer&apos;s pay: that employer files it. A bursar who covers one branch is shown their branch&apos;s part.</p>
        <GuideCallout tone="info" title="Pay figures need full access">
          Both lists print every pay figure, so a role that cannot see all of them is told so instead of being shown the list.
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
        <GuideCallout tone="tip" title="The return is done when">
          It reads Paid, every branch&apos;s share is cleared, the filing reference is recorded, and <strong>Total outstanding</strong> shows nothing overdue. <strong>Filing pack</strong> prints the set for your records.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
