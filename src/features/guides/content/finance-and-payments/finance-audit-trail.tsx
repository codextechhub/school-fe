import {
  GuideCallout,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

export default function FinanceAuditTrailArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The <strong>Audit Trail</strong> records every finance action: posting, voiding, approving, rejecting, closing a period, and changes made automatically by the system. Rows can never be edited or deleted.</p>
        <GuideCallout tone="info" title="A restricted grant">
          The audit trail needs its own permission. Without it the page reads <strong>No audit access</strong>.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="find-an-entry" title="Find an entry">
        <GuideSteps>
          <GuideStep title="Filter the list">Narrow it by action, by document type (the list headed <strong>All entities</strong>), by the person who acted (<strong>All actors</strong>), by <strong>Success</strong> or <strong>Failed</strong>, and by date: <strong>Today</strong>, <strong>Last 7 days</strong> or <strong>Last 30 days</strong>.</GuideStep>
          <GuideStep title="Read the row">Each row shows <strong>When</strong>, the <strong>Actor</strong> (or System), the <strong>Action</strong>, the kind of document, its <strong>Reference</strong> and <strong>Status</strong>.</GuideStep>
          <GuideStep title="Open it">Select the row to see <strong>Field changes</strong>: each field with its value before and after.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="use-it-well" title="Use it well">
        <p>Start from what you know: a receipt number, a date, a colleague. To answer &quot;who voided this invoice?&quot;, filter by the void action and the invoice document type, narrow the dates, then find its number in the Reference column. The trail cannot be exported from this screen.</p>
      </GuideSection>
    </div>
  );
}
