import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ScheduleExamsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>An exam timetable is a set of papers placed inside an exam period on the school calendar. Each paper is one class sitting one subject, on a date, in the morning or afternoon sitting, with a room and an invigilator if you have them. Open <strong>Timetables</strong>, then <strong>Exam scheduling</strong>.</p>
        <GuideChecklist items={[
          "An event of type Exam period is dated on the calendar for this year.",
          "The classes and subjects being examined exist.",
          "Rooms are added, if papers need a room.",
          "Staff who invigilate carry the teacher role.",
        ]} />
        <GuideCallout tone="info" title="Not every plan includes exams">Exam scheduling appears in the Timetables menu only when your school&apos;s plan includes it.</GuideCallout>
      </GuideSection>

      <GuideSection id="start-with-an-exam-period" title="Start with an exam period">
        <p>The exam period&apos;s dates, year and branch come from its calendar event, so there is nowhere to put a paper until one exists. If the screen says <strong>No exam period yet</strong>, select <strong>Add an exam period</strong>, add an event with the type <strong>Exam period</strong>, and come back.</p>
        <p>With one exam period, its name, dates and status appear at the top. With more than one, pick the period under <strong>Exam period</strong>.</p>
      </GuideSection>

      <GuideSection id="add-papers" title="Add papers">
        <GuideSteps>
          <GuideStep title="Open the form">Select <strong>Add paper</strong>. On the board, you can also select <strong>Add a paper</strong> in an empty sitting to start with its date and sitting filled in.</GuideStep>
          <GuideStep title="Class and subject">Choose the <strong>Class</strong> and the <strong>Subject</strong>. Only classes you may change are offered.</GuideStep>
          <GuideStep title="Date and sitting">Choose the <strong>Date</strong>, which must fall inside the exam period, and the <strong>Sitting</strong>: Morning or Afternoon.</GuideStep>
          <GuideStep title="Room and invigilator">Pick a <strong>Room</strong> and an <strong>Invigilator</strong> if you have them. Invigilators can come from any branch.</GuideStep>
          <GuideStep title="Times">Set a <strong>Start time</strong> and <strong>End time</strong> if you publish exact times. They are optional.</GuideStep>
          <GuideStep title="Save">Select <strong>Add paper</strong>.</GuideStep>
        </GuideSteps>
        <p>To change a paper, select it, or choose <strong>Edit</strong> from its row menu. <strong>Remove paper</strong> takes it off the timetable.</p>
      </GuideSection>

      <GuideSection id="clashes-and-refusals" title="Clashes and refusals">
        <p>The form checks the paper against the rest of the timetable as you fill it in. Two rules apply, and they work differently:</p>
        <GuideSteps>
          <GuideStep title="Refused">A class sitting two papers at once is impossible, so it cannot be saved. Change the date or sitting.</GuideStep>
          <GuideStep title="Warned">A room used twice, or one invigilator in two rooms, can be real: two classes can sit in one hall. Tick the box to confirm you know, and the paper saves.</GuideStep>
        </GuideSteps>
        <p>Every clash in the timetable is listed at the top. Clashes save, but they block publishing until they are resolved.</p>
      </GuideSection>

      <GuideSection id="board-and-list" title="Board, list and filters">
        <p>Switch between <strong>List</strong>, a table with the date, sitting, class, subject, room and invigilator of every paper, and <strong>Board</strong>, which lays the papers out by day and sitting. Papers in a clash are marked on the board.</p>
        <p>Use <strong>Filter</strong> to narrow by class, subject, room, invigilator or sitting. When there are clashes, <strong>Clashing papers</strong> shows only the papers involved. The count reads, for example, <em>Showing 6 of 40 papers</em>.</p>
      </GuideSection>

      <GuideSection id="publish-and-print" title="Publish and print">
        <p>Select <strong>Publish</strong> when every paper is placed and no clashes remain. If anything stops it, the message says what to fix.</p>
        <GuideCallout tone="danger" title="Publishing is final">Once published, the exam timetable can no longer be changed. Papers cannot be added, edited or removed, so check it carefully first.</GuideCallout>
        <p><strong>Print</strong> prints the list with the exam period&apos;s name and dates at the top, whichever view you are on. <strong>Export</strong> gives a spreadsheet, where your role allows exports.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="No exam period yet">Add an Exam period event on the calendar first.</GuideStep>
          <GuideStep title="Add paper is greyed out">The timetable is published, the year is archived, or your role cannot add timetable entries.</GuideStep>
          <GuideStep title="The date is refused">It falls outside the exam period. Change the date, or the exam period&apos;s dates on the calendar.</GuideStep>
          <GuideStep title="Save stays grey">The form has found a refusal, or a clash you have not confirmed. Both are explained directly above the button.</GuideStep>
          <GuideStep title="An exam period cannot be removed from the calendar">It still has papers scheduled inside it. Remove the papers first.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every class has a paper for each subject it sits, no clashes are listed, and the exam period reads Published.</GuideCallout>
      </GuideSection>
    </div>
  );
}
