import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function BuildClassTimetableArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A class timetable is one class&apos;s week: a grid with the weekdays across and the periods of the bell schedule down. You fill it lesson by lesson, deal with any clashes, and publish it when the week is right. Open <strong>Timetables</strong>, then <strong>Class timetables</strong>.</p>
        <GuideChecklist items={[
          "The classes exist on Classes & Arms.",
          "The bell schedule has its periods for this year.",
          "Subjects are offered at the class's level.",
          "Rooms are added, if you want lessons to have a room.",
          "Teachers carry the teacher role, if you want lessons to have a teacher.",
        ]} />
      </GuideSection>

      <GuideSection id="pick-a-class" title="Pick a class">
        <p>The screen opens on the first class you can see. Use <strong>Timetable for</strong> to search for and pick another class; each one shows how many lessons it has. Beside the picker, a badge shows the timetable&apos;s status, with a count such as <em>12 of 40 teaching periods filled</em>.</p>
      </GuideSection>

      <GuideSection id="add-lessons" title="Add and change lessons">
        <GuideSteps>
          <GuideStep title="Open a slot">Select an empty slot marked <strong>Add</strong>. The <strong>Add lesson</strong> panel names the class, the day and the period.</GuideStep>
          <GuideStep title="Choose the subject">Search for the <strong>Subject</strong>. It is the only field you must fill.</GuideStep>
          <GuideStep title="Choose the teacher">Pick a <strong>Teacher</strong>, or leave it empty to fill in the subjects first and the people later. The list includes teachers who work across branches.</GuideStep>
          <GuideStep title="Choose the room">Pick a <strong>Room</strong>. Only rooms at the class&apos;s branch are offered.</GuideStep>
          <GuideStep title="Save">Select <strong>Add lesson</strong>.</GuideStep>
        </GuideSteps>
        <p>To change a lesson, select it on the grid. The <strong>Edit lesson</strong> panel offers <strong>Save changes</strong>, and <strong>Clear this slot</strong> to empty it.</p>
      </GuideSection>

      <GuideSection id="clashes" title="Clashes">
        <p>A clash is a teacher or a room booked into two places in the same period. The panel checks as you fill it in and, if it finds one, says <em>This clashes with something</em> and names it.</p>
        <GuideSteps>
          <GuideStep title="Change it">Pick a different teacher or room, and the warning clears.</GuideStep>
          <GuideStep title="Or save it anyway">Tick the box confirming you know about the clash. The lesson saves, and both slots stay flagged in red.</GuideStep>
        </GuideSteps>
        <p>Every clash in the week is listed above the grid. Clashes never stop you editing; they only stop you publishing.</p>
      </GuideSection>

      <GuideSection id="duplicate-a-week" title="Copy another class's week">
        <p>Classes at the same level often share most of their week. Build one, then copy it.</p>
        <GuideSteps>
          <GuideStep title="Open the copy">Select <strong>Duplicate from…</strong>.</GuideStep>
          <GuideStep title="Pick the source">Under <strong>Copy from</strong>, choose a class. Only classes that already have lessons are listed.</GuideStep>
          <GuideStep title="Choose what comes across">Tick <strong>Keep the same teachers</strong> to copy teachers as well as subjects; copied teachers may create clashes. Tick <strong>Keep the same rooms</strong> only if you mean it: two classes cannot share a room at the same time.</GuideStep>
          <GuideStep title="Read the preview">Under <strong>What this will do</strong>, check how many lessons are copied, how many already in this class will be replaced, and how many are skipped because this class does not run that period.</GuideStep>
          <GuideStep title="Copy">Select <strong>Copy</strong> followed by the number of lessons.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="publish" title="Publish the timetable">
        <p>Select <strong>Publish</strong> when the week is finished. If anything stops it, such as an unresolved clash, the message says what to fix.</p>
        <GuideCallout tone="info" title="A published timetable can still change">You can keep editing a published week, and editing it does not unpublish it. Another class booking the same teacher can also give it a clash afterwards. When the week is right again, select <strong>Republish</strong>.</GuideCallout>
      </GuideSection>

      <GuideSection id="print-and-clear" title="Print, export or clear">
        <GuideSteps>
          <GuideStep title="Print">Select <strong>Print</strong> for a copy with the class name, year and status at the top, ready for a noticeboard.</GuideStep>
          <GuideStep title="Export">Select <strong>Export</strong> for a spreadsheet, where your role allows exports.</GuideStep>
          <GuideStep title="Clear">Select <strong>Clear</strong> and confirm with <strong>Clear it</strong> to remove every lesson in the class&apos;s week.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Clearing cannot be undone">Every lesson in the week is removed, and a published timetable drops back to draft and needs publishing again.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="No bell schedule yet">The grid has no periods to draw. Select <strong>Set up the bell schedule</strong> and add them.</GuideStep>
          <GuideStep title="No classes yet">Add classes on Classes &amp; Arms first.</GuideStep>
          <GuideStep title="Slots say Free and cannot be selected">You can read timetables but not edit them, the year is archived, or the class is school-wide and you work in one branch only.</GuideStep>
          <GuideStep title="The room you want is not offered">It is inactive, or it is at another branch.</GuideStep>
          <GuideStep title="Publish is refused">Read the message. Resolve the clashes listed above the grid, then publish again.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every class has the lessons you planned, no clashes are listed above any grid, and each timetable is published.</GuideCallout>
      </GuideSection>
    </div>
  );
}
