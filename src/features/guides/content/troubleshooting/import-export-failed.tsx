import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ImportExportFailedArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Imports and exports run in the background, so a problem shows up on the batch or the file rather than as an error on the page you were on. Each one records what went wrong and what to do next.</p>
        <GuideChecklist items={[
          "You know roughly when you started the import or export.",
          "You still have the spreadsheet you uploaded, if it was an import.",
          "Do not upload the same file again until you know why the first one stopped.",
        ]} />
      </GuideSection>

      <GuideSection id="an-import-stopped" title="An import stopped">
        <GuideSteps>
          <GuideStep title="Open the batch">Open <strong>Data Imports</strong> under Data in the sidebar and select the batch. Its status says how far it got: <strong>Validation Failed</strong>, <strong>Import Failed</strong>, <strong>Partially Imported</strong>, <strong>Rolled Back</strong> or <strong>Cancelled</strong>.</GuideStep>
          <GuideStep title="Read the Issues tab">For <strong>Validation Failed</strong>, the <strong>Issues</strong> tab lists each row and column the check refused. Nothing was imported, so fix those rows in your spreadsheet and upload it again.</GuideStep>
          <GuideStep title="Read the Jobs and Row Results tabs">For <strong>Import Failed</strong> or <strong>Partially Imported</strong>, the <strong>Jobs</strong> tab gives the error and <strong>Row Results</strong> shows each row as created, updated, skipped or failed. Upload only the rows that did not, so nothing is imported twice.</GuideStep>
          <GuideStep title="Wait for work in progress">While a batch reads <strong>Validating</strong>, <strong>Import Queued</strong> or <strong>Importing</strong>, it is still working. Leave it to finish.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Partial means some rows are in">A partially imported batch has already created records. Check them before you import again, or you may create duplicates.</GuideCallout>
      </GuideSection>

      <GuideSection id="an-export-failed" title="An export failed">
        <GuideSteps>
          <GuideStep title="Find the run">Open <strong>Export Centre</strong> under Data in the sidebar, then <strong>Files</strong>, and open the run. <strong>Queues</strong> shows work still waiting or running.</GuideStep>
          <GuideStep title="Read the reason">A failed run says why, and <strong>What to do</strong> gives the next step. When the fix is in the export itself, a button takes you to change it: <strong>Edit the filters</strong>, <strong>Set the filter</strong>, <strong>Choose columns</strong>, <strong>Narrow the filters</strong> or <strong>Pick another dataset</strong>.</GuideStep>
          <GuideStep title="Retry only a passing fault">When the run failed for a reason outside the export, <strong>Retry now</strong> is offered. Where it is not offered, running it again would fail in the same way.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Completed, but with gaps">A run can complete with some columns or rows left out, for example columns you are not allowed to read or rows over the limit. The run lists what was left out and why.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li>Data Imports or Export Centre is not in the sidebar: your role or the school&apos;s plan does not include it. See the guide on access denied and missing buttons.</li>
          <li>A file has expired: exported files are kept for a limited time. Run the export again.</li>
          <li><strong>There is nothing to change on the export itself - this needs an administrator.</strong>: the failure is about access, not the export. Ask whoever manages roles at your school.</li>
          <li>You cannot tell what went wrong: raise a ticket from the headset in the header. Include the batch or run name, when you started it, and the <strong>Reference</strong> shown on a failed export.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "You know which status the batch or run ended in, and why.",
          "The spreadsheet or export has been corrected.",
          "Records from a partial import were checked before importing again.",
          "The new import or export finished.",
        ]} />
      </GuideSection>
    </div>
  );
}
