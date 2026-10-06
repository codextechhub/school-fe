import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ExportAndDownloadArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Most lists, such as the Student Directory, classes, subjects and the Finance and Procurement lists, have an <strong>Export</strong> button that turns what you are looking at into a spreadsheet. The file is produced in the background and waits for you under <strong>Files</strong> in the Export Centre.</p>
        <GuideChecklist items={[
          "Filter the list to exactly what you need before exporting.",
          "The Export button appears only when your role may export that list.",
          "Files are kept for a limited time, usually 30 days, then expire.",
        ]} />
        <GuideCallout tone="warning" title="A file leaves the system">Once downloaded, the file is outside XVS&apos;s protection. Share it only with people who need it, and delete it when you are done.</GuideCallout>
      </GuideSection>

      <GuideSection id="export-a-list" title="Export a list">
        <GuideSteps>
          <GuideStep title="Set your filters">For example, choose one class and the active students only.</GuideStep>
          <GuideStep title="Select Export">A message confirms the export has been queued.</GuideStep>
          <GuideStep title="If the file will show more than the screen">Some screen filters cannot be carried into a file. A dialog titled <strong>This file will show more than the screen</strong> says which, and that everything else you filtered by is carried. Select <strong>Export anyway</strong>, or cancel and narrow the list another way.</GuideStep>
          <GuideStep title="Finance and Procurement lists">Their status tabs and filters are carried, <strong>Sent back</strong> included, so the file holds what the list shows. The exception is purchase orders on <strong>Partly received</strong>, which the export cannot filter by, so that dialog appears.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="download-the-file" title="Download the file">
        <GuideSteps>
          <GuideStep title="Open Files">Under Export Centre, <strong>Files</strong> lists every export run with who asked for it, when, how many rows, its status, and when the file expires. <strong>Ready to download</strong> counts what is waiting.</GuideStep>
          <GuideStep title="Download">Select <strong>Download</strong> on the row. Open a row for its full record: the columns and filters used, and every download of the file.</GuideStep>
        </GuideSteps>
        <p><strong>Queues</strong> shows imports and exports you started while they run, with <strong>Queued</strong>, <strong>Running</strong>, <strong>Completed</strong> and <strong>Failed</strong> counts. You can leave the page while an export runs; you are notified when the file is ready.</p>
      </GuideSection>

      <GuideSection id="when-an-export-goes-wrong" title="When an export goes wrong">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Partly complete", "The file was produced, but something was left out: columns you cannot read, fields that no longer exist, or rows past the limit. The run page lists exactly what."],
            ["Failed", "The run page says what went wrong and what to do, such as narrowing the filters or shortening the date range. Where the fault was temporary, Retry now is offered."],
            ["Cancelled", "Someone stopped it before it finished. No partial file is kept. Export again when you need it."],
            ["Expired", "The file passed its availability date. Export the list again for a new file."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p>To stop an export that is still running, open it and select <strong>Cancel run</strong>. When contacting support, quote the reference shown on the run page rather than sending the file.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "There is no Export button: your role cannot export that list, or your school is still being set up.",
          "There is no Download on the row: the file has expired or was not produced, or your role cannot download export files. Open the row to see which.",
          "A column is missing from the file: it is restricted for your role, and the run page lists it under what was left out.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The file has downloaded, its row count matches the list you filtered, and it has gone only to the people who need it.</GuideCallout>
      </GuideSection>
    </div>
  );
}
