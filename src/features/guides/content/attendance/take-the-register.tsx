import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function TakeTheRegisterArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A class teacher takes the register of the class they lead. An administrator can take any class&apos;s register in their branches, for example when the class teacher is away.</p>
        <GuideChecklist items={[
          "The class has students placed in it.",
          "At a school with several branches, the class has a branch.",
          "The day is a school day. A closed day has no register.",
        ]} />
      </GuideSection>

      <GuideSection id="open-a-register" title="Open a register">
        <GuideSteps>
          <GuideStep title="From Today">A teacher selects their class under <strong>My registers</strong>. An administrator selects <strong>Take register</strong> beside a class under <strong>Not yet taken</strong>.</GuideStep>
          <GuideStep title="From Class registers">Open <strong>Attendance</strong>, then <strong>Class registers</strong>, to see every class with where its register stands, and open any of them, including one already submitted.</GuideStep>
          <GuideStep title="Another day">Use the date at the top of the register or the list to open an earlier day. A day that has not come yet cannot be chosen.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="mark-each-child" title="Mark each child">
        <p>Each child has four buttons: <strong>P</strong> present, <strong>L</strong> late, <strong>A</strong> absent and <strong>E</strong> excused. Present and absent are saved as soon as you press them.</p>
        <GuideSteps>
          <GuideStep title="Late">Asks for the arrival time. It starts at the time you pressed the button, so a child marked as they walk in needs nothing more. Late counts as present and is counted on its own as well.</GuideStep>
          <GuideStep title="Excused">Asks for one of the school&apos;s reasons. A reason such as Other also needs a note saying what happened.</GuideStep>
          <GuideStep title="Everyone else present">Marks every child not yet marked as present, and leaves the marks you made alone. It does not submit the register.</GuideStep>
        </GuideSteps>
        <p>A suspended child is listed but locked, and is counted nowhere.</p>
      </GuideSection>

      <GuideSection id="submit" title="Submit the register">
        <p>The bar at the foot of the register counts the rows still unmarked and says how many guardians will be emailed. <strong>Submit register</strong> works once every row is marked, and asks you to confirm.</p>
        <GuideCallout tone="warning" title="Emails cannot be taken back">When you submit, the primary guardian of each absent child is emailed straight away, once per child per day. Late and Excused send nothing.</GuideCallout>
      </GuideSection>

      <GuideSection id="change-a-row" title="Change a row after submitting">
        <p>Until the register closes, the person who submitted it, or an administrator who can take any class&apos;s register, can still change a row by pressing another mark. Every change is kept under <strong>Changes to this register</strong>. A change away from Absent emails the guardian who was told, to say the mark was corrected.</p>
      </GuideSection>

      <GuideSection id="request-a-correction" title="Ask for a correction">
        <p>Once the register has closed, the marks are read-only. Select <strong>Request correction</strong> beside the child, choose the mark it should be, a reason and, for Late, the time the child arrived, then <strong>Send request</strong>. The mark changes only if an attendance administrator approves it, and the original mark is kept either way.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="The buttons are missing">You are reading a class you do not lead, or your role cannot take registers. A closed register shows marks as read-only.</GuideStep>
          <GuideStep title="Submit register stays grey">A row is still unmarked. The bar says how many.</GuideStep>
          <GuideStep title="No register to take">Nobody is placed in the class on that day.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
