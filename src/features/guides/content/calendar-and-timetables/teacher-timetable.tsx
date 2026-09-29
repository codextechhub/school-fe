import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function TeacherTimetableArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A teacher&apos;s timetable is read from the class timetables: every lesson that names the teacher, on every class&apos;s grid, gathered into one week. It is read-only, because the lessons live on the class grids. Open <strong>Timetables</strong>, then <strong>Teacher timetables</strong>.</p>
        <GuideChecklist items={[
          "Class timetables have lessons with teachers on them.",
          "The year selector at the foot of the sidebar shows the year you want.",
        ]} />
      </GuideSection>

      <GuideSection id="pick-a-teacher" title="Pick a teacher">
        <p>The screen opens on the first teacher in the list. Use <strong>Timetable for</strong> to search for and pick someone else. Each name shows how many lessons they hold, and <em>has a clash</em> where they are double-booked.</p>
        <p>The list follows the branch selector in the sidebar, so a branch administrator sees their own branch&apos;s staff. The week itself always shows every branch the teacher works at.</p>
      </GuideSection>

      <GuideSection id="read-the-week" title="Read the week">
        <GuideSteps>
          <GuideStep title="The figures">Cards show the teacher&apos;s <strong>Teaching periods</strong>, <strong>Free periods</strong> and <strong>Busiest day</strong>. A teacher who works at more than one branch also gets a <strong>Branches</strong> card naming them.</GuideStep>
          <GuideStep title="The grid">The columns are your school&apos;s teaching days. Each filled slot shows the subject and the class, with the room and branch where there is one. Empty slots read <strong>Free</strong>.</GuideStep>
          <GuideStep title="Go to the lesson">Select a lesson to open that class&apos;s timetable, where it can be changed.</GuideStep>
        </GuideSteps>
        <p>A day the school no longer teaches shows as a greyed column headed <strong>Not a teaching day</strong> while the teacher still has a lesson on it. The note above the grid says to move or remove those lessons on the class timetables: their classes cannot be published until then.</p>
        <GuideCallout tone="info" title="Nothing on the week yet">If the teacher holds no lessons this year, the page says so. Their week fills in as classes are timetabled.</GuideCallout>
      </GuideSection>

      <GuideSection id="clashes" title="Clashes">
        <p>When the teacher is booked into two classes in the same period, the clashes are listed above the grid. A lesson the teacher does not have in Teaching duties is not a clash, and is not listed here: the class timetable&apos;s publish check shows it. A slot can show only one lesson, so a line under that list explains when the teacher holds more lessons than the grid can draw.</p>
        <p>Fix a clash on the class timetable the lesson belongs to. Select the lesson, or use <strong>Edit a class timetable</strong> at the foot of the page.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="Nobody carries the teacher role yet">The list is built from staff who hold the teacher role. Somebody with access to roles needs to grant it first.</GuideStep>
          <GuideStep title="A teacher is missing from the list">Check the branch selector in the sidebar, and that they carry the teacher role.</GuideStep>
          <GuideStep title="I cannot change anything here">That is expected. Edit the lesson on its class timetable instead.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You can use this view when">You can pick a teacher, read their free periods and busiest day, and jump from any lesson to the class timetable it belongs to.</GuideCallout>
      </GuideSection>
    </div>
  );
}
