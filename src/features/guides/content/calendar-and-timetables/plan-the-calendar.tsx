import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords } from "../../guide-words";

export default function PlanTheCalendarArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The calendar holds the dates of the school year: public holidays, mid-term breaks, exam periods and school events. Every event is dated inside the school year you are looking at, and the {w.term} it falls in is worked out from its dates. Open <strong>Calendar</strong> in the sidebar.</p>
        <GuideChecklist items={[
          `The school year and its ${w.terms} exist on Sessions & ${w.Terms}.`,
          "The year selector at the foot of the sidebar shows the year you are planning.",
          "You have the dates of the holidays, breaks and events to add.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-overview" title="Read the calendar overview">
        <p><strong>Overview</strong> opens on <strong>Today at school</strong>: the date, the {w.term} you are in (or <em>Between {w.terms}</em>), how many teaching days of the {w.term} have passed, and the next event. School-closed days do not count as teaching days. A small month calendar beside it marks days that have events.</p>
        <p>Below that are counts of <strong>{w.Terms}</strong>, events this {w.term}, <strong>Classes timetabled</strong> and <strong>Rooms</strong>; select a count to open its screen. <strong>Coming up</strong> lists the next dated events, and <strong>Needs attention</strong> lists problems with the year, such as a {w.term} that falls outside the year, two {w.terms} that overlap, events outside every {w.term}, or classes with no timetable.</p>
      </GuideSection>

      <GuideSection id="add-an-event" title="Add an event">
        <GuideSteps>
          <GuideStep title="Open the form">Select <strong>Add event</strong> on the overview or on <strong>Events</strong>.</GuideStep>
          <GuideStep title="Name it">Type the <strong>Event name</strong>, for example <em>Mid-term break</em>.</GuideStep>
          <GuideStep title="Choose the type">Pick one <strong>Type</strong>: Public holiday, Mid-term break, Exam period, School event, PTA or Sports day.</GuideStep>
          <GuideStep title="Set the dates">Choose the <strong>Start date</strong>. The <strong>End date</strong> follows it, which suits a one-day event; move it for an event that runs several days.</GuideStep>
          <GuideStep title="Choose where it applies">When your school runs more than one branch, choose <strong>The whole school</strong> or <strong>One branch</strong>. Most events apply to every branch.</GuideStep>
          <GuideStep title="Save">Add a <strong>Description</strong> if useful, then select <strong>Add event</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Exam periods">An event of type Exam period is where an exam timetable is built. Once it is dated, papers can be scheduled inside it on Exam scheduling.</GuideCallout>
      </GuideSection>

      <GuideSection id="who-it-covers" title="Narrow who an event covers">
        <p><strong>Who it covers</strong> is left empty for most events, and then the event covers everybody. To narrow it, pick year groups (levels) or <strong>Single classes</strong>. Picking a level covers every class under it, so its classes show as already covered.</p>
        <p>A closure for the primary school only is an example: pick the primary levels, tick the school-closed box, and the secondary classes are unaffected. <strong>Clear, and cover everybody</strong> undoes the narrowing.</p>
      </GuideSection>

      <GuideSection id="school-closed-days" title="Mark days the school is closed">
        <p>Tick <strong>School closed on these days</strong> for a holiday or break. The days are marked non-teaching on the calendar and taken out of the teaching-day count. Events like this carry a <strong>School closed</strong> badge in the list.</p>
        <GuideCallout tone="tip" title="Timetables are left alone">Closing the school does not change any timetable. The lessons on those days are simply not held.</GuideCallout>
      </GuideSection>

      <GuideSection id="find-and-change-events" title="Find and change events">
        <p><strong>Events</strong> lists the year&apos;s entries with their dates, their <strong>School {w.term}</strong> (or <em>Outside every {w.term}</em>), where they apply, and who they cover. Search by name, or use <strong>Filters</strong> to narrow by event type, {w.term} and, at a school with several branches, scope.</p>
        <GuideSteps>
          <GuideStep title="Read an event">Select the event to open its details, including whether it is a teaching day.</GuideStep>
          <GuideStep title="Change an event">Choose <strong>Edit</strong> from the event&apos;s menu, or <strong>Edit event</strong> in its details.</GuideStep>
          <GuideStep title="Remove an event">Choose <strong>Delete</strong> from the event&apos;s menu and confirm with <strong>Remove</strong>. Removing a school-closed event puts its days back into the teaching-day count.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Exam periods with papers in them">An exam period that already has papers scheduled inside it cannot be removed. Remove or move the papers first.</GuideCallout>
      </GuideSection>

      <GuideSection id="warnings-after-saving" title="Warnings after saving">
        <p>An event that overlaps another, or falls outside every {w.term}, still saves. A warning then stays on screen for about ten seconds, explaining what it found. If you can edit events, the warning carries an <strong>Edit</strong> button that reopens the event so you can correct it straight away.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="Add event is greyed out or missing">The year you are looking at is archived and read-only, or your role cannot add events. Switch to the active year.</GuideStep>
          <GuideStep title="The overview says No school year yet">Create a year on Sessions &amp; {w.Terms} first; the calendar hangs off it.</GuideStep>
          <GuideStep title={`An event says Outside every ${w.term}`}>Its dates fall between {w.terms} or outside the year. Check the dates, or the {w.term} dates on Sessions &amp; {w.Terms}.</GuideStep>
          <GuideStep title="Edit or Delete is missing on one event">The event is school-wide and you work in one branch only, so you can read it but not change it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every holiday, break and exam period for the year is listed on Events inside the right {w.term}, closures are marked School closed, and Needs attention on the overview has nothing you have not accepted.</GuideCallout>
      </GuideSection>
    </div>
  );
}
