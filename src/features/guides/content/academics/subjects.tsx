import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function SubjectsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A subject is something the school teaches, such as Mathematics. Each subject names the levels it is taught at, and a class&apos;s subject count comes from those levels. Open <strong>Academic Structure</strong>, then <strong>Subjects</strong>.</p>
        <GuideChecklist items={[
          "The levels exist on Programmes & Levels for the year you are working in.",
          "Departments are added, if you want to group subjects under them.",
          "You know which subjects are core and which are electives.",
          "You know the levels each subject is taught at.",
        ]} />
        <GuideCallout tone="info" title="A subject stays, its levels change">A subject stays on file from year to year. Where it is taught belongs to the year you are looking at, so each card says <em>Offered in</em> followed by that year.</GuideCallout>
      </GuideSection>

      <GuideSection id="add-a-subject" title="Add a subject">
        <GuideSteps>
          <GuideStep title="Open the form">Select <strong>Add subject</strong>.</GuideStep>
          <GuideStep title="Name it">Type the <strong>Subject name</strong>. The <strong>Code</strong> is built from the name; type over it to use your own, such as MTH.</GuideStep>
          <GuideStep title="Pick a department">Choose a <strong>Department</strong>, or leave it as <strong>No department</strong>.</GuideStep>
          <GuideStep title="Core or elective">Leave <strong>Core subject</strong> ticked for a subject every pupil takes at the levels it is offered. Untick it for an elective that pupils choose.</GuideStep>
          <GuideStep title="Choose the levels">Pick the levels under <strong>Offered at</strong> (see below).</GuideStep>
          <GuideStep title="Choose where it applies">When your school runs more than one branch, choose <strong>The whole school</strong> or <strong>One branch</strong>. A school-wide subject is available at every branch that has these levels.</GuideStep>
          <GuideStep title="Save">Select <strong>Create</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="choose-levels" title="Choose the levels it is offered at">
        <p><strong>Offered at</strong> groups the levels by programme. Select a level to add or remove it, or use <strong>All</strong> on a programme to pick every level in it at once (<strong>Clear</strong> removes them again). The count at the top shows how many levels are picked.</p>
        <GuideCallout tone="warning" title="What you tick is the whole answer">Saving replaces the subject&apos;s levels with exactly what is ticked. A level left unticked is a level the subject is not offered at.</GuideCallout>
        <p>Only levels you can see in the branch you are looking at are offered. If none are in view, add levels on Programmes &amp; Levels first, or widen the branch selector in the sidebar.</p>
      </GuideSection>

      <GuideSection id="read-subject-cards" title="Read the subject list">
        <p>Each card shows the subject&apos;s code and department, a <strong>Core</strong> or <strong>Elective</strong> badge, and the first few levels it is offered at. A card showing <strong>Not taught at any level</strong> is a subject that does nothing yet; open it and pick its levels.</p>
        <p>Filter with <strong>All subjects</strong>, <strong>Core only</strong> or <strong>Electives only</strong>, filter by status, or switch to <strong>Table</strong>. Select a card to edit it, where your role allows.</p>
      </GuideSection>

      <GuideSection id="archive-and-restore" title="Archive and restore">
        <p>Choose <strong>Archive</strong> from a subject&apos;s menu. An archived subject stops appearing when anyone picks a subject, and the levels it is taught at stay as they are. Set the status filter to <strong>Archived</strong> to find it again, then choose <strong>Restore</strong>.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="Add subject is greyed out">You are looking at an archived year, which is read-only. Switch to the active year.</GuideStep>
          <GuideStep title="A card cannot be opened">Your role can read subjects but not edit them, the subject is archived, or it is school-wide and you work in one branch only.</GuideStep>
          <GuideStep title="A class shows fewer subjects than expected">Check that each subject is offered at the class&apos;s level for this year.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">No card reads Not taught at any level, and each class page shows the number of subjects you expect.</GuideCallout>
      </GuideSection>
    </div>
  );
}
