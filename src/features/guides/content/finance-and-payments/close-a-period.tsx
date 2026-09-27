import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Nothing can be posted anywhere", body: "No fiscal period is open, or the calendar has run out. The finance dashboard warns about this. Create the next fiscal year." },
  { title: "Run close steps is refused", body: "A check marked Blocks the close has failed. Fix what it names, such as an unbalanced trial balance or a draft journal, and run it again." },
  { title: "Lock period is greyed out", body: "It is the last period of a year that is not closed yet. Close the fiscal year first." },
  { title: "Close fiscal year is greyed out", body: "At least one period is still Open. Soft-close or close every period first." },
] as const;

export default function CloseAPeriodArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The fiscal calendar decides which dates anything can be posted on. Every invoice, receipt, payroll run and journal must fall in an <strong>open</strong> period. Closing a period at month end stops late entries changing figures you have already reported.</p>
        <GuideChecklist items={[
          "Everything for the month is recorded: fees, receipts, payroll, claims, petty cash.",
          "The bank is reconciled for the month.",
          "No journals are left as drafts.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-calendar" title="Create the fiscal year">
        <GuideSteps>
          <GuideStep title="Open Fiscal Periods">Choose a year from the list at the top, or select <strong>New fiscal year</strong>.</GuideStep>
          <GuideStep title="Set it up">Enter the <strong>Fiscal year label</strong>, the <strong>Period frequency</strong> (Monthly for 12 periods, Quarterly for 4), and the <strong>Starting month</strong> and <strong>Starting day</strong>. The preview says exactly what will be created.</GuideStep>
          <GuideStep title="Select Create fiscal calendar">All the new periods start open.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Create next year before this one ends">
          When the last period passes and no next year exists, every posting is refused: invoices, receipts and payroll alike. The finance dashboard warns as the end approaches.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="period-statuses" title="What each status allows">
        <GuideSteps>
          <GuideStep title="Open">Ordinary posting allowed.</GuideStep>
          <GuideStep title="Soft Closed">Only closing entries. It can be reopened.</GuideStep>
          <GuideStep title="Closed">Closed after the close steps have run. It can be reopened by someone with permission.</GuideStep>
          <GuideStep title="Locked">A permanent seal. Corrections go into a later open period.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="close-a-month" title="Close a month">
        <GuideSteps>
          <GuideStep title="Select the period">Its panel shows the <strong>Close checklist</strong>, including whether the trial balance balances and whether draft journals remain. A check marked <strong>Blocks the close</strong> must pass; one marked <strong>Warning only</strong> will not stop it.</GuideStep>
          <GuideStep title="Soft close, if you are still tidying up">Select <strong>Soft close</strong> to stop ordinary posting while you finish adjustments.</GuideStep>
          <GuideStep title="Run close steps">Select <strong>Run close steps</strong> and confirm with <strong>Run period close</strong>. The period reads Closed.</GuideStep>
        </GuideSteps>
        <p><strong>Re-open</strong> on a soft-closed or closed period lets ordinary posting back in, and is recorded in the audit trail. <strong>Periods &amp; Close</strong> under Reports opens the same workbench.</p>
      </GuideSection>

      <GuideSection id="close-the-year" title="Close the fiscal year">
        <p>When every period is soft-closed or closed, the banner reads <strong>Ready for year-end close</strong>. <strong>Close fiscal year</strong> posts the year-end journal, moving the year&apos;s surplus or deficit into retained earnings, and seals the year.</p>
        <GuideCallout tone="danger" title="Year-end close and locks are permanent">
          Neither closing the fiscal year nor <strong>Lock period</strong> can be undone. Agree the year&apos;s figures with the head and your auditor before either.
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
        <GuideCallout tone="tip" title="The month is closed when">
          Its checklist passes, the period reads Closed, the next period is open for the new month, and a next fiscal year exists before this one runs out.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
