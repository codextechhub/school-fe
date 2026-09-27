import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function PromoteStudentsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A promotion moves every student on the roll from the running school year into the next one. Each student goes up, repeats, graduates or is held, and nothing is written until the last step. Open <strong>Promotion</strong> in the sidebar.</p>
        <GuideChecklist items={[
          "Your role lets you promote students and assign students to classes. Both are needed to run a promotion.",
          "Next year exists in Academic Structure and has not started yet.",
          "This year's classes have been copied into next year.",
          "Each level has its promotion target set, and the final level is marked as the one students graduate from.",
          "You have agreed with your school which students repeat or are held.",
        ]} />
        <GuideCallout tone="info" title="One branch or the whole school">When you work in one branch, only that branch&apos;s students are promoted and the page shows the branch name. Choose All branches in the sidebar to promote the whole school in one run.</GuideCallout>
      </GuideSection>

      <GuideSection id="choose-the-year" title="Choose the year to promote into">
        <GuideSteps>
          <GuideStep title="Pick the year">Under <strong>Sessions</strong>, <strong>From</strong> shows the running year. In <strong>Into</strong>, choose the year to move students into.</GuideStep>
          <GuideStep title="Check the level mapping">The <strong>Level mapping</strong> lists each class and where it goes. A final level is marked <strong>Terminal</strong> and shows <strong>Graduates</strong>. A class with nowhere to go is shown in amber with the reason, such as <strong>No class there yet</strong> or <strong>No target set for this level</strong>.</GuideStep>
          <GuideStep title="Go on">Under the mapping, a line says how many students are candidates. Select <strong>Review students</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="review-students" title="Review students">
        <p>Students are grouped by class. Open a class to see each student and choose <strong>Promote</strong>, <strong>Repeat</strong>, <strong>Graduate</strong> or <strong>Hold</strong> for them. To set a whole class at once, use <strong>All up</strong> (or <strong>All graduate</strong> for a final class) and <strong>All held</strong>.</p>
        <p>Filter the review to one class with the class selector. The line beside it keeps a running count of students promoted, repeating, graduating and held.</p>
        <GuideCallout tone="info" title="Hold is not repeat">A held student stays where they are and is not moved into next year. A student who repeats moves into next year in a class at the same level.</GuideCallout>
      </GuideSection>

      <GuideSection id="handle-exceptions" title="Handle exceptions">
        <p>The exceptions panel lists anything that cannot simply move up. A cause that affects a whole class appears once, with a link to fix it:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Set its promotion target</strong> opens the levels in Academic Structure.</li>
          <li><strong>Add the class</strong> opens the classes in Academic Structure, to create the class the students need next year.</li>
        </ul>
        <p>A student needing their own decision has a row with <strong>Open</strong> and their name, which takes you to their profile. After fixing a cause, come back and select <strong>Preview and confirm</strong> to recalculate.</p>
      </GuideSection>

      <GuideSection id="confirm-and-run" title="Confirm and run">
        <GuideSteps>
          <GuideStep title="Preview">Select <strong>Preview and confirm</strong>. The school recalculates the plan with your choices.</GuideStep>
          <GuideStep title="Read the totals">Under <strong>Confirm this promotion</strong>, check the Promote, Repeat, Graduate and Hold counts and the sentence saying how many students move and how many stay.</GuideStep>
          <GuideStep title="Run it">Select <strong>Run promotion</strong>, read the confirmation, and select <strong>Run promotion</strong> again.</GuideStep>
          <GuideStep title="Read the result">The page shows <strong>Promotion complete</strong> with the numbers promoted, repeated, graduated and held, and how many could not be written. Every move is recorded in each student&apos;s history.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="A promotion cannot be undone from here">It moves every student in one action, and graduates leave the roll. Run it once, after every exception is settled.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "There is no year to promote into", body: "Next year has not been created, or it has already started. Select Go to Sessions, create the year, copy this year's classes into it, and come back." },
          { title: "Every student would be held", body: "Next year has no classes yet. Copy this year's classes forward in Academic Structure first." },
          { title: "Run promotion is missing", body: "Running a promotion needs both the promotion and the class assignment permissions. The page says so where the button would be." },
          { title: "Some students could not be written", body: "They were left where they are. Open each one from the directory, fix the cause, and place them with Classes & Transfers." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Promotion complete shows no failed students, and next year&apos;s classes in the Student Directory hold the students you expected.</GuideCallout>
      </GuideSection>
    </div>
  );
}
