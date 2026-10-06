import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Between Branches is not in the menu", body: "It appears only at a school with more than one branch, and only to someone who may view inter-branch transfers." },
  { title: "Void is missing on a transfer", body: "A void changes both branches' books, so only someone who works in both may do it. A shared bank split, a recharge share and income given back are never voided from the register; the transfer says what to do instead." },
  { title: "A send came back from the approver", body: "It reads Sent back in the register. The stage filter lists it under Sent back, and not under Requested or any other stage. Whoever sent it for approval sees Sent back to you and Resume, which sends it back to the approver as it is. A send has no Edit: to change one, withdraw it under Workflow, My Submissions. Money sent without being asked is then cancelled, so send it again; money another branch asked for goes back to waiting to be sent." },
  { title: "Send and Decline are missing on a request", body: "Someone at your branch has already sent it, and the send is with its approvers or was sent back. To decline the request instead, they withdraw the approval request under Workflow, My Submissions first. The request goes back to waiting, with Send and Decline." },
  { title: "The month will not close", body: "The close checklist shows when two branches disagree about what they owe each other. Open Inter-branch Balances: a pair marked Disagree has a transfer booked on one side only." },
] as const;

export default function BranchesWorkingTogetherArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Every branch keeps its own books. When money, a cost or a pupil's account passes from one branch to another, each branch books its own side, and the branches then <strong>owe each other</strong> until it is repaid.</p>
        <GuideChecklist items={[
          "Your school runs more than one branch.",
          "Each branch has its own bank account, or a collection account money can land in.",
          "You know which branches you work in. Some actions need someone who works in both branches.",
        ]} />
      </GuideSection>

      <GuideSection id="send-or-ask" title="Send money, or ask for it">
        <GuideSteps>
          <GuideStep title="Open Inter-branch Transfers">Select <strong>Send money</strong> to send from your branch, or <strong>Ask for money</strong> to ask another branch.</GuideStep>
          <GuideStep title="Fill in the transfer">Choose the account it is paid from, the other branch, the amount and what it is for. A send follows your branch's approval route.</GuideStep>
          <GuideStep title="The other branch answers">The branch asked can <strong>Send</strong> or <strong>Decline</strong>. Once its send is with the approvers, including after they send it back, neither is offered. The branch that receives the money selects <strong>Confirm it arrived</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="who-owes-whom" title="See who owes whom">
        <p>Open <strong>Inter-branch Balances</strong>. Each pair of branches shows once, with what one owes the other and whether both branches' books agree. Select <strong>Transfers</strong> on a pair to see what is behind it.</p>
      </GuideSection>

      <GuideSection id="held-receipts" title="Money collected for another branch">
        <p>When a parent pays at one branch for another branch's bill, open <strong>Held Receipts</strong> and select <strong>Record money for another branch</strong>. Then <strong>Forward</strong> it. Once sent, it settles the bill at the other branch. If the approver sends the forward back, the receipt reads <strong>Sent back</strong>, and the status filter lists it under <strong>Sent back</strong>, not under <strong>Forwarding</strong>. Whoever sent it resumes it, or withdraws it, under Workflow, My Submissions.</p>
      </GuideSection>

      <GuideSection id="shared-costs" title="Share a cost">
        <p>Open <strong>Recharges</strong> and select <strong>Recharge a shared cost</strong>. Split it by counts, such as pupils per branch, or by fixed percentages. <strong>Shared Cost Rules</strong> keep the school's standing choice for each kind of cost, and only someone who covers the whole school can change them.</p>
      </GuideSection>

      <GuideSection id="move-a-balance" title="Move a pupil's account to another branch">
        <p>From the register, or from the customer's account, select <strong>Move a customer's balance</strong>. Open bills, unspent credit and fees not yet earned go to the new branch. The screen shows what moved and what one branch now owes the other.</p>
        <GuideCallout tone="info" title="Undoing a move">
          Open the move in the register and select <strong>Void</strong>. It is refused once anything moved has been paid, credited or released at the new branch.
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
        <GuideCallout tone="tip" title="Branches are square when">
          Every transfer sent has been confirmed, held money has been forwarded, and every pair on Inter-branch Balances agrees.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
