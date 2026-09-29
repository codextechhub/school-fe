import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords } from "../../guide-words";

const PROBLEMS = [
  ["Calendar and timetables is not in Settings", "It opens for a role that can view school settings. Ask whoever manages roles at your school."],
  ["The choices are greyed out and there is no Save", "Your role reads these settings without changing them, or you work in one branch. The settings are the whole school's, and the screen says why at the bottom."],
  ["Choose at least one day the school teaches.", "Every day is switched off under Teaching days. Select the days lessons happen."],
  ["Choose at least one role that may invigilate.", "Every box is cleared under Who may invigilate exams. Tick at least one role."],
  ["Use 10 to 240 minutes, or leave it blank.", "A new period's length is a whole number of minutes from 10 to 240. Clear the box to type both times yourself."],
  ["Save calendar settings stays grey", "Nothing has changed yet, or one of the problems above is showing under its panel."],
  ["A holiday added last month is not marked School closed", "The setting applies when an event is added. Events already on the calendar keep their own answer: open the event and tick School closed on these days."],
  ["Saturday still shows on a class timetable", "The class still has a lesson on Saturday, so the grid keeps the day, marked Not a teaching day, until the lesson is cleared. The timetable cannot be published until then."],
  ["We could not save these settings. Try again.", "The save did not go through. Check your connection and select Save calendar settings again."],
] as const;

/**
 * Settings > Academics > Calendar and timetables: the days the school
 * teaches, the day its week starts, the event types that close it, what a
 * timetable needs to publish, the length of a new period, and who may
 * invigilate.
 */
