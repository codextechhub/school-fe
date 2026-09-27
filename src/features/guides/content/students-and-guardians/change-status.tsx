import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function ChangeStudentStatusArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A student&apos;s status says where they stand with the school: Applicant, Enrolled, Active, Suspended, Graduated, Transferred, Withdrawn or Rejected. A status is not tied to a year. Changing it is written to the student&apos;s history.</p>
        <GuideChecklist items={[
          "Your role lets you change a student's status.",
          "You know the reason for the change and the date it takes effect.",
          "For a transfer to another school, you know the name of that school.",
        ]} />
        <GuideCallout tone="info" title="Applicants have their own screen">To admit an applicant or close an application, use Applicants. Change status is for students already on the roll.</GuideCallout>
      </GuideSection>

      <GuideSection id="open-change-status" title="Open Change status">
        <p>On the student&apos;s profile, select <strong>Change status</strong> under the header. From the Student Directory, open the row menu and choose <strong>Change status</strong>. The drawer names the student&apos;s current status.</p>
      </GuideSection>

      <GuideSection id="choose-the-move" title="Choose the move and give a reason">
        <GuideSteps>
          <GuideStep title="Choose where they move">Under <strong>Move to</strong>, only the moves allowed from the current status are listed. Pick one. A short note under it explains what the move does, for example whether the student leaves the roll.</GuideStep>
          <GuideStep title="Say why">Write the <strong>Reason</strong>. It is required and kept on the record.</GuideStep>
          <GuideStep title="Set the date">Set <strong>Effective from</strong>. It starts on today.</GuideStep>
          <GuideStep title="Name the destination school">When the move needs one, fill <strong>Destination school</strong>. It is kept on the record for reference.</GuideStep>
          <GuideStep title="Save">Select <strong>Save status</strong>. A move that takes a child off the roll or off attendance, such as withdrawing, suspending or transferring, shows <strong>Continue</strong> instead and asks you to confirm before it saves.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Check the student before you confirm">Withdrawing or transferring the wrong child removes them from registers and class lists. Read the name in the confirmation before you select the final button.</GuideCallout>
      </GuideSection>

      <GuideSection id="final-statuses" title="Statuses that cannot be left">
        <p>Some statuses are final. For a graduated or transferred student, the drawer says the status is final and offers nothing to move to. On the profile, a student outside the usual Applicant, Enrolled, Active path shows a sentence saying so instead of the progress steps.</p>
        <p>Graduating a whole class is done by running a promotion at the end of the year rather than one student at a time.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Change status is missing", body: "Changing a status needs its own permission. Ask whoever manages roles at your school." },
          { title: "The status I want is not offered", body: "The school only allows certain moves from each status. Move the student through an allowed status first, or ask why the move is not allowed." },
          { title: "Save status stays disabled", body: "Pick a move, write a reason and set a date. A move that leaves for another school also needs the destination school." },
          { title: "The change was refused", body: "The message explains why. The record is unchanged, so correct the cause and try again." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The profile shows the status you chose and the History tab has an entry for the change.</GuideCallout>
      </GuideSection>
    </div>
  );
}
