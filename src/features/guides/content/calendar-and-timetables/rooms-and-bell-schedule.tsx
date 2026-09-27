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
        <GuideCallout tone="info" title="What follows the year">A room stays on file from year to year. The bell schedule belongs to the school year you are looking at.</GuideCallout>
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

      <GuideSection id="add-periods" title="Add the periods of the day">
        <GuideSteps>
          <GuideStep title="Open the form">On <strong>Bell schedule</strong>, select <strong>Add period</strong>.</GuideStep>
          <GuideStep title="Label and times">Type a <strong>Label</strong>, for example <em>Period 1</em>, and set the <strong>Start time</strong> and <strong>End time</strong>. The end must be after the start.</GuideStep>
          <GuideStep title="Choose the type">Pick <strong>Lesson</strong>, <strong>Break</strong>, <strong>Lunch</strong> or <strong>Assembly</strong>. Only lesson periods can hold lessons on a timetable.</GuideStep>
          <GuideStep title="Choose the day">Leave <strong>Applies on</strong> at <strong>Every day</strong> for the normal school day.</GuideStep>
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
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every teaching space is listed as an active room, and the Every day tab and each weekday tab show the school day as it really runs.</GuideCallout>
      </GuideSection>
    </div>
  );
}
