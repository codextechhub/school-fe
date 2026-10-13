import { GuideCallout, GuideSection } from "../../article-components";

export default function AttendanceSettingsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open <strong>Settings</strong>, then <strong>Attendance</strong> under Academics. These rules bind every branch, so only an administrator who covers the whole school can change them. A change applies from now on: marks already taken and emails already sent are not touched.</p>
      </GuideSection>

      <GuideSection id="lesson-marking" title="Lesson marking">
        <p>A switch per level. On, each class in the level also has a register for every lesson on its published timetable, and a child present in the morning but absent from a lesson is listed as having missed it. Off, a class has one register a day. A level switched on with no published timetable has nothing to mark yet.</p>
      </GuideSection>

      <GuideSection id="guardian-notices" title="Guardian notices">
        <p>On, the primary guardian of each absent child is emailed when the register is submitted, once per child per day. Late and Excused send nothing. Off, submitting sends nothing to anyone.</p>
      </GuideSection>

      <GuideSection id="rules" title="The threshold and the edit window">
        <p><strong>Chronic-absence threshold</strong> is the rate, from 50 to 100 percent, below which a student appears on the chronic-absence list in Attendance reports. <strong>Days a register stays open to changes</strong> is how long, after its date, the person who submitted a register can still change a row; 0 means the same day only. After that, a change is a correction request.</p>
      </GuideSection>

      <GuideSection id="reasons" title="Reasons for excused absences">
        <p>Your school&apos;s own list, offered when a child is marked Excused. <strong>Add a reason</strong> asks for its name and whether choosing it needs a note. <strong>Retire</strong> stops a reason being offered, and it stays on the marks that used it; <strong>Restore</strong> brings it back. Retiring and restoring take effect straight away.</p>
        <GuideCallout tone="info" title="The last reason">The school always keeps at least one reason in use, so the last one cannot be retired.</GuideCallout>
      </GuideSection>
    </div>
  );
}
