import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "New budget is missing", body: "Creating budgets needs its own permission, and you must be able to file for the school or for at least one branch." },
  { title: "The name is refused", body: "The school, or that branch, already has a budget with that name for the fiscal year." },
  { title: "No actuals on the school's budget", body: "Staff who work in some branches only see the school-wide budget as a plan. Its actuals cover every branch." },
  { title: "The budget will not open for editing", body: "It is approved, and approval locks the lines. It opens as the variance view instead." },
] as const;

export default function BudgetsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A budget is the plan for the fiscal year, account by account. The screen compares it with what is actually posted, so overspending shows while there is still time to act.</p>
        <GuideChecklist items={[
          "The board or head has agreed the budget figures.",
          "You know whether it is the school's budget or one branch's.",
          "The fiscal year exists and is open.",
        ]} />
        <GuideCallout tone="info" title="A budget posts nothing">
          Budget lines are a plan. The actual figures still come from invoices, receipts, payroll and journals.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="create-the-budget" title="Create the budget">
        <GuideSteps>
          <GuideStep title="Open Budgets & Forecasts and select New budget">Give it a <strong>Name</strong>, such as <em>Operating budget 2026/27</em>, and pick the <strong>Fiscal year</strong>.</GuideStep>
          <GuideStep title="Choose whose plan it is">Under <strong>Branch</strong>, pick <strong>School-wide</strong> or one branch. A branch budget is measured against that branch&apos;s own postings; a school-wide one against the whole school. Staff who work in one branch file for that branch only.</GuideStep>
          <GuideStep title="Select Create budget">It is saved as a draft you can keep editing.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="add-lines" title="Add the lines">
        <p>Open the draft. For each line pick the income or expense <strong>Account</strong>, an optional <strong>Cost center</strong>, the <strong>Period</strong> and the <strong>Amount</strong>, and select <strong>Add line</strong> for more. The running <strong>Total budgeted</strong> shows at the top. Select <strong>Save</strong> as you go.</p>
      </GuideSection>

      <GuideSection id="approve" title="Approve the budget">
        <p>When the lines match the agreed plan, select <strong>Save &amp; approve</strong>. Approval locks the lines, and the budget becomes the fixed plan that actuals are measured against.</p>
        <GuideCallout tone="warning" title="Only drafts can be deleted">
          <strong>Delete</strong> removes a draft and its lines. An approved budget cannot be deleted, so approve only when the figures are final.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="track-spending" title="Track spending against it">
        <p>The list shows each budget&apos;s <strong>Budgeted</strong>, <strong>Actual YTD</strong> and <strong>Consumed</strong>. Open an approved budget for <strong>Variance (remaining)</strong> line by line. The <strong>Variance heatmap</strong> colours each account by period: <strong>On track</strong>, <strong>Approaching</strong>, <strong>Over budget</strong> and <strong>Severe overrun</strong>. Trace a red cell to the spending behind it before deciding what to do.</p>
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
        <GuideCallout tone="tip" title="The budget is in place when">
          It belongs to the right branch or is school-wide, its lines match the agreed plan, it is approved, and overruns on the heatmap are being followed up.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
