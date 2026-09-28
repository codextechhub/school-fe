import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function ImportStudentsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Importing loads many students from one spreadsheet. It opens as a drawer over the Student Directory, so the rows land in the list you started from. Nothing is written until you confirm on the last step.</p>
        <GuideChecklist items={[
          "Your role lets you import students.",
          "Your file is a .csv, .xlsx or .xls file of 50 MB or less.",
          "The classes and branches your file names already exist.",
          "You have downloaded the students template and filled it in, or your file uses the same column headers.",
        ]} />
      </GuideSection>

      <GuideSection id="open-the-import" title="Open the import">
        <p>On the Student Directory, select <strong>Import</strong>. The <strong>Import students</strong> drawer opens. The template is fixed for this import, so you only choose the file.</p>
        <p>Select <strong>Download template</strong> to get the columns the school expects. The template card shows how many columns there are and how many are required.</p>
      </GuideSection>

      <GuideSection id="upload-and-check" title="Upload and check the file">
        <GuideSteps>
          <GuideStep title="Upload">Drop the file on the box or select it to browse, add optional <strong>Notes</strong> for whoever reviews the batch, and select <strong>Parse &amp; continue</strong>. Empty rows are ignored.</GuideStep>
          <GuideStep title="Compare the headers">The <strong>Header comparison</strong> step lists the template&apos;s columns beside yours. A column marked <strong>Missing in upload</strong> may come with a suggestion of what you meant. Select <strong>Continue to validation</strong>.</GuideStep>
          <GuideStep title="Read the validation issues">Every row is checked for required fields, values and references to classes and branches. <strong>Review validation issues</strong> lists errors and warnings by row. Select <strong>Export Error Data</strong> for a file of every issue to fix in your spreadsheet.</GuideStep>
          <GuideStep title="Go on">When the issues are ones you accept, select <strong>Proceed to import</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="confirm-and-import" title="Confirm and import">
        <p><strong>Confirm import</strong> shows the source file, the total rows, the rows ready to import and any blocking errors, with a preview of the first rows.</p>
        <GuideCallout tone="warning" title="This is the step that writes">Select <strong>Start import</strong> only when the numbers match what you expect. It stays disabled while any blocking error remains. The import then runs and shows how many rows were processed, succeeded, failed or skipped.</GuideCallout>
      </GuideSection>

      <GuideSection id="after-the-import" title="After the import">
        <p>The last step says whether the import succeeded, succeeded in part, or failed. The directory refreshes when the import finishes. Students who arrive with no class appear in the work queue and under <strong>Unassigned class only</strong>, ready to place from Classes &amp; Transfers.</p>
        <p>If an import succeeded only in part or failed, <strong>Roll back import</strong> reverses it. A rollback is possible for up to 7 days after the import completes.</p>
        <GuideCallout tone="info" title="Leaving part way">The cross at the top of the drawer asks <strong>Cancel this import?</strong> Select <strong>Cancel import</strong> to mark the batch as cancelled with nothing written, or <strong>Continue import</strong> to stay.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Import is missing from the directory", body: "Importing students needs its own permission. Ask whoever manages roles at your school." },
          { title: "No data rows detected", body: "The file has headers but no rows under them, or the rows are on another sheet. Check the file and upload it again." },
          { title: "Start import stays disabled", body: "At least one blocking error remains. Export the error data, fix the rows in your spreadsheet, and upload the file again." },
          { title: "Rows warn that the school asks for more guardians", body: "Your school asks for more than one guardian per child and each row carries one. The students are still imported; add the other guardians on their records or with the guardians import." },
          { title: "Rows failed to import", body: "Select View import details on the last step to see why each row failed, fix those rows in the file and import them again." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The import reports success, the directory count has grown by the number of rows imported, and every imported student has a class or is on your list to place.</GuideCallout>
      </GuideSection>
    </div>
  );
}
