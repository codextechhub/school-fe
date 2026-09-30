import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Lines were held back as duplicates", body: "They look like lines already imported. If they are genuinely new, select Import anyway; if not, leave them out." },
  { title: "Match stays disabled", body: "The bank and book totals you selected must be equal. Match one to one, one bank line to several book lines, or several bank lines to one book line." },
  { title: "A bank charge has no book entry", body: "Select the bank line and use Add adjusting entry. It books the charge and matches the line in one step." },
  { title: "The adjusting entry lands on a later date", body: "The line's period is closed, so the entry books on the first open day after it. The bank's own date stays on the journal." },
  { title: "A school fee receipt will not match", body: "Check the receipt's amount and date against the bank line. A receipt recorded against the wrong bank account never appears here." },
] as const;

export default function ReconcileTheBankArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Reconciling proves the school&apos;s books agree with the bank. Every fee receipt, salary payment and charge on the statement should have a matching entry in the ledger, and the difference should come to zero.</p>
        <GuideChecklist items={[
          "You have the bank statement for the period, as lines or as a CSV or Excel file.",
          "Receipts, payments and payroll for the period are recorded.",
          "You know the statement's opening balance.",
        ]} />
      </GuideSection>

      <GuideSection id="set-up-the-account" title="Set up the bank account">
        <GuideSteps>
          <GuideStep title="Open Bank Accounts and select New bank account">Enter the <strong>Account name</strong> (for example <em>GTBank Fees Account</em>), the <strong>Bank name</strong> and the <strong>Account number</strong>.</GuideStep>
          <GuideStep title="Link it to the ledger">Pick its <strong>GL cash account</strong>. Each bank account has exactly one, and that account&apos;s balance is the book balance you reconcile against.</GuideStep>
          <GuideStep title="Choose what it is for">Tick <strong>Primary operating account</strong> for the main account, and <strong>Print on invoices/receipts</strong> for the account parents pay into. Select <strong>Create account</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="import-the-statement" title="Import the statement">
        <p>Open the bank account and use <strong>Import statement</strong>.</p>
        <GuideSteps>
          <GuideStep title="Manual import">For a short statement: enter the <strong>Period label</strong> and <strong>Opening balance (₦)</strong>, then one line per entry. Amounts are from the school&apos;s side: positive for money in, negative for money out.</GuideStep>
          <GuideStep title="Bulk import">For a full export: view the <strong>Excel template</strong> or <strong>CSV template</strong>, then use Download in the viewer. Copy the bank&apos;s lines into it, then fill in the statement date, opening and closing balances and the file. <strong>Continue to import wizard</strong> checks the file before anything is published.</GuideStep>
        </GuideSteps>
        <p>A wrong line that is not yet matched can be deleted from the <strong>Statement lines</strong> tab, and a manually imported statement can be corrected from the <strong>Statements</strong> tab.</p>
      </GuideSection>

      <GuideSection id="match-lines" title="Match the lines">
        <GuideSteps>
          <GuideStep title="Open Bank Reconciliation">Pick the account. The cards show the <strong>Statement balance</strong>, <strong>Book balance</strong>, <strong>Difference</strong> and <strong>Match progress</strong>.</GuideStep>
          <GuideStep title="Let it match the obvious ones">Select <strong>Auto-match</strong>. Lines with the same amount and a close date are paired for you.</GuideStep>
          <GuideStep title="Match the rest by hand">Select a line under <strong>Bank statement (unmatched)</strong>: book entries with the same amount are tagged <em>same amount</em>. Select the matching book line or lines, then <strong>Match selected</strong>. The button changes to <strong>Match group</strong> or <strong>Split match</strong> when one line matches several.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="resolve-the-rest" title="Deal with what is left">
        <GuideSteps>
          <GuideStep title="Charges and interest the books do not have">Select the bank line and use <strong>Add adjusting entry</strong>. Choose the <strong>Counter account</strong> (bank charges by default), check the date and narration, then <strong>Post &amp; match</strong>.</GuideStep>
          <GuideStep title="Lines that should carry no entry">A duplicate on the statement or an opening-balance line can be set aside with <strong>Ignore line</strong>. <strong>Restore</strong> brings it back.</GuideStep>
          <GuideStep title="A match made in error">Open it under <strong>Matched lines</strong> and select <strong>Unmatch</strong>. Unmatching an adjusting entry also reverses its journal.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="complete" title="Complete the reconciliation">
        <p>When the <strong>Difference</strong> is zero, select <strong>Complete reconciliation</strong> to record the run, and <strong>Reconciliation report</strong> to print it for the file. Each run is listed on the bank account&apos;s <strong>Reconciliations</strong> tab.</p>
        <GuideCallout tone="warning" title="Check the difference yourself">
          Complete reconciliation does not stop you when a difference remains. Look at the Difference card first, and explain any amount left over before you record the run.
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
        <GuideCallout tone="tip" title="The bank is reconciled when">
          Every statement line is matched or deliberately ignored, the Difference reads zero, the run is recorded, and the report is filed with the statement.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
