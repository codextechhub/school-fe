import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";
import { useGuideWords } from "../../guide-words";

const PROBLEMS = [
  { title: "Release due income is missing", body: "A release covers every branch at once, so only someone who covers the whole school, and may release deferred income, runs or undoes it." },
  { title: "The month will not close", body: "Its share of fees billed ahead has not been released. Release due income up to the month's last day, then run the close again." },
  { title: "Undo a month's release does not offer a month", body: "Only open months can be undone. The form says why a month is held: a branch has closed it, and a closed month keeps its releases." },
  { title: "New provision run is missing", body: "A provision run covers every branch, so only someone who covers the whole school raises one. A branch bursar sees the runs and their own branch's line." },
  { title: "The provision posted a different figure", body: "The figures are worked out again when the run posts, so receipts and write-offs made while it waited for approval are counted." },
  { title: "Forfeit unclaimed is missing", body: "Only someone who covers the whole school, and may forfeit deposits, is offered it." },
  { title: "The receivables settings are greyed out", body: "They apply to every branch, so only someone who covers the whole school can change them. At a school with one branch, its bursar covers the whole school." },
] as const;

/**
 * Deferred income, deposits and doubtful debts, and the receivables settings
 * that steer them.
 *
 * Releasing deferred income, forfeiting deposits and raising a provision run
 * each act for every branch at once, so the screens offer them only to a
 * reader who covers the whole school. The same holds for changing the
 * receivables settings, which a branch-bound reader sees read-only.
 */
