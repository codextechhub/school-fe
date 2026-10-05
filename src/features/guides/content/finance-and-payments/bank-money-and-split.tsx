import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The bank account has not been given a branch", body: "At a school with more than one branch, money cannot move through an account no branch owns. Give the account its branch, or split it by branch if several branches really share it." },
  { title: "The account I want is not offered under To", body: "A bank transfer only moves money between two accounts of the same branch. To send money to another branch, use Send money on Inter-branch Transfers." },
  { title: "The other side account is refused", body: "Receivables, payables, tax and other accounts kept by their own documents cannot be used here. The message names the document to use instead, such as a receipt or a supplier bill." },
  { title: "Void is refused", body: "The bank line is matched on a reconciliation. Unmatch it in Bank Reconciliation first, then void." },
  { title: "Split by branch is missing", body: "It appears only at a school with more than one branch, on an active account no branch owns, for someone who covers the whole school and may update bank accounts." },
  { title: "The split is refused", body: "Common reasons: the shares do not add up to the book balance, statement lines on the account are still unmatched, something is booked on it after the split date, or one of the branches has closed its books for that month." },
] as const;

/**
 * Bank documents and the shared-account split, both on the Bank Accounts
 * screen.
 *
 * Bank transactions and transfers each have their own view and create
 * permissions, so a reader of Bank Accounts may see one tab, both or neither.
 * The split is offered only at a school with more than one branch, to a
 * reader who covers the whole school and may update bank accounts.
 */
