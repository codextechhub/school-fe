import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function BuildClassTimetableArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A class timetable is one class&apos;s week: a grid with your school&apos;s teaching days across and the periods of the bell schedule down. You fill it lesson by lesson, deal with any clashes, and publish it when the week is right. Open <strong>Timetables</strong>, then <strong>Class timetables</strong>.</p>
        <GuideChecklist items={[
          "The classes exist on Classes & Arms.",
          "The bell schedule has its periods for this year.",
          "Subjects are offered at the class's level.",
          "Rooms are added, if you want lessons to have a room.",
          "Teachers carry the teacher role, if you want lessons to have a teacher.",
          "If your school checks Teaching duties, each teacher has the class and subject in Teaching duties.",
        ]} />
        <GuideCallout tone="info" title="Your school's own rules">The teaching days, whether a lesson needs a room before publishing, and whether a teacher must have the lesson in Teaching duties are set in <strong>Settings</strong> under <strong>Academics</strong>, <strong>Calendar and timetables</strong>.</GuideCallout>
      </GuideSection>

      <GuideSection id="pick-a-class" title="Pick a class">
        <p>The screen opens on the first class you can see. Use <strong>Timetable for</strong> to search for and pick another class; each one shows how many lessons it has. Beside the picker, a badge shows the timetable&apos;s status, with a count such as <em>12 of 40 teaching periods filled</em>.</p>
      </GuideSection>

      <GuideSection id="add-lessons" title="Add and change lessons">
        <GuideSteps>
          <GuideStep title="Open a slot">Select an empty slot marked <strong>Add</strong>. The <strong>Add lesson</strong> panel names the class, the day and the period.</GuideStep>
          <GuideStep title="Choose the subject">Search for the <strong>Subject</strong>. It is the only field you must fill.</GuideStep>
          <GuideStep title="Choose the teacher">Pick a <strong>Teacher</strong>, or leave it empty to fill in the subjects first and the people later. The list includes teachers who work across branches. If your school checks Teaching duties and the teacher does not have that class and subject there, a note under the field names them, such as <em>Tunde Okeke has no teaching duty for JSS1 A Mathematics.</em> Under Warn the lesson still saves and the publish check lists it. Under Refuse it is refused, and the message names a colleague who has the duty where there is one.</GuideStep>
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

      <GuideSection id="day-not-taught" title="A day the school no longer teaches">
        <p>When your school stops teaching a day that still holds lessons, such as Saturday, the grid keeps that day as an extra, greyed column headed <strong>Not a teaching day</strong>. A note above the grid names it: <strong>Not a teaching day: Saturday. Move or remove these lessons: publishing waits until they are gone, and they still count in clashes.</strong> Its empty slots read <strong>Not taught</strong> and cannot be selected, because no lesson can be added on that day.</p>
        <p>Select each lesson on it and use <strong>Clear this slot</strong>, then add it again on a day the school teaches. Once the last one is gone, the column goes too.</p>
      </GuideSection>

      <GuideSection id="duplicate-a-week" title="Copy another class's week">
        <p>Classes at the same level often share most of their week. Build one, then copy it.</p>
        <GuideSteps>
          <GuideStep title="Open the copy">Select <strong>Duplicate from…</strong>.</GuideStep>
          <GuideStep title="Pick the source">Under <strong>Copy from</strong>, choose a class. Only classes that already have lessons are listed.</GuideStep>
          <GuideStep title="Choose what comes across">Tick <strong>Keep the same teachers</strong> to copy teachers as well as subjects; copied teachers may create clashes. Tick <strong>Keep the same rooms</strong> only if you mean it: two classes cannot share a room at the same time.</GuideStep>
          <GuideStep title="Read the preview">Under <strong>What this will do</strong>, check how many lessons are copied, how many already in this class will be replaced, and how many are skipped because this class does not run that period or the school no longer teaches that day. If your school checks Teaching duties, the preview also names each copied teacher who does not have the lesson there. Under Warn the copy goes ahead. Under Refuse, with <strong>Keep the same teachers</strong> ticked, it says the copy will be refused: untick it, or give the teachers the duties first.</GuideStep>
          <GuideStep title="Copy">Select <strong>Copy</strong> followed by the number of lessons.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="publish" title="Publish the timetable">
        <p>Above the grid, the publish check lists what stands between the week and publishing it. It is headed <strong>Before you publish</strong> when everything in it is only worth knowing, and <strong>Not ready to publish</strong> when something in it blocks publishing.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Lessons not ready, under a count such as <strong>2 lessons are not ready</strong>: each lesson with no teacher, such as <em>Monday · Period 1 · Mathematics: needs a teacher</em>. A lesson with no room is listed as well when your school requires a room before publishing. These always block.</li>
          <li>Teaching-duty mismatches, under a count such as <strong>1 lesson&apos;s teacher does not have it in Teaching duties</strong>: each lesson whose teacher does not have that class and subject there, such as <em>JSS1 A · Mathematics · Tunde Okeke</em>. Under Warn they are listed and publishing still goes ahead. Under Refuse they block until each has the duty or a different teacher. Under Don&apos;t check they are not listed.</li>
          <li>Lessons on a day the school no longer teaches, one line each, such as <strong>Saturday is not a teaching day: move or remove JSS1 A&apos;s Mathematics</strong>. These always block.</li>
        </ul>
        <p>Select <strong>Publish</strong> when the week is finished. If anything stops it, the message says what to fix and the publish check shows it. Publishing checks, in this order, for lessons missing a teacher or a room, lessons on a day the school no longer teaches, teaching-duty mismatches under Refuse, and clashes, and names the first it finds. For example: <strong>JSS1 A has 1 lesson on Saturday, which is not a teaching day. Move or remove it on the timetable, and publish again.</strong> Under Warn, a week that publishes with teaching-duty mismatches lists each one as it publishes.</p>
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
          <GuideStep title="Publish is refused">Read the message and the publish check above the grid. Give each lesson a teacher, and a room if your school requires one, resolve the clashes, deal with any teaching-duty mismatch under Refuse, and move any lesson on a day the school no longer teaches. Then publish again.</GuideStep>
          <GuideStep title="A teacher is refused for a lesson">Your school only allows a teacher who has the class and subject in Teaching duties. Choose the colleague the message names, or give the teacher the duty on Teaching duties first.</GuideStep>
          <GuideStep title="Saturday slots read Not taught">Saturday is not one of your school&apos;s teaching days. The column shows only because a lesson is still on it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every class has the lessons you planned, no clashes are listed above any grid, the publish check shows nothing that blocks, and each timetable is published.</GuideCallout>
      </GuideSection>
    </div>
  );
}
