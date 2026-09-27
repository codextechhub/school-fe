import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Establish float made a second tin", body: "Establish float always creates a fresh float. To top up an existing one, use Replenish." },
  { title: "Current balance is below what the tin holds", body: "A voucher is still a draft, or spending was never recorded. Check the Vouchers tab for drafts and count the tin again." },
  { title: "Post voucher is missing", body: "Posting vouchers needs its own permission. Ask whoever manages roles, or leave the voucher as a draft for someone who has it." },
] as const;

export default function PettyCashArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A petty cash <strong>float</strong> is a tin of cash kept for small spending, such as the front desk&apos;s float for postage and cleaning supplies. It has a ceiling. Each spend is a <strong>voucher</strong>, and <strong>Replenish</strong> tops the tin back up to its ceiling from the bank.</p>
        <GuideChecklist items={[
          "Your chart of accounts has a petty cash account for the tin.",
          "You know who holds the tin and its ceiling.",
          "You have a slip for every spend.",
        ]} />
      </GuideSection>

      <GuideSection id="establish-the-float" title="Set up the float">
        <GuideSteps>
          <GuideStep title="Open Petty Cash and select Establish float">Enter the <strong>Float name</strong>, the <strong>Petty-cash GL account</strong> and the <strong>Custodian</strong> who holds the tin.</GuideStep>
          <GuideStep title="Set the ceiling and opening cash">Under <strong>Opening cash</strong>, enter the <strong>Float ceiling</strong>. The opening cash follows it unless you change it. Choose the bank it comes <strong>From</strong> and the date.</GuideStep>
          <GuideStep title="Select Establish">The button shows the opening amount. The float is created and the cash moves from the bank into it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="record-a-voucher" title="Record a spend">
        <GuideSteps>
          <GuideStep title="Select New voucher">Choose the <strong>Expense account</strong>, the <strong>Date</strong> and the <strong>Amount</strong>, and say what it was for in <strong>Note</strong>.</GuideStep>
          <GuideStep title="Save and post">Select <strong>Save &amp; post</strong> to book it straight away, or <strong>Save draft</strong> for someone else to post. A draft is posted from the <strong>Vouchers</strong> tab with <strong>Post voucher</strong>.</GuideStep>
        </GuideSteps>
        <p>A posted voucher lowers the tin&apos;s <strong>Current balance</strong>. A voucher posted in error can be reversed with <strong>Void</strong>, which returns the cash to the tin.</p>
      </GuideSection>

      <GuideSection id="watch-the-balance" title="Watch the balance">
        <p>The cards show the <strong>Float ceiling</strong>, the <strong>Current balance</strong>, <strong>Spent (this week)</strong> and the amount <strong>To replenish</strong>. The <strong>Movement register</strong> lists every movement in and out, with a running balance. Count the tin against the Current balance regularly.</p>
      </GuideSection>

      <GuideSection id="replenish" title="Top up the float">
        <p>Select <strong>Replenish</strong>. The amount starts at the shortfall, which brings the tin back to its ceiling. Choose the bank account and date, then select <strong>Move</strong>, which shows the amount.</p>
        <GuideCallout tone="info" title="Low-balance alert">
          Finance Settings, Banking and cash, sets the share of the ceiling at which a float is flagged for a top-up.
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
        <GuideCallout tone="tip" title="Petty cash is in order when">
          Every spend has a posted voucher, the cash in the tin equals the Current balance, and the float is topped up before it runs low.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