export default function BankMoneyAndSplitArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Most money reaches the bank through its own document: a fee receipt, a supplier payment, a payroll run. Some money has no customer or supplier behind it, such as the owner putting in capital, a loan arriving, interest, or a bank charge. That money is recorded as a <strong>bank transaction</strong>. Money moved from one of a branch&apos;s accounts to another is a <strong>bank transfer</strong>.</p>
        <p>Both are under <strong>Bank Accounts</strong>, below the list of accounts, on the <strong>Bank transactions</strong> and <strong>Transfers between accounts</strong> tabs. Your role may show you one tab, both or neither.</p>
        <GuideChecklist items={[
          "You know which bank account the money went into or came out of.",
          "You know the account for the other side, such as capital, loan, drawings, interest or bank charges.",
          "At a school with more than one branch, the bank account has been given its branch.",
          "You have the bank's reference, if there is one.",
        ]} />
      </GuideSection>

      <GuideSection id="bank-transactions" title="Record money in or out">
        <p>Say Bright Star School&apos;s owner pays ₦5,000,000 of new capital into the Ikeja current account.</p>
        <GuideSteps>
          <GuideStep title="Select Bank transaction">Choose <strong>Money in</strong> or <strong>Money out</strong> under <strong>Which way</strong>, then the <strong>Bank account</strong>.</GuideStep>
          <GuideStep title="Enter the amount and date">Fill in the <strong>Amount</strong> and the <strong>Date</strong>. The date must fall in an open month.</GuideStep>
          <GuideStep title="Choose the other side">For money in, pick <strong>Where it came from</strong>, such as the capital account. For money out, pick <strong>What it paid for</strong>, such as bank charges.</GuideStep>
          <GuideStep title="Describe it and record">Write a <strong>Narration</strong> a reader will understand later, such as <em>Owner&apos;s capital injection</em>, add the bank&apos;s <strong>Reference</strong>, and select <strong>Record</strong>.</GuideStep>
        </GuideSteps>
        <p>The transaction belongs to the bank account&apos;s branch and posts in that branch&apos;s books.</p>
      </GuideSection>

      <GuideSection id="bank-transfers" title="Move money between two accounts">
        <p>Say Ikeja moves ₦2,000,000 of fees collected from its current account to its savings account.</p>
        <GuideSteps>
          <GuideStep title="Select Bank transfer">Choose the account it leaves under <strong>From</strong>, then the account it goes to under <strong>To</strong>. Only accounts of the same branch are offered.</GuideStep>
          <GuideStep title="Fill in the rest">Enter the <strong>Amount</strong>, <strong>Date</strong>, <strong>Narration</strong> and <strong>Reference</strong>, then select <strong>Record transfer</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Money between branches is not a bank transfer">
          Sending money from Ikeja&apos;s account to Lekki&apos;s is an inter-branch transfer, because the two branches then owe each other. Use <strong>Send money</strong> on Inter-branch Transfers instead.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="approval-and-void" title="Approval, and voiding a mistake">
        <p>Bank transactions and transfers follow their own approval route. While one waits, opening it says it is waiting for approval under Workflow, Approvals, and it reaches the books once approved. One the approver turned down reads <strong>Rejected</strong> and never reached the books. Open it to put it right: <strong>Edit</strong> corrects it, <strong>Send again</strong> sends it back through the same approval route, and <strong>Cancel</strong> keeps it as cancelled and never posts it. These need the right to record that kind of document, and its branch must be one you work in.</p>
        <p>A posted one recorded in error is reversed with <strong>Void</strong> on its detail panel. A transfer&apos;s void reverses both sides.</p>
        <GuideCallout tone="warning" title="Unmatch before you void">
          A void is refused once its bank line is matched on a reconciliation, and a transfer&apos;s void is refused while either side is matched. Unmatch the line in Bank Reconciliation first.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="split-a-shared-account" title="Split a shared account by branch">
        <p>At a school with more than one branch, an account no branch owns cannot move money. If several branches really used one account, split it: the shared account is retired, and each branch gets its own bank account and ledger account, opening with the share the branches agreed. The old account stays as read-only history, with its statements.</p>
        <p>Say Bright Star&apos;s GTBank account was used by Ikeja and Lekki and holds ₦8,000,000 in the books. The two bursars agree Ikeja takes ₦5,000,000 and Lekki ₦3,000,000.</p>
        <GuideSteps>
          <GuideStep title="Open the account and select Split by branch">Only someone who covers the whole school and may update bank accounts is offered it. Reconcile the account first: unmatched statement lines stop the split.</GuideStep>
          <GuideStep title="Enter each branch's share">Tick each branch taking a share. Enter its <strong>Agreed share</strong>, and tick <strong>This share is an overdraft</strong> if that branch takes on money owed to the bank. The cards show the <strong>Book balance to share</strong>, <strong>Agreed so far</strong> and <strong>Left to place</strong>: the shares must add up exactly to the book balance.</GuideStep>
          <GuideStep title="Name the new accounts">Check each <strong>New bank account name</strong>, and give a four-digit <strong>New ledger code</strong> starting with the same digit as the shared account&apos;s, and a <strong>New ledger name</strong>. Mark one <strong>Main account</strong> if needed, and tick <strong>Collection account</strong> on the account parents pay into for that branch.</GuideStep>
          <GuideStep title="Choose what happens to the differences">See the next section.</GuideStep>
          <GuideStep title="Date it and split">Set the <strong>Split date</strong>: nothing may be booked on the shared account after that day. Enter the <strong>Agreement reference</strong>, such as the bursars&apos; minute number. Select <strong>Split account</strong> and confirm.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="A split cannot be undone">
          Agree the shares in writing before you split. Afterwards the new branch accounts are listed, and the shared account is closed for good.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="split-differences" title="What happens to each branch's difference">
        <p>A branch&apos;s own receipts and payments on the shared account rarely come to exactly its agreed share. In the example, Ikeja&apos;s own entries come to ₦5,600,000 but it takes ₦5,000,000, and Lekki&apos;s come to ₦2,400,000 but it takes ₦3,000,000. Under <strong>Where a branch&apos;s entries differ from its share</strong>, choose one:</p>
        <GuideSteps>
          <GuideStep title="Debt between branches (usual)">The difference becomes money one branch owes the other: Lekki owes Ikeja ₦600,000. It is booked as an inter-branch transfer, shows on Inter-branch Balances, and is repaid with a cash transfer. These transfers are never voided.</GuideStep>
          <GuideStep title="Permanent move through retained earnings">Each branch simply starts with its agreed share, and nothing is owed. The ₦600,000 becomes a lasting shift between the two branches&apos; equity.</GuideStep>
        </GuideSteps>
        <p>The drawer cannot show each branch&apos;s own entries in advance: the differences are worked out when you split, and listed afterwards under <strong>Now owed between branches</strong>, each linked to its transfer.</p>
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
        <GuideCallout tone="tip" title="It is right when">
          Every capital, loan, interest and charge line on the statement has a posted bank transaction, every move between a branch&apos;s accounts is a transfer, each is matched in Bank Reconciliation, and every bank account names its branch.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
