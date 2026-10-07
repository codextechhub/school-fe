import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The trial balance reads Out of balance", body: "Stop and investigate before producing other statements. It should never happen; tell your accountant and your XVS support contact." },
  { title: "The balance sheet does not balance", body: "The page says by how much. Check the trial balance first, then the period you are looking at." },
  { title: "Figures look low", body: "The report may be showing your branches only; a note at the top says so. Also check the period chosen and that the month's entries are posted." },
  { title: "Cost centre analysis is empty", body: "Only entries tagged with a cost centre appear. Tag lines on invoices, claims and journals to see spending by department." },
] as const;

export default function FinancialReportsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The reports are built from everything posted in the ledger. They are only as complete as the entries behind them.</p>
        <GuideChecklist items={[
          "The month's fees, receipts, payroll and spending are posted.",
          "The bank is reconciled for the period.",
          "You know which period, or which date, the report is for. Period lists name each month in words, such as September 2026.",
        ]} />
      </GuideSection>

      <GuideSection id="choose-the-report" title="Choose the report">
        <GuideSteps>
          <GuideStep title="Trial Balance">Every account&apos;s debit and credit for the period. Its <strong>Status</strong> must read <strong>Balanced</strong> before anything else is trusted. Tick <strong>Compare to prior period</strong> to see the change.</GuideStep>
          <GuideStep title="Income Statement">Income less spending: whether the school made a surplus or a deficit. <strong>vs Budget</strong> and <strong>vs Prior year</strong> add comparison columns when there is data for them.</GuideStep>
          <GuideStep title="Balance Sheet">What the school owns and owes on one date, chosen with <strong>As of</strong>.</GuideStep>
          <GuideStep title="Cash Flow">Where cash came from and went, split into operating, investing and financing.</GuideStep>
          <GuideStep title="Changes in Equity">How the school&apos;s reserves moved from the start of the period to the end.</GuideStep>
          <GuideStep title="Cost &amp; Dimension Analysis">Activity per account for each cost centre, such as a department or branch.</GuideStep>
        </GuideSteps>
        <p>Above its figures, each report names the time it covers. A month is named in words, such as <strong>September 2026</strong>. With no month chosen, the Trial Balance and Cost &amp; Dimension Analysis read <strong>All periods</strong>, and Cash Flow and Changes in Equity read <strong>Year to date</strong>. The Income Statement names a whole year as <strong>FY 2026</strong>, and the year so far as <strong>2026 fiscal year</strong>.</p>
      </GuideSection>

      <GuideSection id="check-the-signals" title="Check the built-in checks">
        <p>Each statement checks itself. The balance sheet reads <em>Balance sheet balances</em> or gives the amount it is out by; cash flow confirms opening cash plus the change equals closing cash; changes in equity confirms it agrees with the balance sheet. A failed check is a reason to stop, not to adjust the figures.</p>
        <GuideCallout tone="info" title="Branch staff see their branches">
          If you work in some branches only, a note says <strong>Your branches only</strong>. The figures cover entries raised in your branches plus school-wide ones.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="export" title="Export and share">
        <p>Every report has <strong>CSV</strong>, <strong>XLSX</strong> and <strong>PDF</strong> buttons. The file&apos;s heading names the month in words, as the screen does. Export after the period is closed, so the figures you send to the board or your auditor cannot change afterwards.</p>
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
        <GuideCallout tone="tip" title="The reports are ready when">
          The trial balance is Balanced, each statement&apos;s own check passes, the period is closed, and the exported files are filed with the month&apos;s records.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
