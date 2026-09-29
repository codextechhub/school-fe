import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ClassesAndArmsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A class is a level plus an arm: JSS1 at level JSS1 with arm A makes the class <em>JSS1 A</em>. A level with only one class needs no arm. Classes belong to a school year, like the levels they sit at. Open <strong>Academic Structure</strong>, then <strong>Classes &amp; Arms</strong>.</p>
        <GuideChecklist items={[
          "The levels exist on Programmes & Levels for the year you are working in.",
          "The year selector at the foot of the sidebar shows that year.",
          "You know the arms each level runs, such as A, B and C, or Science and Commercial.",
          "You know each class's capacity, if the school caps class sizes.",
        ]} />
      </GuideSection>

      <GuideSection id="generate-arms" title="Generate arms for a level">
        <p>The quickest way to create a level&apos;s classes is to generate them together.</p>
        <GuideSteps>
          <GuideStep title="Open Generate arms">Select <strong>Generate arms</strong> in the toolbar.</GuideStep>
          <GuideStep title="Pick the level">Choose the <strong>Level</strong>. Each option shows its programme beside it.</GuideStep>
          <GuideStep title="List the arms"><strong>Arms</strong> opens with your school&apos;s default arms from <strong>Academic structure</strong> in <strong>Settings</strong>, which are <em>A, B, C</em> until your school sets its own. Edit the list, separating the arms with commas. Names like Science or Commercial work too.</GuideStep>
          <GuideStep title="Choose the branch">When your school runs more than one branch, choose where the classes <strong>Runs at</strong>. A class is normally run by one branch, even where its level is shared.</GuideStep>
          <GuideStep title="Check and create">Under <strong>What will be created</strong>, each class is marked <strong>New</strong> or <strong>Already there</strong>. Classes already there are skipped, so typing <em>A, B, C, D</em> for a level that already has A, B and C creates one class. Select <strong>Create class</strong> or <strong>Create 3 classes</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="add-one-class" title="Add or edit one class">
        <GuideSteps>
          <GuideStep title="Open the form">Select <strong>Add class</strong>, or <strong>Edit</strong> on a class card.</GuideStep>
          <GuideStep title="Pick the level and arm">Search for the <strong>Level</strong>, then type the <strong>Arm or stream</strong>. Leave the arm blank if the level has only one class. The <strong>Class name</strong> and <strong>Code</strong> are built from these as you go, and you can type over either.</GuideStep>
          <GuideStep title="Set the capacity">Enter how many pupils the class takes in <strong>Capacity</strong>. Left blank, the class gets your school&apos;s capacity for a new class, set in Settings under Enrolment, or no limit if the school has not set one.</GuideStep>
          <GuideStep title="Save">Select <strong>Create</strong>, or <strong>Save changes</strong> when editing.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="find-a-class" title="Find a class">
        <p>Search by name, filter by level or status, and switch between <strong>Cards</strong> and <strong>Table</strong>. Each card shows the class&apos;s level and arm, its class teacher (or <em>No class teacher assigned</em>), its subject count and its capacity. The counts above the list show the year&apos;s classes, levels and subjects.</p>
      </GuideSection>

      <GuideSection id="read-class-details" title="Read a class's page">
        <p>Select a card, <strong>View details</strong>, or a table row to open the class. Anyone who can see classes can open this page.</p>
        <GuideSteps>
          <GuideStep title="Summary">Four cards show the <strong>Class teacher</strong>, the number of <strong>Students</strong>, the <strong>Capacity</strong> and the number of <strong>Subjects</strong>.</GuideStep>
          <GuideStep title="Students in this class">Lists the pupils, and loads more as you scroll inside the panel. Select a pupil to open their record, or <strong>Open full register</strong> for the whole list. You need permission to browse student records to see this panel.</GuideStep>
          <GuideStep title="Class teacher">Shows who is responsible for the class. <strong>Assign</strong> or <strong>Change</strong> opens a panel to choose a member of staff, or <strong>Nobody</strong>. Being class teacher is separate from teaching the class.</GuideStep>
          <GuideStep title="Class capacity">Shows how many seats are used and how many remain, or how far the class is over capacity.</GuideStep>
          <GuideStep title="Class information">The level, arm, code and description. Use <strong>Edit class</strong> at the top to change them.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="archive-and-restore" title="Archive and restore">
        <p>Select <strong>Archive</strong> on a class card and confirm with <strong>Archive class</strong>. An archived class stops appearing when anyone picks a class, and its history stays intact.</p>
        <GuideCallout tone="warning" title="Pupils are not moved for you">Archiving a class does not move the pupils in it. Move them to their new class first.</GuideCallout>
        <p>To bring a class back, set the status filter to <strong>Archived</strong> and select <strong>Restore</strong> on its card. An archived class&apos;s page is read-only until it is restored.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There are no levels in view">The form cannot offer a level. Add levels on Programmes &amp; Levels first, or widen the branch selector in the sidebar.</GuideStep>
          <GuideStep title="Add class and Generate arms are greyed out">You are looking at an archived year, which is read-only. Switch to the active year.</GuideStep>
          <GuideStep title="The list is empty for this year">The notice names the year you are looking at. If you may copy structure it offers <strong>Copy from another year</strong>; otherwise switch the year at the foot of the sidebar.</GuideStep>
          <GuideStep title="Students shows Restricted">Your role can see classes but not pupil records. The rest of the page still works.</GuideStep>
          <GuideStep title="Edit is missing on a class">The class is archived, the year is read-only, or the class is school-wide and you work in one branch only.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every level has its classes, each class has the right capacity and a class teacher, and each class page shows the pupils you expect.</GuideCallout>
      </GuideSection>
    </div>
  );
}
