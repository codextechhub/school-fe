import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function BuildASavedExportArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A saved export is a recipe you build once and run whenever you need the same file, such as a termly list of students with their guardians&apos; phone numbers for the transport office. Each run produces a fresh file; the recipe itself holds no data.</p>
        <GuideChecklist items={[
          "Open Export Centre under Data in the sidebar, then Exports.",
          "Know what the file is for and who will receive it, so you choose only the columns they need.",
          "Saving an export is for school administrators. Other staff can still export a list from its own screen.",
        ]} />
      </GuideSection>

      <GuideSection id="choose-the-data" title="Choose the data">
        <GuideSteps>
          <GuideStep title="Select New export">The builder has four steps: <strong>Data</strong>, <strong>Columns</strong>, <strong>File</strong> and <strong>Review</strong>.</GuideStep>
          <GuideStep title="Pick the module and dataset">Only the datasets you are allowed to export are listed. If <strong>Entity scope</strong> appears, as it can for finance data, choose the one listed.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="choose-columns-and-filters" title="Choose columns and filters">
        <GuideSteps>
          <GuideStep title="Add columns">Select fields under <strong>Available fields</strong>. The order under <strong>Selected · file order</strong> is the column order in the file.</GuideStep>
          <GuideStep title="Narrow the rows">Under <strong>Filters</strong>, select <strong>Add a filter…</strong>, for example one class or one session.</GuideStep>
          <GuideStep title="Watch the estimate">The <strong>Estimate</strong> beside the steps shows the matching rows and the likely file size, and updates as you change things.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Sensitive columns">Fields marked <strong>Sensitive</strong> are restricted. Including one is recorded against your name, and a run by someone without the right access leaves those columns out.</GuideCallout>
      </GuideSection>

      <GuideSection id="choose-the-file" title="Choose the file">
        <p>Choose <strong>Excel (.xlsx)</strong> or <strong>CSV (.csv)</strong>, and whether the values are <strong>For people to read</strong> or <strong>For another system to import</strong>. Excel and CSV each have their own options, such as <strong>Freeze the header row</strong> or the <strong>Delimiter</strong>. Set the <strong>File name</strong>; tokens such as {"{date}"} fill in on each run, and the page shows what today&apos;s name would be.</p>
      </GuideSection>

      <GuideSection id="review-save-and-run" title="Review, save and run">
        <GuideSteps>
          <GuideStep title="Name it">On <strong>Review</strong>, give it a <strong>Name</strong> and a <strong>Description</strong> of what it is for. Check each row, and use <strong>Edit</strong> to go back to a step.</GuideStep>
          <GuideStep title="Save">Select <strong>Save without running</strong>, or <strong>Save and run</strong> to produce a file now. A queued file appears under <strong>Files</strong> when it is ready.</GuideStep>
          <GuideStep title="Run it again later">On <strong>Exports</strong>, open the row&apos;s menu and select <strong>Run now</strong>. <strong>Duplicate</strong> copies it as a starting point for a similar export.</GuideStep>
        </GuideSteps>
        <p>Editing an export changes future files only; files already produced are never altered. <strong>Delete</strong> removes the export from the list, while files it already produced stay until they expire.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "Next is unavailable: choose a dataset, then at least one column.",
          "A dataset is missing: it has not been made available for export, or your role cannot export it.",
          "Edit or Delete is greyed out: only the person who owns an export can change it.",
          "Exports shows Access Denied: saving exports is for school administrators; use the Export button on the list itself instead.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The export is listed under Exports with a clear name, and a run of it produces a file with the columns and rows you expected.</GuideCallout>
      </GuideSection>
    </div>
  );
}
