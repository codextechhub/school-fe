import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function CheckAnImportArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Import Batches</strong> is the school&apos;s record of every file uploaded, whether from Students, Staff or setup. Use it to answer questions such as &quot;did the new caretaker ever get added?&quot; or &quot;why did half the JSS1 roll not arrive?&quot;.</p>
        <GuideChecklist items={[
          "Open Data Imports under Data in the sidebar.",
          "Know roughly when the file was uploaded, or its file name.",
        ]} />
      </GuideSection>

      <GuideSection id="find-a-batch" title="Find a batch">
        <GuideSteps>
          <GuideStep title="Use the cards and filters">The cards <strong>Total Batches</strong>, <strong>In Flight</strong>, <strong>Needs Attention</strong> and <strong>Succeeded</strong> each filter the list when selected. The search box finds a file name or template, and <strong>All statuses</strong> narrows by status.</GuideStep>
          <GuideStep title="Read the row">Each row shows the file, template, status, rows and columns, and how many errors and warnings it had.</GuideStep>
          <GuideStep title="Open it">Select <strong>View Details</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="read-the-batch" title="Read the batch">
        <p>The top of the batch shows its status and a strip of the stages it passed through: <strong>Uploaded</strong>, <strong>Validate</strong>, <strong>Ready</strong>, <strong>Import</strong>, <strong>Done</strong>. <strong>Validation Summary</strong> gives the row, column, error and warning counts, and <strong>Metadata</strong> shows the template, who uploaded it and when.</p>
        <GuideChecklist items={[
          "Issues: every problem found, by row and column. Filter by severity to see errors first.",
          "Jobs: each run of the import, with how many rows succeeded, failed and were skipped.",
          "Row Results: what happened to each row, created, updated, skipped or failed.",
        ]} />
      </GuideSection>

      <GuideSection id="finish-or-fix" title="Finish or fix a batch">
        <GuideSteps>
          <GuideStep title="A batch that is ready but not started">If validation passed and the batch reads Ready to Import, <strong>Start Import</strong> queues it. Watch the <strong>Jobs</strong> tab for progress.</GuideStep>
          <GuideStep title="A batch that failed validation">Nothing was written. Work through the <strong>Issues</strong> tab, correct the spreadsheet, and upload it again from the screen you started on.</GuideStep>
          <GuideStep title="A batch that partly imported">Open <strong>Row Results</strong> and filter to <strong>Failed</strong>. Fix only those rows and import them as a new file.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Corrections always go through a new file">There is no way to edit a row inside a batch. Change the spreadsheet and upload it again, so the batch record stays a true copy of what was sent.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "The batch seems stuck: check Queues under Export Centre before uploading the file again.",
          "Start Import is unavailable: the batch still has critical errors, or it is not ready yet.",
          "A student is missing after an import: search Row Results for their row to see whether it was skipped or failed, and why.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">You can say for any upload what status it reached, how many rows went in, and which rows still need correcting.</GuideCallout>
      </GuideSection>
    </div>
  );
}
