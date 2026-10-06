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
  { title: "Edit fund will not lower the float", body: "The tin holds more than the new float. Use Reduce float, which banks the cash above it. Switching off a fund that still holds cash is the same: use Close fund." },
  { title: "This fund cannot close yet", body: "A voucher is not yet posted, or another return of the fund is waiting for approval. Post or cancel the voucher, or settle the return, then count the tin again." },
  { title: "Void is greyed out on a return", body: "A later return of the same fund still stands, the float has changed since, or the fund was reopened. The box says which. A return whose deposit is matched on a bank reconciliation is refused too: unmatch it first." },
  { title: "Cancel return is missing on a draft return", body: "Its approval request is still open, perhaps because an approver sent it back. Withdraw the request under Workflow, My Submissions instead: that cancels the return." },
  { title: "A return is waiting and nobody can approve it", body: "The school adopted the approval route but its approver group is empty. Someone who manages approver groups must add people to it." },
] as const;

/**
 * Petty cash, from setting up a float to banking its cash and closing it.
 *
 * Reduce float, Close fund, Reopen and Void each need their own permission, so
 * a reader may see some of these buttons and not others. The approval card at
 * the foot of the screen shows only to readers who may view approval routes.
 */
export default function PettyCashArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A petty cash <strong>float</strong> is a tin of cash kept for small spending, such as the front desk&apos;s float for postage and cleaning supplies. It has a ceiling. Each spend is a <strong>voucher</strong>, and <strong>Replenish</strong> tops the tin back up to its ceiling from the bank. When the tin holds more than it needs, or is no longer needed at all, its cash goes back to the bank with <strong>Reduce float</strong> or <strong>Close fund</strong>.</p>
        <GuideChecklist items={[
          "Your chart of accounts has a petty cash account for the tin.",
          "You know who holds the tin and its ceiling.",
          "You have a slip for every spend.",
          "At a school with more than one branch, you know which branch the float belongs to.",
        ]} />
      </GuideSection>

      <GuideSection id="establish-the-float" title="Set up the float">
        <GuideSteps>
          <GuideStep title="Open Petty Cash and select Establish float">Enter the <strong>Float name</strong>, the <strong>Petty-cash GL account</strong> and the <strong>Custodian</strong> who holds the tin. Where you are asked for a branch, choose it: the float is that branch&apos;s, and it is topped up from that branch&apos;s bank accounts.</GuideStep>
          <GuideStep title="Set the ceiling and opening cash">Under <strong>Opening cash</strong>, enter the <strong>Float ceiling</strong>. The opening cash follows it unless you change it. Choose the bank it comes <strong>From</strong> and the date.</GuideStep>
          <GuideStep title="Select Establish">The button shows the opening amount. The float is created and the cash moves from the bank into it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="record-a-voucher" title="Record a spend">
        <GuideSteps>
          <GuideStep title="Select New voucher">Choose the <strong>Expense account</strong>, the <strong>Date</strong> and the <strong>Amount</strong>, and say what it was for in <strong>Note</strong>.</GuideStep>
          <GuideStep title="Save and post">Select <strong>Save &amp; post</strong> to book it straight away, or <strong>Save draft</strong> for someone else to post. A draft is posted from the <strong>Vouchers</strong> tab with <strong>Post voucher</strong>, or dropped with <strong>Cancel voucher</strong>, which writes nothing to the books.</GuideStep>
        </GuideSteps>
        <p>A posted voucher lowers the tin&apos;s <strong>Current balance</strong>. A voucher posted in error can be reversed with <strong>Void</strong>, which returns the cash to the tin.</p>
      </GuideSection>

      <GuideSection id="watch-the-balance" title="Watch the balance">
        <p>The cards show the <strong>Float ceiling</strong>, the <strong>Current balance</strong>, <strong>Spent (this week)</strong> and the amount <strong>To replenish</strong>. The <strong>Movement register</strong> lists every movement in and out, with a running balance; cash sent back is marked <strong>Returned to bank</strong>, and a count that did not agree with the books is marked <strong>Count short</strong> or <strong>Count over</strong>. Count the tin against the Current balance regularly.</p>
      </GuideSection>

      <GuideSection id="replenish" title="Top up the float">
        <p>Select <strong>Replenish</strong>. The amount starts at the shortfall, which brings the tin back to its ceiling. Choose the bank account and date, then select <strong>Move</strong>, which shows the amount.</p>
        <GuideCallout tone="info" title="Low-balance alert">
          Finance Settings, Banking and cash, sets the share of the ceiling at which a float is flagged for a top-up.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="reduce-the-float" title="Bank the cash above a lower float">
        <p>Use <strong>Reduce float</strong> when the tin needs less than it holds. Say the Ikeja front-desk float drops from ₦100,000 to ₦60,000: the custodian counts the tin, the cash above ₦60,000 goes back to the bank, and the tin keeps ₦60,000.</p>
        <GuideSteps>
          <GuideStep title="Count the tin first">Select <strong>Reduce float</strong> and enter the <strong>Cash counted</strong> and the <strong>New float</strong>. The new float must be lower than the current one and above nothing; to empty the tin, close the fund instead.</GuideStep>
          <GuideStep title="Choose where the cash goes">Pick the bank account under <strong>Into bank account</strong>. Only the fund&apos;s own branch&apos;s accounts are offered. Set the <strong>Date</strong> and put the deposit slip number in <strong>Reference</strong>.</GuideStep>
          <GuideStep title="Explain a count that differs">If the count is not what the books say, the drawer shows how much is short or over, and you must say why under <strong>Why the count differs</strong>. The difference goes to Cash over and short.</GuideStep>
          <GuideStep title="Check and bank it">The summary shows what the books say, what was counted, what goes to the bank, what the tin keeps, and the float before and after. Select the button, which reads <strong>Bank</strong> with the amount.</GuideStep>
        </GuideSteps>
        <p>The deposit is an ordinary line on the bank account, so it is matched in bank reconciliation like any other.</p>
      </GuideSection>

      <GuideSection id="close-the-fund" title="Close a fund">
        <p>Use <strong>Close fund</strong> when a float is no longer needed, for example when a department stops keeping cash. Everything counted goes back to the bank, and the fund then takes no vouchers, top-ups or float changes until it is reopened.</p>
        <GuideSteps>
          <GuideStep title="Clear what is still open">A fund cannot close while a voucher is not yet posted, or while another return of the fund is waiting for approval. The drawer lists them under <strong>This fund cannot close yet</strong>.</GuideStep>
          <GuideStep title="Count and choose the bank">Enter the <strong>Cash counted</strong> and the <strong>Date</strong>, choose <strong>Into bank account</strong> from the fund&apos;s own branch, and give a reason if the count differs from the books.</GuideStep>
          <GuideStep title="Select Close fund">The fund reads <strong>Closed</strong>, with the day it closed and who closed it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="reopen-a-fund" title="Reopen a closed fund">
        <p>Select <strong>Reopen</strong> on a closed fund. Say why under <strong>Why reopen it</strong>, which is kept on the audit record, and check the <strong>Float from now</strong>, which starts at the float it had before it closed. Select <strong>Reopen fund</strong>. It comes back empty, because its cash was banked: use <strong>Replenish</strong> to put cash back in the tin.</p>
      </GuideSection>

      <GuideSection id="returns-and-void" title="Returns, and voiding one">
        <p>Each reduction and closure is a <strong>return</strong>, listed on the <strong>Returns</strong> tab with what was banked and any difference. Open one for the full count: what the books said, what was counted, the reason for any difference, the bank account, the float before and after, and who counted it and who raised it.</p>
        <p>A return raised in error is reversed with <strong>Void</strong>, then <strong>Void return</strong>. The cash comes back on the fund&apos;s books and its float is restored; voiding a closure also reopens the fund. A draft return never reached the books, so it is dropped with <strong>Cancel return</strong> instead, which writes nothing. Cancel return is not offered while the return&apos;s approval request is open, including after an approver sends it back: to drop one, withdraw the request under Workflow, My Submissions, which cancels the return.</p>
        <GuideCallout tone="warning" title="When a void is refused">
          A void is refused while its deposit is matched on a bank reconciliation (unmatch it first), while a later return of the same fund still stands (void that one first), or once the fund&apos;s float has changed or a closed fund has been reopened.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="approval" title="When a return needs a second person">
        <p>Out of the box, a return posts the moment it is raised. A school that wants a second person to check returns adopts the ready-made route on the <strong>Approval for petty cash returns</strong> card at the foot of the Petty Cash screen. Until it does, the card reads <strong>Not adopted</strong>.</p>
        <GuideSteps>
          <GuideStep title="Choose the shortage that needs a second person">The route stops a count more than this figure short, and every closure. ₦5,000 is suggested; enter the school&apos;s own figure under <strong>Shortage that needs a second person</strong>. Anything else still posts at once.</GuideStep>
          <GuideStep title="Select Adopt route">Only someone who may publish approval routes and covers the whole school is offered it, because the route applies to every branch. At a school with one branch, that branch&apos;s bursar covers the whole school.</GuideStep>
          <GuideStep title="Fill the approver group">Adopting creates the approver group <strong>Finance Petty Cash Approver</strong> with nobody in it. Open <strong>Approver groups</strong> and add the people who approve returns. Until you do, a return the route stops waits with nobody able to approve it.</GuideStep>
        </GuideSteps>
        <p>Once adopted, the card shows the figure the route holds and how many people can approve. A return waiting for them says so when you open it on the Returns tab, and reaches the books once approved.</p>
        <p>If the approver sends a return back, its status reads <strong>Sent back</strong>, on its row on the Returns tab and when you open it. The status filter beside the fund filter offers <strong>All statuses</strong> or <strong>Sent back</strong>, to list only those. The person who sent it for approval sees <strong>Sent back to you</strong>, with the approver&apos;s reason, and <strong>Resume</strong>, which sends it back to the approver as it is. A return has no Edit: to change one, withdraw it under Workflow, My Submissions, which cancels it, and raise a new one. Nobody else gets Resume.</p>
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
          Every spend has a posted voucher, the cash in the tin equals the Current balance, the float is topped up before it runs low, and every return&apos;s deposit is matched in bank reconciliation.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
