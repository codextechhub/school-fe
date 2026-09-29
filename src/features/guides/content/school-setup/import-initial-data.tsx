import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["A row is greyed out", "That template is not available yet. Its Template and Import controls come alive once XVS makes it available."],
  ["There is no Import button", "Your role can see the templates but not upload against them. Ask a school administrator."],
  ["The file is rejected","It does not match the template's columns. Download the template again and copy your data into it."],
  ["Students fail because of their class", "Students must name classes that already exist. Finish Academic Structure first, then import again."],
  ["A dataset says Partly imported", "Some rows did not land, so it does not count yet. Open the batch with View results or Fix rows and deal with the rest."],
  ["You need another branch", "Branches are opened by XVS, not uploaded. Ask the team."],
] as const;

export default function ImportInitialDataArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Upload Initial Datasets</strong> is where you load your school&apos;s own records from spreadsheets. Open it from the data card in the control room with <strong>Open import</strong>.</p>
        <GuideChecklist items={[
          "Academic Structure is finished, so your classes exist.",
          "Your files are CSV or XLSX and under 50 MB.",
          "You have one file each for students, staff and guardians.",
          "You have checked the data before uploading it.",
        ]} />
      </GuideSection>

      <GuideSection id="read-required-datasets" title="Read the required datasets">
        <p>The <strong>Required datasets</strong> card lists the three this step needs: <strong>Students</strong>, <strong>Staff</strong> and <strong>Guardians</strong> (your parents and other guardians). Each shows <strong>Not started</strong>, <strong>Partly imported</strong>, <strong>Imported</strong> or <strong>Not available yet</strong>, and the bar shows how many are fully imported.</p>
        <GuideCallout tone="warning" title="Only a full import counts">A partly imported dataset leaves rows behind, so it does not satisfy the step. Deal with the failed rows first.</GuideCallout>
      </GuideSection>

      <GuideSection id="staff-imported-during-setup" title="Staff imported during setup">
        <p>Staff imported now start on your school&apos;s starting role, Teacher unless it was changed in <strong>Settings</strong> under <strong>Staff rules</strong>, and are marked <strong>Invited at go-live</strong>. Nobody is emailed yet: each result line reads, for example, <em>Tunde Bello added. Their invitation goes out when the school goes live.</em></p>
        <p>When your school goes live, all their invitations go out together. One that fails does not hold up go-live or the others; send that person theirs with <strong>Resend</strong> once you are live.</p>
        <GuideCallout tone="info" title="Going live approves the list">Staff imported during setup skip hire approval, because going live is the school approving the list. A file that still has a Role column is not refused: it warns once that roles are not imported and that everybody starts on the starting role.</GuideCallout>
      </GuideSection>

      <GuideSection id="import-a-dataset" title="Import a dataset">
        <GuideSteps>
          <GuideStep title="Find the template">Use <strong>Search templates</strong>. Each row says whether the step needs it (<strong>Required</strong> or <strong>Optional</strong>) and how many columns it has.</GuideStep>
          <GuideStep title="Download it if you need the format">Select <strong>Template</strong> to download a blank file with the right columns, and put your data into it.</GuideStep>
          <GuideStep title="Run the import">Select <strong>Import</strong>. The import wizard opens, where you upload the file, check it and confirm. Nothing is written until you confirm.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="check-your-uploads" title="Check your uploads">
        <p><strong>Import batches</strong> lists every file you have uploaded with its status, such as <strong>Checking</strong>, <strong>Importing</strong>, <strong>Imported</strong>, <strong>Partly imported</strong> or <strong>Needs fixing</strong>. Select <strong>View results</strong> to see what an upload did, or <strong>Fix rows</strong> when it has problems to correct.</p>
      </GuideSection>

      <GuideSection id="finish-data-setup" title="Finish data setup">
        <p>When all three required datasets show <strong>Imported</strong>, select <strong>Finish data setup</strong>. The step closes and you return to the control room. The button stays disabled until then.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The Required datasets card reads <strong>3 of 3 fully imported</strong> and the data step shows <strong>Done</strong> in the control room.</GuideCallout>
      </GuideSection>
    </div>
  );
}
