import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords, type TermWords } from "../../guide-words";

const problems = (w: TermWords) => [
  ["Academic structure is not in Settings", "It opens for a role that can view school settings. Ask whoever manages roles at your school."],
  ["The choices are greyed out and there is no Save", "Your role reads these settings without changing them, or you work in one branch. The settings are the whole school's, and the screen says why at the bottom."],
  [`Add a ${w.term} is greyed out`, "The list already holds six, the most a year can start with. Remove one first."],
  ["Save academic structure settings stays grey", `Nothing has changed yet, a ${w.term} has no name or shares its name with another, or the arm list is empty.`],
  ["A year set up earlier keeps its old names", `Names already saved stay as they were saved. Open the session and use Edit session to rename its ${w.terms}.`],
  ["An existing class kept its old arm", "Arms only fill in classes added from now on. Rename a class with Edit on its card in Classes & Arms."],
  ["We could not save these settings. Try again.", "The save did not go through. Check your connection and select Save academic structure settings again."],
] as const;

/**
 * Settings > Academics > Academic structure: the school's word for a part of its year,
 * the parts a new year starts with, and the default arms.
 */
export default function SettingsAcademicsArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Academic structure</strong> in <strong>Settings</strong> holds three starting points for your school&apos;s year: the word every screen and message uses for a part of the year, the {w.terms} every new academic year starts with, and the arms offered when classes are added for a level. The settings are the whole school&apos;s: somebody who works in one branch reads them without changing them.</p>
        <p>Open <strong>Settings</strong>, then <strong>Academics</strong>, and select <strong>Academic structure</strong>. The <strong>Academics</strong> group sits between <strong>Students</strong> and <strong>Staff</strong>, and also holds <strong>Calendar and timetables</strong>, where the school&apos;s teaching days and timetable rules are set. You can also type &quot;academic structure settings&quot; into the search box in the header.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "You work across the whole school rather than one branch.",
          `You know what your school calls a part of its year, and the names of its ${w.terms}.`,
        ]} />
      </GuideSection>

      <GuideSection id="term-or-semester" title="Term or Semester">
        <p>Under <strong>What your school calls them</strong>, choose <strong>Term</strong> or <strong>Semester</strong>. Each choice says what your screens will then read, such as <em>First Semester, This semester, Sessions and Semesters</em>.</p>
        <p>The word is used wherever a part of the year is named. At a school that says Semester, the sidebar reads <strong>Sessions &amp; Semesters</strong> and <strong>Semester view</strong>, the session form offers <strong>Add semester</strong>, and a session card marks its parts <strong>S1</strong>, <strong>S2</strong>. The search box in the header finds the same actions whichever word is typed. These guides follow the word too.</p>
        <GuideCallout tone="info" title="Names already saved stay as they are">
          A year whose {w.terms} are called First Term, Second Term and Third Term keeps those names after a switch to Semester, because they are already printed on invoices and reports. Rename them with <strong>Edit session</strong> on the session&apos;s own page if they should change.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="parts-of-the-year" title="The parts of a year">
        <p>Under <strong>{w.Terms} in a year</strong>, list the {w.terms} every new academic year starts with, in order. A year can start with anything from one to six.</p>
        <GuideSteps>
          <GuideStep title="Name each one">Type over a name to change it. Each needs a name of up to 30 characters, and no two can share one. A problem shows under the row, such as <strong>Give this {w.term} a name.</strong> or <strong>Two {w.terms} have this name.</strong></GuideStep>
          <GuideStep title="Put them in order">Use <strong>Move up</strong> and <strong>Move down</strong> beside a row. The first row is the first {w.term} of the year.</GuideStep>
          <GuideStep title={`Add or remove a ${w.term}`}>Select <strong>Add a {w.term}</strong> for an empty row, up to six. The bin beside a row removes it; the last one cannot be removed.</GuideStep>
        </GuideSteps>
        <p>When somebody creates a new session, the form opens with one row per name, in this order, ready for its dates. A school that lists Harmattan Semester and Rain Semester gets those two rows on every new session. That year&apos;s own {w.terms} can still be renamed, added or removed in the form before it is created. Years already set up keep the {w.terms} they have.</p>
      </GuideSection>

      <GuideSection id="arms-for-new-classes" title="Arms for new classes">
        <p>Under <strong>Arms for new classes</strong>, list the arms offered, in order, when classes are added for a level. With A, B and C, generating the classes for JSS1 makes JSS1 A, JSS1 B and JSS1 C.</p>
        <GuideSteps>
          <GuideStep title="Add an arm">Type it into the box, such as <em>Red</em>, and select <strong>Add</strong> or press Enter. An arm can be up to 30 characters, and the list holds up to twelve.</GuideStep>
          <GuideStep title="Remove an arm">Select the cross on its chip. The list needs at least one arm.</GuideStep>
        </GuideSteps>
        <p>The <strong>Generate arms</strong> form on <strong>Classes &amp; Arms</strong> opens with these arms typed in, ready to use or edit for that level. Classes already made keep their names.</p>
      </GuideSection>

      <GuideSection id="save-the-settings" title="Save the settings">
        <GuideSteps>
          <GuideStep title="Make your changes">Change any of the three panels. <strong>Unsaved changes</strong> appears beside the button while something is not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save academic structure settings</strong>. XVS confirms with <strong>Academic structure settings saved.</strong></GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Starting points, never a rename">
          All three settings shape what is created from now on. Nothing already made is renamed: not a year, not a {w.term}, not a class. Tell whoever sets up next year before you change them, so the new session and its classes come out the way the school expects.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {problems(w).map(([title, body]) => (
            <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The word, the {w.terms} in order and the arms are the ones your school agreed, no unsaved changes are left, and a new session&apos;s form opens with your {w.terms}.</GuideCallout>
      </GuideSection>
    </div>
  );
}
