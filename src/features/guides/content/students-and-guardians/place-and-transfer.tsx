import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function PlaceAndTransferArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A student on the roll with no class appears on no register. Open <strong>Classes &amp; Transfers</strong> in the sidebar to place them. The badge on that item counts students still waiting for a class.</p>
        <GuideChecklist items={[
          "Your role lets you assign students to classes.",
          "The classes for the current year exist in Academic Structure, with a capacity where the school sets one.",
          "The branch and year in the sidebar are the ones you mean.",
        ]} />
      </GuideSection>

      <GuideSection id="place-unassigned-students" title="Place students who have no class">
        <GuideSteps>
          <GuideStep title="Open the list">Choose <strong>Unassigned students</strong>. The heading says how many students have no class.</GuideStep>
          <GuideStep title="Pick the students">Tick each student joining the same class. A bar appears saying how many are picked.</GuideStep>
          <GuideStep title="Choose the class">In <strong>Assign into...</strong>, choose the class. Each class shows its seats used, and a line under the bar says what the class will hold after the move. A class belonging to another branch is shown but cannot be chosen.</GuideStep>
          <GuideStep title="Assign">Select <strong>Assign</strong>. Use <strong>Clear</strong> to start the selection again.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Some students may not be placed">If the school refuses some of the batch, a notice lists each student who was not placed and why. Fix the cause, then place them again. Select <strong>Dismiss</strong> to close the notice.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-a-class-register" title="Read a class register">
        <p>Choose <strong>Class roster</strong> and search for a class in <strong>Class</strong>. The page shows its level and a bar of seats used, marked <strong>Full</strong> or <strong>Over by</strong> a number when it has reached or passed its capacity. The register lists each student with their admission number, status and primary guardian. Scroll the list to load more students.</p>
        <p>The class you choose is kept in the page address, so a link to it opens the same register.</p>
      </GuideSection>

      <GuideSection id="move-one-student" title="Move one student">
        <p>You can move a student from three places: <strong>Move out</strong> on the class register, <strong>Change class</strong> on their profile, or <strong>Assign or transfer class</strong> in the directory row menu.</p>
        <GuideSteps>
          <GuideStep title="Choose the destination">In <strong>Destination class</strong>, pick the class. Only classes in the student&apos;s own branch, or open to the whole school, are offered, and always for the year the school is running.</GuideStep>
          <GuideStep title="Give a reason and a date">Choose a <strong>Reason</strong>: Parent request, Stream change, Class balancing, Behaviour, Academic placement or Other. Set the <strong>Effective date</strong>.</GuideStep>
          <GuideStep title="Save">Select <strong>Move student</strong>, or <strong>Assign student</strong> for a student with no class. The move is written to the student&apos;s history with your name against it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="full-classes" title="When a class is full">
        <p>A class at capacity is flagged before you save. What happens next is your school&apos;s choice, set in <strong>Settings</strong> under <strong>Enrolment</strong>:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Usually the school refuses the first save because the class is full, and the button changes to <strong>Move anyway</strong> in the drawer, or <strong>Assign anyway</strong> for a batch. Select it only when the class should run over its limit.</li>
          <li>At a school that never goes over capacity, the move is refused and there is no way past it. The message names the class and its seats, for example <em>JSS1 B holds 2 of 2 seats, and this school does not put classes over capacity.</em> For a batch it says how many more the class has room for. Pick another class, move fewer students, or have the class&apos;s capacity raised in Academic Structure.</li>
          <li>At a school that does not check, nothing stops the move; the register still shows the class as over.</li>
        </ul>
        <GuideCallout tone="warning" title="Over capacity is a decision, not a default">Unless your school has turned the check off, a class shown as over capacity on the register is one somebody chose to fill past its limit.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "A class cannot be chosen", body: "It belongs to a different branch from the students you picked. Pick students from one branch at a time." },
          { title: "The class I want is not listed", body: "A student can only move to a class in the current year, in their own branch or open to the whole school. Check the class in Academic Structure." },
          { title: "The class is at another branch", body: "The student must change branch first. Use Move to another branch on their profile, which also moves their fee account, and choose the class there." },
          { title: "Move out or Assign is missing", body: "Placing and moving students needs the class assignment permission." },
          { title: "Change class is disabled on a profile", body: "You are looking at a past year. Choose the current year in the sidebar to move a student." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Unassigned students says <strong>Every student has a class</strong>, each student you moved shows their class on their profile, and every class over capacity is one you meant to fill.</GuideCallout>
      </GuideSection>
    </div>
  );
}