export default function SettingsCalendarArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Calendar and timetables</strong> in <strong>Settings</strong> holds your school&apos;s rules for its calendar, its timetables and its exams. Open <strong>Settings</strong>, then <strong>Academics</strong>, and select <strong>Calendar and timetables</strong>. You can also type &quot;calendar and timetable settings&quot; or &quot;teaching days&quot; into the search box in the header.</p>
        <p>The settings are the whole school&apos;s: somebody who works in one branch reads them without changing them. Each one is a default or a check on what happens next. Nothing already on the calendar changes when you save, and no published timetable is unpublished.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "You work across the whole school rather than one branch.",
          "You know the days your school teaches, and the roles of the people who invigilate exams.",
        ]} />
      </GuideSection>

      <GuideSection id="teaching-days" title="Teaching days">
        <p>Under <strong>Teaching days</strong>, select the days lessons happen, from Mon to Sun. Until you choose, they are Monday to Friday. One set of days holds for the whole school, every branch and every level alike.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Class and teacher timetables show these days as their columns, and the bell schedule offers them.</li>
          <li>The calendar counts them as teaching days, so the overview&apos;s <strong>Day 12 of 60 teaching days</strong> counts a Saturday school&apos;s Saturdays.</li>
          <li>A lesson or a period on any other day is refused, and copying an earlier year&apos;s bell schedule leaves out the periods set for such a day. The message names the day, for example <strong>Saturday is not one of the school&apos;s teaching days, so no lesson can be scheduled on it. Add Saturday to the teaching days in Settings, Calendar and timetables first.</strong></li>
        </ul>
        <GuideCallout tone="warning" title="Lessons on a day you stop teaching stay put">A school that stops teaching Saturday keeps its Saturday lessons. The class timetable shows Saturday as an extra column marked <strong>Not a teaching day</strong>, with a note above the grid, so each lesson can be cleared or added again on a day the school teaches. Those lessons still count in clashes, and a class timetable holding one cannot be published until it is moved or removed.</GuideCallout>
        <GuideCallout tone="info" title="Staff leave counts its own days">Teaching days do not decide how leave is counted. A leave request counts the working days set in <strong>Settings</strong> under <strong>Staff rules</strong>, so a school that teaches on Saturday mornings can still count leave Monday to Friday.</GuideCallout>
      </GuideSection>

      <GuideSection id="week-starts-on" title="Week starts on">
        <p>Under <strong>Week starts on</strong>, choose <strong>Monday</strong> or <strong>Sunday</strong>. Until you choose, it is Monday. It is the first column of every calendar and date picker: the month calendar on the calendar overview, the month grid in {w.Term} view, and every date box that opens a calendar. Timetable columns follow the same order.</p>
        <p>The week start is separate from how dates and times are written. The date style, the 12- or 24-hour clock and the time zone that decides which day is today are set under <strong>Display</strong> in <strong>Your school</strong>.</p>
      </GuideSection>

      <GuideSection id="events-that-close-the-school" title="Events that close the school">
        <p>Under <strong>Events that close the school</strong>, tick each type of event that closes the school. Until you choose, a <strong>Public holiday</strong> and a <strong>Mid-{w.term} break</strong> close it, and an exam period, a school event, a PTA meeting and a sports day do not.</p>
        <p>When somebody adds an event of a ticked type, its <strong>School closed on these days</strong> box starts ticked, and follows the type if they change it. They can still tick or clear the box on the event itself. Events already on the calendar keep their own answer when you change these.</p>
      </GuideSection>

      <GuideSection id="timetables" title="Timetables">
        <p>The <strong>Timetables</strong> panel decides what a class timetable needs before it can be published, and how a new period starts.</p>
        <GuideSteps>
          <GuideStep title="A lesson needs a room before publishing">On until you turn it off. With it off, a timetable publishes once every lesson has a teacher, which suits a school whose classes stay in their own rooms. A lesson with no teacher always stops publishing.</GuideStep>
          <GuideStep title="The lesson's teacher and Teaching duties">Choose <strong>Don&apos;t check</strong>, <strong>Warn</strong> or <strong>Refuse</strong>; the sentence under each says what it does. Don&apos;t check, the default, lets any teacher take any lesson. Warn saves a lesson given to a teacher without that class and subject in Teaching duties, with a warning, and the publish check lists it. Refuse only allows a teacher who has that class and subject in Teaching duties, and a timetable with a mismatch cannot be published.</GuideStep>
          <GuideStep title="Length of a new period">Type a length in minutes, from 10 to 240. Adding a period on the bell schedule then fills its end time from its start. Leave it blank to type both times.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Refuse needs Teaching duties to be complete">Before you choose Refuse, check <strong>Teaching duties</strong> under Staff. A teacher with no duty for a class and subject cannot be put on that lesson, and a timetable already holding such a lesson stays unpublished until it is fixed.</GuideCallout>
      </GuideSection>

      <GuideSection id="who-may-invigilate" title="Who may invigilate exams">
        <p>Under <strong>Who may invigilate exams</strong>, tick the roles whose holders can be put in charge of an exam room. The list holds your school&apos;s active roles. Until you choose, it is <strong>Teacher</strong>.</p>
        <p>The <strong>Invigilator</strong> picker on an exam paper lists the people holding these roles, each with the role that makes them eligible, such as <em>Bola Adeyemi · Lab technician</em>. A paper already given to somebody who no longer holds one of these roles keeps them, and still saves when something else on it changes. Putting them back on a paper after somebody else was chosen is refused, with a message naming the roles allowed.</p>
      </GuideSection>

      <GuideSection id="save-the-settings" title="Save the settings">
        <GuideSteps>
          <GuideStep title="Make your changes">Change any of the panels. <strong>Unsaved changes</strong> appears beside the button while something is not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save calendar settings</strong>. XVS confirms with <strong>Calendar and timetable settings saved.</strong> and every timetable, calendar and date picker follows them from then on.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Tell the people who build timetables">A change to teaching days, the room rule or the Teaching duties check changes what the timetable screens offer and what they let through. Tell whoever builds timetables before you save.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The teaching days, week start, closing events, timetable rules and invigilator roles are the ones your school agreed, no unsaved changes are left, and the class timetables show the days your school teaches.</GuideCallout>
      </GuideSection>
    </div>
  );
}
