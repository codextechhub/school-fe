import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function MoveToAnotherBranchArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>When a family moves and their child starts attending another branch of the school, move the student from their profile. The student, their class and their fee account move together, so the new branch&apos;s bursar collects what is owed from the day of the move.</p>
        <GuideChecklist items={[
          "Your school has more than one branch. With one branch there is nowhere to move a student, and the action is not shown.",
          "Your role lets you move students between branches, and you work at both the branch the student leaves and the one they join.",
          "The student is on the roll. A withdrawn, transferred or graduated student cannot change branch.",
          "The class they join at the new branch exists for the current year.",
        ]} />
      </GuideSection>

      <GuideSection id="move-a-student" title="Move a student">
        <GuideSteps>
          <GuideStep title="Open the profile">Find the student and open their profile. Select <strong>Move to another branch</strong>.</GuideStep>
          <GuideStep title="Choose the branch">In <strong>Branch</strong>, pick where the student now attends. Only branches you work at are offered. With one other branch, it is chosen for you.</GuideStep>
          <GuideStep title="Choose the class">In <strong>Class</strong>, pick the class the student joins at that branch. A student in a class of their old branch must be given one. A student in a class every branch shares may keep it, and a student with no class may stay unplaced.</GuideStep>
          <GuideStep title="Set the day and the reason">In <strong>Moves on</strong>, set the day the student starts at the new branch: today, or an earlier day if the move is recorded late. Write the <strong>Reason</strong>, for example <em>Family moved to Lekki</em>.</GuideStep>
          <GuideStep title="Check what moves, then move">Read the panel at the bottom, then select <strong>Move pupil</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="what-moves-with-the-fees" title="What moves with the fees">
        <p>Before you move the student the drawer shows what will move from the old branch to the new one:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>each <strong>open bill</strong>, which the new branch now collects;</li>
          <li>the student&apos;s <strong>unspent credit</strong>, which the new branch now holds;</li>
          <li>the <strong>fees not yet earned</strong>, for the weeks still to be taught, which the new branch now earns.</li>
        </ul>
        <p>Income the old branch already earned stays in its books. The new branch owes the old one for it, and the drawer names the amount, for example <em>Lekki will owe Ikeja ₦30,000.00 for the fees Ikeja already earned</em>. The two branches settle it later as an inter-branch transfer.</p>
        <GuideCallout tone="info" title="Amounts need a finance role">The amounts are shown only to staff whose role reads bills. Anybody else sees how many bills move, without the figures.</GuideCallout>
      </GuideSection>

      <GuideSection id="after-the-move" title="After the move">
        <p>The profile shows the new branch and class, and the <strong>History</strong> tab records the move with your name against it. In Finance the move is an inter-branch transfer, numbered in the drawer after the move.</p>
        <GuideCallout tone="warning" title="Moving back is a second move">A move is not undone from the profile. If a student was moved by mistake, move them back: whatever is still open moves back with them. Finance can void the money part of a move only while nothing it moved has been paid, credited or released at the new branch.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Move to another branch is missing", body: "Your school has one branch, the student is not on the roll, you are looking at a past year, or your role cannot move students between branches." },
          { title: "No branch is offered", body: "Moving a student needs somebody who works at both branches. Ask an administrator who covers the whole school." },
          { title: "The month is closed", body: "One of the two branches has closed its books for the month of the move. Nothing moved. Ask Finance to reopen the month, or move the student on a day in an open month." },
          { title: "The class is full", body: "Your school's capacity rule applies as it does to any class move. Choose another class, or select Move anyway where your school allows it." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The profile shows the new branch and class, the History tab shows the move, and the new branch&apos;s bursar finds the student&apos;s open bills on their list.</GuideCallout>
      </GuideSection>
    </div>
  );
}
