import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function DepartmentsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Departments group the programmes and subjects a school teaches, such as Sciences or Humanities. They are optional: a programme or subject with no department still works everywhere. Open <strong>Academic Structure</strong>, then <strong>Departments</strong>.</p>
        <GuideChecklist items={[
          "You have a list of the departments your school uses.",
          "You know whether each department serves every branch or only one.",
          "You can see the Add department button. If not, your role cannot create structure.",
        ]} />
        <GuideCallout tone="info" title="Departments do not change with the year">A department is part of the school&apos;s filing, not of one school year, so the list stays the same whichever year you choose. The programme and subject counts on each card are the chosen year&apos;s.</GuideCallout>
      </GuideSection>

      <GuideSection id="add-a-department" title="Add a department">
        <GuideSteps>
          <GuideStep title="Open the form">Select <strong>Add department</strong>.</GuideStep>
          <GuideStep title="Name it">Type the <strong>Department name</strong>, for example <em>Sciences</em>.</GuideStep>
          <GuideStep title="Check the code">The <strong>Code</strong> is built from the name as you type, for example SCI. Type over it to use your own; <strong>Generate</strong> hands the field back to the built code.</GuideStep>
          <GuideStep title="Describe it">Add a <strong>Description</strong> if it helps colleagues choose the right department. It is optional.</GuideStep>
          <GuideStep title="Save">Select <strong>Create</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="choose-where-it-applies" title="Choose where it applies">
        <p>When your school runs more than one branch, the form asks where the department <strong>Applies to</strong>: <strong>The whole school</strong>, or <strong>One branch</strong> chosen by typing its name. Most schools run one set of departments across every branch.</p>
        <p>If you work in one branch only, the form shows that branch instead of a choice, because anything you create belongs to it.</p>
        <GuideCallout tone="warning" title="Narrowing a school-wide department">Changing a school-wide department to one branch asks you to confirm first. Every other branch stops seeing it. Anything already mapped to it there stays, but nobody at those branches can use it again. Select <strong>Narrow scope</strong> only if that is what you mean.</GuideCallout>
      </GuideSection>

      <GuideSection id="open-a-department" title="Open and edit a department">
        <p>Select a card, or a row in <strong>Table</strong> view, to open the department. The panel shows its code, description, how many programmes and subjects it holds, its scope, and whether it is available when people assign programmes and subjects.</p>
        <p>Select <strong>Edit department</strong> in the panel, or <strong>Edit</strong> from the card&apos;s menu, to change it. The form is the same one used to add.</p>
      </GuideSection>

      <GuideSection id="archive-and-restore" title="Archive and restore">
        <p>Archive a department you no longer use from the card&apos;s menu or the open panel, then confirm with <strong>Archive</strong>. An archived department stops appearing when anyone picks one. Nothing already mapped to it is moved.</p>
        <p>To bring one back, set the status filter to <strong>Archived</strong>, open it, and choose <strong>Restore</strong>.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="The name or code is refused">Another department already uses it. The message appears under the field it names. Change it and save again.</GuideStep>
          <GuideStep title="A department has disappeared">It has probably been archived. Set the status filter to <strong>Archived</strong> or <strong>All statuses</strong>.</GuideStep>
          <GuideStep title="Edit or Archive is missing">Your role cannot change structure, or the department is school-wide and you work in one branch only.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every department your school uses is listed as Active, with the right scope, and the ones you retired are archived rather than left in the list.</GuideCallout>
      </GuideSection>
    </div>
  );
}
