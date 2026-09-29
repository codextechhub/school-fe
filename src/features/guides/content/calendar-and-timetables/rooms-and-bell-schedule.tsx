import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function RoomsAndBellScheduleArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Timetables are built on two things. <strong>Rooms</strong> are the places lessons and exams happen, and they are what lets the system notice two classes booked into one place. The <strong>Bell schedule</strong> is the set of periods in a school day, and every class and teacher timetable is drawn on it. Both are under <strong>Timetables</strong> in the sidebar.</p>
        <GuideChecklist items={[
          "You have a list of rooms, with their type and capacity, for each branch.",
          "You know the start and end time of every period, break and assembly.",
          "You know whether any weekday runs a different day, such as a short Friday.",
          "The year selector at the foot of the sidebar shows the year you are setting up.",
        ]} />
        <GuideCallout tone="info" title="What follows the year">A room stays on file from year to year. The bell schedule belongs to the school year you are looking at, and a new year can start from an earlier year&apos;s.</GuideCallout>
        <p>The weekdays offered are your school&apos;s teaching days, set in <strong>Settings</strong> under <strong>Academics</strong>, <strong>Calendar and timetables</strong>. Until the school chooses, they are Monday to Friday.</p>
      </GuideSection>

      <GuideSection id="add-a-room" title="Add a room">
        <GuideSteps>
          <GuideStep title="Open the form">On <strong>Rooms</strong>, select <strong>Add room</strong>.</GuideStep>
          <GuideStep title="Name it">Type the <strong>Name</strong>, for example <em>Science Laboratory</em>. A <strong>Code</strong> such as LAB-01 is optional, and must be unique across the school.</GuideStep>
          <GuideStep title="Choose the type">Pick a <strong>Room type</strong>: Classroom, Laboratory, Hall, Library, Sports or Other.</GuideStep>
          <GuideStep title="Set the capacity">Enter a <strong>Capacity</strong> if you know it. It is guidance for scheduling and is not enforced.</GuideStep>
          <GuideStep title="Choose the branch">When your school runs more than one branch, choose the branch the room is at. A room is a physical place, so it belongs to one branch; the same room name at another branch is fine.</GuideStep>
          <GuideStep title="Save">Leave <strong>Active room</strong> ticked and select <strong>Save room</strong>.</GuideStep>
        </GuideSteps>
        <p>Each room card shows its type, capacity, branch and <strong>Scheduled use</strong>. Switch to <strong>List</strong> for a table, and filter by type or status.</p>
      </GuideSection>

      <GuideSection id="manage-rooms" title="Deactivate or delete a room">
        <p>A room&apos;s menu offers two different controls:</p>
        <GuideSteps>
          <GuideStep title="Deactivate">Takes the room out of use. It stops being offered when anyone picks a room, and every lesson and paper already in it stays where it is. Use this for a room closed for repairs. <strong>Activate</strong> brings it back.</GuideStep>
          <GuideStep title="Delete">Removes the room for good, and is only possible when nothing is scheduled in it. Use this for a room added by mistake. Confirm with <strong>Delete room</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="A room in use cannot be deleted">If any lesson or exam paper sits in the room, the delete is refused. Deactivate it instead.</GuideCallout>
      </GuideSection>

      <GuideSection id="copy-from-an-earlier-year" title="Start from an earlier year's bell schedule">
        <p>A school day rarely changes between years. While the year you are looking at has no periods, <strong>Bell schedule</strong> offers the most recent earlier year that has some, in a panel such as <strong>Start from 2025/2026</strong>. What it copies depends on where you work:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>At a school with one branch, every period, such as <em>2025/2026 has 12 periods.</em></li>
          <li>Across the whole school, every branch&apos;s periods at once, such as <em>2025/2026 has 12 periods across every branch, school-wide ones included.</em> The offer is made with <strong>All branches</strong> chosen in the branch picker. Looking at one branch, you see a line saying so instead of a button.</li>
          <li>In one branch, only your branch&apos;s periods, such as <em>2025/2026 has 6 periods at your branch.</em> The school&apos;s shared periods are copied by a school-wide administrator. Somebody who works in several branches copies all of theirs at once, with <strong>All my branches</strong> chosen in the branch picker.</li>
        </ul>
        <GuideSteps>
          <GuideStep title="Copy">Select <strong>Copy from 2025/2026</strong>. The confirmation says how many periods are added, with the same times, types and days, that any set for a day the school no longer teaches is left out, and that the earlier year is not changed.</GuideStep>
          <GuideStep title="Confirm">Select <strong>Copy</strong>. The periods appear straight away, with a note such as <strong>5 periods copied from 2025/2026 into 2026/2027.</strong> Change anything that differs this year as you would any period.</GuideStep>
        </GuideSteps>
        <p>An every-day period is always copied. A period set for one weekday the school no longer teaches is left out, and the note says so, for example <strong>1 Saturday period was left out because Saturday is not a teaching day.</strong> The note lists each one, such as <em>Saturday · Period 7</em>, until you select <strong>Dismiss</strong>. When every period would be left out, nothing is copied and the message says what to do: add the day to the teaching days in Settings, Calendar and timetables first, or build the year&apos;s bell schedule by hand.</p>
        <GuideCallout tone="info" title="Only into an empty year">Copying fills an empty bell schedule and nothing else. Once the year has a period, the offer goes, and a copy is refused with a message such as <strong>2026/2027 already has periods, so nothing was copied.</strong> Change that year&apos;s periods on the Bell schedule instead.</GuideCallout>
      </GuideSection>

      <GuideSection id="add-periods" title="Add the periods of the day">
        <GuideSteps>
          <GuideStep title="Open the form">On <strong>Bell schedule</strong>, select <strong>Add period</strong>.</GuideStep>
          <GuideStep title="Label and times">Type a <strong>Label</strong>, for example <em>Period 1</em>, and set the <strong>Start time</strong> and <strong>End time</strong>. The end must be after the start. Where your school has set a length for a new period, the end time fills in from the start, such as 08:40 from 08:00 for 40 minutes, until you type an end of your own.</GuideStep>
          <GuideStep title="Choose the type">Pick <strong>Lesson</strong>, <strong>Break</strong>, <strong>Lunch</strong> or <strong>Assembly</strong>. Only lesson periods can hold lessons on a timetable.</GuideStep>
          <GuideStep title="Choose the day">Leave <strong>Applies on</strong> at <strong>Every day</strong> for the normal school day. The weekdays beside it are your school&apos;s teaching days, in the order its week runs.</GuideStep>
          <GuideStep title="Save">Select <strong>Add period</strong>. Repeat for each period.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="The order follows the clock">Periods are put in order by their times. There is no order to set by hand.</GuideCallout>
      </GuideSection>

      <GuideSection id="day-schedules" title="Give one weekday its own schedule">
        <p>For a day that runs differently, such as a short Friday, add periods with <strong>Applies on</strong> set to that weekday.</p>
        <GuideCallout tone="danger" title="A weekday with its own periods runs only those">The first period you add for a weekday gives that day a schedule of its own, and the everyday schedule stops applying to it entirely. Add every period that day needs, not only the ones that differ. The form warns you when you are about to do this.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-the-school-day" title="Read the school day">
        <p><strong>The school day</strong> draws the periods as blocks sized by their length. The <strong>Every day</strong> tab shows the everyday schedule; a weekday tab shows that day as it actually runs. A dot on a weekday tab means that day has its own schedule.</p>
        <p>The weekday tabs are your school&apos;s teaching days. A day the school no longer teaches keeps its tab while it still has periods of its own, so they can be found and removed.</p>
        <p>The list below the picture shows every period on file, with its order, time, type, the day it applies on and, at a school with several branches, its scope. Select a period to edit it.</p>
      </GuideSection>

      <GuideSection id="remove-a-period" title="Remove a period">
        <p>Choose <strong>Delete</strong> from a period&apos;s menu and confirm with <strong>Remove</strong>. An everyday period comes off every timetable built on it.</p>
        <GuideCallout tone="warning" title="Lessons block the removal">A period that already holds lessons cannot be removed. Removing the last period a weekday owns hands that day back to the everyday schedule.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="Add room or Add period is greyed out">You are looking at an archived year, or your role cannot add timetable entries. Switch to the active year.</GuideStep>
          <GuideStep title="Timetables is missing from the sidebar">Your role cannot see timetables, or your school&apos;s plan does not include them.</GuideStep>
          <GuideStep title="Friday has lost its break">Friday has its own schedule, so the everyday break does not apply to it. Add a break with Applies on set to Friday.</GuideStep>
          <GuideStep title="A room is not offered for a lesson">It is inactive, or it is at a different branch from the class.</GuideStep>
          <GuideStep title="Saturday is not offered, or a Saturday period is refused">Saturday is not one of your school&apos;s teaching days. The message says so: <strong>Saturday is not one of the school&apos;s teaching days, so no period can be set for it.</strong> Add it to the teaching days in Settings, Calendar and timetables first.</GuideStep>
          <GuideStep title="There is no offer to copy last year's periods">This year already has periods, no earlier year has any, or your role cannot add periods. If you work across the whole school and a line says the copy is offered under All branches, choose <strong>All branches</strong> in the branch picker.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every teaching space is listed as an active room, and the Every day tab and each weekday tab show the school day as it really runs.</GuideCallout>
      </GuideSection>
    </div>
  );
}
