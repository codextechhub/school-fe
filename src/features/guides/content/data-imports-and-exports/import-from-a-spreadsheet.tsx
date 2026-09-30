import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const STEPS = ["Upload", "Headers", "Validation", "Review", "Confirm", "Import", "Complete"] as const;

export default function ImportFromASpreadsheetArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>An import adds many records at once from a spreadsheet, such as the whole of JSS1 or every member of staff. Nothing is written until you confirm on the last step, and a file with any error is not imported at all.</p>
        <GuideChecklist items={[
          "Start from the screen the records belong to: Import on the Student Directory or on Staff, or Upload Initial Datasets while your school is being set up.",
          "Data Imports under Data in the sidebar also has New Import, where you choose the template yourself.",
          "Use the template for this kind of record, downloaded fresh, not an old copy.",
          "The file is CSV, XLSX or XLS and no bigger than 50 MB.",
        ]} />
        <GuideCallout tone="warning" title="Keep the file private">An import file holds children&apos;s names, dates of birth and parents&apos; phone numbers. Do not email it around or attach it to a support ticket. Quote the batch number instead.</GuideCallout>
      </GuideSection>

      <GuideSection id="prepare-the-file" title="Prepare the file">
        <GuideSteps>
          <GuideStep title="View the template">On the first step, select <strong>View template</strong>, then Download in the file viewer. Open <strong>How to fill this in</strong> to read what each column expects.</GuideStep>
          <GuideStep title="Fill it in without changing its shape">Keep the column headings exactly as they are. Do not merge cells, add title rows or put two kinds of record in one file.</GuideStep>
          <GuideStep title="Tidy it">Remove blank rows at the bottom and duplicate people. Keep numbers with leading zeros, such as phone numbers, as text.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="run-the-import" title="Run the import">
        <p>The import runs in seven steps:</p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step} className="rounded-xl bg-gray-50 px-3 py-2 text-sm"><span className="text-xs text-gray-01">Step {index + 1}</span><br />{step}</li>
          ))}
        </ol>
        <GuideSteps>
          <GuideStep title="Upload">Check the <strong>Import template</strong> is the right one, drop your file under <strong>Upload file</strong>, and read the preview of the first rows. Add <strong>Notes (optional)</strong> about where the data came from. Select <strong>Parse &amp; continue</strong>.</GuideStep>
          <GuideStep title="Headers">The <strong>Header comparison</strong> shows each template column beside what your file contains. <em>Missing in upload</em> and <em>Unmapped column</em> point to a heading that was renamed. Select <strong>Continue to validation</strong>.</GuideStep>
          <GuideStep title="Validation and Review">Every row is checked. <strong>Review validation issues</strong> lists <strong>Errors</strong>, <strong>Warnings</strong> and <strong>Info</strong> by row and column.</GuideStep>
          <GuideStep title="Confirm">Check the <strong>Template</strong>, <strong>Source file</strong>, <strong>Total rows</strong> and <strong>Rows ready to import</strong> against what you expected, then select <strong>Start import</strong>.</GuideStep>
          <GuideStep title="Import and Complete">The import runs in the background, and you can leave the page; a notification tells you when it finishes. The last step says <strong>Import succeeded</strong>, <strong>Import partial</strong> or <strong>Import failed</strong>, with the counts of rows succeeded, failed and skipped.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="fix-errors" title="Fix errors and warnings">
        <p>Any error stops the whole file: <strong>Proceed to import</strong> stays unavailable, and nothing is imported, not even the good rows. Correct the rows in your spreadsheet and upload it again. Warnings do not stop the import, but read each one: a warning can mean a record will be skipped or matched to someone already in the school.</p>
        <p>To stop part way, select <strong>Cancel import</strong>. Nothing from the file is written. When you started from Students or Staff, you are asked to confirm, and the batch is marked cancelled.</p>
      </GuideSection>

      <GuideSection id="after-the-import" title="After the import">
        <GuideSteps>
          <GuideStep title="Check a few records">Open three or four of the new records on their own screen, such as a student&apos;s profile, and compare them with the file.</GuideStep>
          <GuideStep title="When some rows failed">After <strong>Import partial</strong>, the rows that succeeded are in. Fix only the rows that failed and import them as a new file, so the rows already imported are not processed again.</GuideStep>
          <GuideStep title="Keep the record">Select <strong>View import details</strong> to open the batch. It stays under Data Imports, so you can answer later who imported what and when.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Do not start the same file twice">A large import can look slow. Check Data Imports or Queues before uploading the file again, or the same people may be imported twice.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The import says Import succeeded, the row count matches your file, and a sample of records looks right on their own screens.</GuideCallout>
      </GuideSection>
    </div>
  );
}
