import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function NothingFoundArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>An empty list is rarely missing data. Most often the list is narrowed by something you can see on the screen: a branch, a session, a tab, or a search you typed earlier.</p>
        <GuideChecklist items={[
          "You know the record exists, and roughly which branch and session it belongs to.",
          "You are on the screen that lists that kind of record.",
        ]} />
      </GuideSection>

      <GuideSection id="check-what-narrows-the-list" title="Check what narrows the list">
        <GuideSteps>
          <GuideStep title="The branch selector">At the foot of the sidebar, the branch selector limits many lists to one branch. Choose <strong>All branches</strong> (or <strong>All my branches</strong>) to widen it.</GuideStep>
          <GuideStep title="The session selector">Classes, levels, subjects, calendars and timetables belong to one session. A record from another year appears only when that session is chosen.</GuideStep>
          <GuideStep title="The tabs">Many lists open on one tab, such as <strong>Open</strong> on Support or <strong>Unread</strong> on Notifications. Choose <strong>All</strong> to see everything.</GuideStep>
          <GuideStep title="The search box and filters">Clear the search box on the page and any filters you set. Where the screen offers <strong>Clear filters</strong>, use it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="search-well" title="Search well">
        <ul className="list-disc space-y-2 pl-5">
          <li>Type less. One distinctive word, part of a surname, or an admission number finds more than a full sentence.</li>
          <li>Give the list a moment. Search boxes wait until you stop typing before they look.</li>
          <li>To find a person from anywhere, type two or more letters of their name into <strong>Search your workspace</strong> in the header.</li>
        </ul>
        <GuideCallout tone="info" title="The header search finds actions and people">It opens screens, starts tasks, finds students (and staff or guardians where your role allows), and lists matching how-to guides. It does not search inside every record.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li>Messages such as <strong>No tickets match that search</strong> or <strong>No notifications match that search</strong>: the search box is narrowing the list. Clear it.</li>
          <li><strong>Nothing matches - no action, screen, guide or student by that name.</strong> in the header: check the spelling, or you may not be allowed to see that record.</li>
          <li>A colleague can find the record and you cannot: your role may reach fewer branches, or you may not have access to that kind of record.</li>
          <li><strong>We could not load</strong> with <strong>Try again</strong>: the list failed to load rather than being empty. Select <strong>Try again</strong>, and raise a ticket if it keeps failing.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "The branch and session match the record you want.",
          "The tab shows All, or the right status.",
          "The search box and filters are cleared or set on purpose.",
          "The record appears, or you know why your role cannot see it.",
        ]} />
      </GuideSection>
    </div>
  );
}