export default function DeferredIncomeDepositsAndDoubtfulDebtsArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Three screens under Receivables keep the school&apos;s fee figures honest. <strong>Deferred Income</strong> holds fees billed before the {w.term} they pay for, until they are earned. <strong>Deposits</strong> holds refundable deposits, such as a caution deposit, that are never the school&apos;s income. <strong>Doubtful Debts</strong> sets money aside for fees that may never be paid.</p>
        <GuideChecklist items={[
          `Fee structures are linked to the right ${w.term}, so their dates are known.`,
          "Any refundable deposit line is marked as one on its fee structure.",
          "The receivables settings under Finance Settings have been agreed with your accountant.",
        ]} />
      </GuideSection>

      <GuideSection id="deferred-income" title="Fees billed ahead">
        <p>Say Tunde&apos;s ₦400,000 First {w.Term} bill is raised in August. It is not income yet: it sits in Deferred income, and each month of the {w.term} moves its share to revenue. The screen shows what is <strong>Waiting to be released</strong>, what has been <strong>Released to income</strong>, and what falls due under <strong>Due by month</strong>.</p>
        <GuideSteps>
          <GuideStep title="Select Release due income">Choose <strong>Release up to</strong>, a day that has passed, and select <strong>Release</strong>. Every month&apos;s share due by that day moves to revenue, one journal per branch. Running it again never releases anything twice.</GuideStep>
          <GuideStep title="Undo a release, if needed">Select <strong>Undo a month&apos;s release</strong>, pick an open month, and select <strong>Undo release</strong>. Its shares go back to Deferred income to be released again.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Release before you close the month">
          A month cannot close while its share is unreleased. The close checklist says so. Releasing and undoing act for every branch at once, so only someone who covers the whole school runs them.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="deposits" title="Refundable deposits">
        <p>A fee line marked <strong>Refundable deposit</strong>, on a fee structure or an invoice, is billed like any other but held for the pupil in Deposits held. It is never income. The <strong>Deposits</strong> screen lists each one as <strong>Held</strong>, <strong>Returned</strong>, <strong>Forfeited</strong> or <strong>Cancelled</strong>, with the day the pupil left.</p>
        <GuideSteps>
          <GuideStep title="When a pupil leaves">Their deposit becomes credit to refund. It is set against their unpaid bills first only if the school has switched that on in the receivables settings. Pay the credit back through Refunds.</GuideStep>
          <GuideStep title="Return a pupil's deposits by hand">Open a deposit and select <strong>Return deposits</strong>. Where the school allows it, choose under <strong>What happens to it</strong> between <strong>Credit to refund</strong> and <strong>Set against unpaid bills first</strong>. One credit note is raised per branch. The part of a deposit its own bill never collected is cancelled.</GuideStep>
          <GuideStep title="Forfeit deposits nobody claimed">Deposits still unclaimed a set number of years after the pupil left (six by default) can be moved to income. Select <strong>Forfeit unclaimed</strong>, choose the <strong>As of</strong> date, and select <strong>Forfeit</strong>. It runs for every branch, so only someone who covers the whole school is offered it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="doubtful-debts" title="Doubtful debts">
        <p>A provision run works out how much each branch should set aside for debts that may not be paid, from how old each overdue balance is. By default it provides 25% of what is over 180 days overdue, 50% over 365 days and 100% over 730 days.</p>
        <GuideSteps>
          <GuideStep title="Select New provision run">Choose <strong>Age debts to</strong>, add a narration, and select <strong>Prepare run</strong>. Nothing posts yet.</GuideStep>
          <GuideStep title="Check the figures">Open the run. It shows the <strong>Allowance required</strong>, the <strong>Change to the allowance</strong>, each branch&apos;s figures and the debts by age.</GuideStep>
          <GuideStep title="Submit for approval">Select <strong>Submit for approval</strong>. A second person approves it under Workflow, Approvals, and it posts as one journal per branch. Where the school&apos;s approval rules do not ask for a second person, the button reads <strong>Post provision</strong> instead.</GuideStep>
        </GuideSteps>
        <p>The figures are worked out again when the run posts, so receipts and write-offs made while it waited are counted. A run covers every branch, so only someone who covers the whole school raises, submits or posts one; a branch bursar sees the runs and their own branch&apos;s line.</p>
        <p>If the approver sends a run back, the person who sent it for approval sees <strong>Sent back to you</strong> and <strong>Resume</strong>, which sends it back to the approver as it is. A run has no Edit: to change one, withdraw it under Workflow, My Submissions and submit it again.</p>
      </GuideSection>

      <GuideSection id="receivables-settings" title="Receivables settings">
        <p>Finance Settings, <strong>Receivables</strong>, holds the choices behind these screens and behind payer payments. They apply to every branch, so only someone who covers the whole school can change them; anyone else who may open settings reads them.</p>
        <GuideSteps>
          <GuideStep title="Credit and concessions"><strong>Apply customer credit to new bills automatically</strong> lets a pupil&apos;s unused credit settle each new bill as it posts. <strong>Concessions above this need a second person</strong> sets the amount, counted per bill, above which a concession waits for approval. Select <strong>Save credit and concessions</strong>.</GuideStep>
          <GuideStep title="Fees billed ahead"><strong>Release method</strong>: spread monthly releases an equal share each month of the {w.term}; at period start releases the whole fee in the {w.term}&apos;s first month.</GuideStep>
          <GuideStep title="Doubtful debts">The age bands, each <strong>Over (days)</strong> with a <strong>Provide (%)</strong>. Up to ten bands; an older band cannot provide less than a younger one.</GuideStep>
          <GuideStep title="Deposits"><strong>Set a leaver&apos;s deposit against their unpaid bills</strong>, off by default, and <strong>Forfeit unclaimed deposits after (years)</strong>, counted from the day the pupil left.</GuideStep>
          <GuideStep title="Payments from a payer"><strong>Split the payment</strong> sets how a payer&apos;s payment is shared among the children they pay for, and <strong>What no bill takes becomes credit of</strong> says who keeps what is left over. The bursar can always type amounts by hand.</GuideStep>
        </GuideSteps>
        <p>The last four are saved together with <strong>Save receivables policy</strong>. Each change is listed under the section&apos;s recent changes and in the finance audit trail.</p>
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
        <GuideCallout tone="tip" title="The month's receivables are in order when">
          Income due for the month is released, every leaver&apos;s deposit is returned or waiting as credit to refund, and the doubtful-debt allowance is run whenever your accountant asks for it.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
