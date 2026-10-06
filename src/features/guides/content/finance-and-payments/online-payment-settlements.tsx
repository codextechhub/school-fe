import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The Online payments panel is greyed out", body: "You can read it but not change it. Changing who holds payments or a collection account needs the payment settings update permission and someone who covers the whole school." },
  { title: "Straight to each branch's bank cannot be chosen", body: "Every branch's collection account must be set up with the payment provider first. The panel names the branches still missing." },
  { title: "Payouts and Batches are not in the menu", body: "They appear only at a school whose online payments are held, to people who may view payouts. At a school paid straight to each branch's bank, pay and refund from the bank." },
  { title: "Book settlement stays greyed out", body: "The figures do not add up: the line brings more than the payments picked, the provider's fees on them do not match the shortfall, or the line is dated before a payment was received. The dialog says which." },
  { title: "A settlement was booked against the wrong payments", body: "Unmatch the bank line in Bank Reconciliation. That reverses the settlement journal, and the payments wait in gateway clearing again." },
  { title: "A held settlement reads Failed", body: "The transfer to the branch's bank did not go through. Its payments are carried into the next settlement." },
] as const;

/**
 * Who holds the school's online payments, and how they reach each branch's
 * bank.
 *
 * Changing the custody mode or a collection account needs the payment
 * settings update permission and a reader who covers the whole school.
 * Payouts and Batches show only at a school whose payments are held. Booking
 * a settlement needs its own permission, and Held Settlements is read-only for
 * a school.
 */
export default function OnlinePaymentSettlementsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>When a parent pays online, the payment provider holds the money first. The receipt is recorded as soon as the payment is confirmed, and the money waits in <strong>Gateway clearing (online payments not yet in the bank)</strong>, an account in the books, until it reaches a branch&apos;s bank. How it gets there depends on who holds the school&apos;s online payments.</p>
        <GuideChecklist items={[
          "Each branch has a bank account ticked as its collection account.",
          "The bank statement for the period is imported, so the provider's deposits show as bank lines.",
          "You know whether the school's payments are held, or paid straight to each branch's bank.",
        ]} />
      </GuideSection>

      <GuideSection id="who-holds-payments" title="Choose who holds online payments">
        <p>Finance Settings, <strong>Banking and cash</strong>, has an <strong>Online payments</strong> panel. Under <strong>Who holds online payments</strong> there are two choices:</p>
        <GuideSteps>
          <GuideStep title="Held, then paid to each branch">The usual choice. Payments are held for the school and paid into each branch&apos;s bank every few days, set by <strong>Settlement interval (days)</strong>, from 1 to 7. <strong>Payouts</strong> and <strong>Batches</strong> appear in the menu, because online payouts draw on what is held for each branch.</GuideStep>
          <GuideStep title="Straight to each branch's bank">Each branch&apos;s collection account takes its payments directly, and nothing is held. There are no online payouts or online refunds: pay suppliers and refund parents from each branch&apos;s bank.</GuideStep>
        </GuideSteps>
        <p>A change never takes effect at once: it starts on the first day of next month. A move to straight-to-bank also waits until nothing is held for the school, and is refused until every branch&apos;s collection account is set up with the provider. Choosing the mode already in force cancels a change still waiting. <strong>Clearing warning (days)</strong> makes the month-end checklist&apos;s <strong>Gateway clearing current (online payments paid into the bank)</strong> check warn about payments waiting in gateway clearing longer than that. Select <strong>Save online payments</strong>.</p>
        <GuideCallout tone="info" title="Whole school only">
          Who holds payments applies to every branch, so only someone who covers the whole school, with permission to change payment settings, can change it. Anyone else who may read the panel sees it read-only.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="collection-accounts" title="Set up each branch's collection account">
        <p>The panel lists each branch with its collection account and whether it is <strong>Set up with</strong> the provider. A branch with no collection account says so: tick <strong>Collection</strong> on one of that branch&apos;s bank accounts first.</p>
        <GuideSteps>
          <GuideStep title="Select Create subaccount">Beside the branch&apos;s account. Enter the <strong>Bank code at the provider</strong>, such as 058 for GTBank or 057 for Zenith, and optionally a <strong>Business name</strong>.</GuideStep>
          <GuideStep title="Confirm">The account reads as set up. Use <strong>Refresh subaccount</strong> later if the bank details change.</GuideStep>
        </GuideSteps>
        <p>Where the platform holds payments, the panel also shows what is held for each branch now.</p>
      </GuideSection>

      <GuideSection id="book-a-settlement" title="Book a settlement from the bank">
        <p>When the provider pays a day&apos;s payments into a branch&apos;s bank, less its fee, book that bank line as their settlement. Say Bright Star&apos;s Ikeja account shows ₦985,000 from Paystack, carrying ₦1,000,000 of Tuesday&apos;s payments: the fee is ₦15,000.</p>
        <GuideSteps>
          <GuideStep title="Open Settlement">The <strong>To book</strong> tab lists bank lines that match payments waiting in gateway clearing. Select <strong>Book</strong> on one. A bank line with no suggestion can be opened from <strong>Unmatched bank lines</strong> and booked with <strong>Book as settlement</strong>.</GuideStep>
          <GuideStep title="Tick the payments it carries">Under <strong>Payments this line settles</strong>, check the ticked payments and add or remove any. Leave <strong>Posting date (optional)</strong> empty to use the bank line&apos;s date.</GuideStep>
          <GuideStep title="Check the journal and book">The <strong>Settlement journal</strong> shows the bank going up by what arrived, bank charges by the fee, and gateway clearing coming down by the payments. Select <strong>Book settlement</strong>. It posts in the bank account&apos;s branch.</GuideStep>
        </GuideSteps>
        <p>Payments the platform held are never booked here: they reach the books through the platform&apos;s own settlement.</p>
      </GuideSection>

      <GuideSection id="held-settlements" title="Follow what the platform paid each branch">
        <p>Where payments are held, <strong>Held Settlements</strong> lists each payment the platform made to a branch: the day it ran, the payments it covered, the fees, what was sent and into which bank account. Each reads <strong>Being prepared</strong>, <strong>Ready to submit</strong>, <strong>Waiting for approval</strong>, <strong>Approved, sending</strong>, <strong>Paid</strong> or <strong>Failed</strong>.</p>
        <p>It is read-only for the school: the platform puts each settlement forward and two of its own people approve it. Once paid, the school&apos;s books record it by themselves. A bursar who covers one branch sees only that branch&apos;s settlements.</p>
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
        <GuideCallout tone="tip" title="Online money is in order when">
          Every branch&apos;s collection account is set up, nothing waits in gateway clearing longer than the warning allows, every provider deposit is booked as a settlement or paid by the platform, and Held Settlements shows no failed payment left unexplained.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
