import { GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function LessonRegistersArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A lesson register is a register for one lesson of one class on one day, taken by the teacher of that lesson. It exists only where your school has switched lesson marking on for the class&apos;s level.</p>
        <GuideChecklist items={[
          "Lesson marking is on for the level, in Settings under Attendance.",
          "The class's timetable is published, and the lesson falls on the day.",
        ]} />
      </GuideSection>

      <GuideSection id="open-a-lesson" title="Open a lesson">
        <GuideSteps>
          <GuideStep title="If you teach it">Your lessons for the day are under <strong>My registers</strong> on Attendance, Today. Select one to open it.</GuideStep>
          <GuideStep title="If you take any class's register">Open <strong>Attendance</strong>, then <strong>Lesson registers</strong>, to see the day&apos;s summary and every scheduled lesson. Search by class, subject or teacher, or use All, Needs action and Submitted. Select a lesson to preview its progress and first students, then open the full register to mark it. Use the date to open an earlier day.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="mark-the-lesson" title="Mark the lesson">
        <p>Each child has three buttons: <strong>P</strong> present, <strong>L</strong> late (with the time they arrived) and <strong>A</strong> absent. There is no Excused in a lesson. Beside each child is their mark from the morning register, or &quot;Not taken&quot; when that register is not in yet.</p>
        <p><strong>Everyone else present</strong> fills the rows not yet marked. <strong>Submit register</strong> works once every row is marked, and sends nothing to anyone. Until the register closes, rows can still be changed; after that the lesson&apos;s marks are final, and there is no correction request for a lesson.</p>
      </GuideSection>

      <GuideSection id="missed-a-lesson" title="In school, missed a lesson">
        <p>A child marked present or late in the morning and absent from a submitted lesson register is listed on the Today screen under <strong>In school this morning, missed a lesson</strong>, on the student&apos;s Attendance tab, and in the reports. Both marks stand, and a missed lesson is never counted as an absence for the day.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="This lesson has no register to show">The level does not mark lessons, the timetable is not published, or the lesson is not on that day. The page says which.</GuideStep>
          <GuideStep title="The buttons are missing">The lesson is another teacher&apos;s, or its register has closed.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
