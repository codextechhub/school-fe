import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function FindStudentRecordArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open <strong>Students</strong> in the sidebar to reach the <strong>Student Directory</strong>. It lists every student for the branch and academic year chosen at the foot of the sidebar, so check both before you decide a child is missing.</p>
        <GuideChecklist items={[
          "Your role lets you view students.",
          "The branch and year in the sidebar are the ones you mean.",
          "You know the child's name or admission number.",
        ]} />
      </GuideSection>

      <GuideSection id="search-and-filter" title="Search and filter the directory">
        <GuideSteps>
          <GuideStep title="Search">Type in <strong>Search name or admission no.</strong> The list narrows as you type and a line under the toolbar says how many students match.</GuideStep>
          <GuideStep title="Filter">Select <strong>Filters</strong> to narrow by <strong>Class</strong>, <strong>Level</strong> or <strong>Status</strong>, or tick <strong>Unassigned class only</strong> to see students on the roll with no class. Select <strong>Done</strong> to close the panel. The button shows how many filters are on.</GuideStep>
          <GuideStep title="Clear what you set">Each filter appears as a chip under the toolbar. Select a chip to remove it, or <strong>Clear all</strong> to start again.</GuideStep>
          <GuideStep title="Choose a layout">Switch between <strong>List</strong> and <strong>Cards</strong>. The list shows the admission number, class, primary guardian and a <strong>Record</strong> bar that reads <strong>Ready</strong> or counts the gaps.</GuideStep>
          <GuideStep title="Export what you see">Where your role allows exports, <strong>Export</strong> produces a file of the list with your search and filters applied.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A past year shows that year's classes">When you choose an earlier academic year, the directory shows that year&apos;s roll and classes. Statuses are always the current ones, because the school records one status per student, not one per year. The page says so above the list.</GuideCallout>
      </GuideSection>

      <GuideSection id="overview-and-work-queue" title="Use the overview and work queue">
        <p>The cards at the top count <strong>Total students</strong>, <strong>Active</strong>, <strong>Applicants</strong> and <strong>Needs attention</strong>. Select <strong>Active</strong> or <strong>Applicants</strong> to filter the list to that status.</p>
        <p>The <strong>Student work queue</strong> below names records that need someone today, most urgent first:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A student on the roll with no class. <strong>Place</strong> opens the class drawer for that student.</li>
          <li>Applications awaiting enrolment. <strong>Review</strong> opens Applicants.</li>
          <li>A class over its capacity. <strong>Move</strong> takes you to place or move students.</li>
        </ul>
        <p>When nothing is waiting, the panel says <strong>Nothing needs attention.</strong></p>
      </GuideSection>

      <GuideSection id="read-the-profile" title="Read a student's profile">
        <p>Select a row, or choose <strong>Open profile</strong> from the row menu. The header shows the child&apos;s name, status, admission number, class, level, branch and year. Under it, a short path shows where they stand on <strong>Applicant</strong>, <strong>Enrolled</strong>, <strong>Active</strong>. A student outside that path, such as a graduated one, gets a sentence instead.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { tab: "Overview", body: "Personal details, school details, the academic and document snapshots, missing information, the primary guardian and recent activity." },
            { tab: "Guardians", body: "Everyone linked to the student, their relationship and contact details, and the other students each one is also guardian of." },
            { tab: "Academic", body: "The current placement, the class history across years, and the subjects the student takes." },
            { tab: "Medical", body: "Blood group, allergies, conditions and the emergency contact, where your role may read them." },
            { tab: "Documents", body: "Each document the school expects, whether it is on file, and View, Upload, Replace or Remove." },
            { tab: "History", body: "Every change to the record, newest first, with who made it and when." },
          ].map(({ tab, body }) => (
            <div key={tab} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{tab}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p>The tab you open is kept in the page address, so you can send a colleague a link that opens straight on the Guardians or Documents tab.</p>
        <GuideCallout tone="info" title="Some details may be hidden from you">Your school decides which roles may read each personal and medical field. A field you may not read is left off the page entirely. That is different from <strong>Not recorded</strong>, which means the school has not entered it.</GuideCallout>
      </GuideSection>

      <GuideSection id="fill-missing-information" title="Fill missing information">
        <p>The <strong>Profile completeness</strong> card beside the header shows how complete the record is. On the Overview tab, <strong>Missing information</strong> lists each gap, such as a date of birth, a guardian or a required document.</p>
        <GuideSteps>
          <GuideStep title="Go to the list">Select <strong>Complete profile</strong> on the completeness card to scroll to the list.</GuideStep>
          <GuideStep title="Fill one gap">Select <strong>Fill</strong> beside a gap. A missing detail opens <strong>Edit record</strong> on the right section, a missing guardian opens <strong>Link a guardian</strong>, and a missing document opens the Documents tab.</GuideStep>
          <GuideStep title="Save">Select <strong>Save changes</strong> in the drawer. The completeness card updates when the record reloads.</GuideStep>
        </GuideSteps>
        <p><strong>Edit student</strong> in the header opens the same drawer, with sections for <strong>Personal</strong>, <strong>Contact</strong>, <strong>School</strong> and <strong>Health</strong>.</p>
      </GuideSection>

      <GuideSection id="see-an-earlier-day" title="See the record on an earlier day">
        <p>Use the <strong>As at</strong> date control above the completeness card to see the whole profile as it stood at the end of an earlier day. A banner says which day you are looking at, and every button that changes the record is hidden, because the past cannot be edited. Return to today from the banner.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "A student I expect is not listed", body: "Check the branch and year in the sidebar, then clear every filter chip. A student who applied but was never enrolled appears with the Applicant status." },
          { title: "The class filter is missing a class", body: "Classes come from Academic Structure for the year you are looking at. A class that has not been set up for that year cannot be offered." },
          { title: "Edit student or Change status is missing", body: "Each action needs its own permission. Ask whoever manages roles at your school if you need one." },
          { title: "The earlier day shows an error", body: "The record has no history for the day you picked. Select Back to today and choose a day the calendar offers." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">You can find any student by name or admission number, narrow the list with filters, open a profile on the tab you need, and fill a gap from Missing information.</GuideCallout>
      </GuideSection>
    </div>
  );
}
