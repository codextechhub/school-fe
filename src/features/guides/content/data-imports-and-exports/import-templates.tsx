import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ImportTemplatesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>An import template is the spreadsheet layout a file must follow for one kind of record: its columns, which are required, and what each one accepts. XVS publishes and maintains the templates; a school downloads them and fills them in.</p>
        <GuideChecklist items={[
          "The quickest way to a template is the Download template button on the first step of any import.",
          "To browse them all, type import templates into the search box and choose View import templates.",
        ]} />
      </GuideSection>

      <GuideSection id="find-a-template" title="Find a template">
        <GuideSteps>
          <GuideStep title="Search the list">On <strong>Import Templates</strong>, search by code, name or dataset. Each row shows the template&apos;s format, status and number of columns.</GuideStep>
          <GuideStep title="Open it">Select <strong>View Details</strong> to read the <strong>Description</strong>, <strong>Instructions</strong> and every column. Columns marked <strong>Required</strong> must be filled on every row; <strong>Unique</strong> ones cannot repeat in the file.</GuideStep>
          <GuideStep title="Download it">Select <strong>Download CSV</strong> or <strong>Download XLSX</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="use-it-well" title="Use it well">
        <GuideChecklist items={[
          "Download a fresh copy for each term's import rather than reusing an old one.",
          "Keep the headings exactly as downloaded.",
          "Read each column's sample value to see the expected format, such as how dates are written.",
        ]} />
        <GuideCallout tone="info" title="Templates are not edited by the school">If a template is missing a column your school needs, raise a support ticket and describe the column. Addresses for creating or editing a template tell a school it does not have permission.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">You have the current template for your records and know which columns are required.</GuideCallout>
      </GuideSection>
    </div>
  );
}
