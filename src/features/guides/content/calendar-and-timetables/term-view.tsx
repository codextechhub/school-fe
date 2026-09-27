import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function TermViewArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Term view shows the same events as the Events list, drawn as a year and a month rather than as rows. Use it to answer &quot;where are we in the year&quot; and &quot;what is happening in November&quot;. Open <strong>Calendar</strong>, then <strong>Term view</strong>.</p>
        <GuideChecklist items={[
          "The school year and its terms exist on Sessions & Terms.",
          "The year selector at the foot of the sidebar shows the year you want to see.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-timeline" title="Read the school year timeline">
        <p><strong>School year timeline</strong> draws the year from its first day to its last, with each term as a block and today marked on it. Breaks appear as spaces between terms. A past year carries a <strong>Read-only year</strong> badge.</p>
      </GuideSection>

      <GuideSection id="use-the-month-grid" title="Use the month calendar">
        <p><strong>Month calendar</strong> opens on the month today falls in. Use the arrows to move a month back or forward, and <strong>Today</strong> to return.</p>
        <p>Today&apos;s date is highlighted. Days the school is closed are tinted, and each event on a day appears as a named chip on a wide screen, or as a coloured dot on a phone. The key above the grid shows which is which.</p>
      </GuideSection>

      <GuideSection id="open-a-day" title="Open a day">
        <GuideSteps>
          <GuideStep title="A day with events">Select the day to list everything on it, with each event&apos;s full date range. Select an event to open it: you get the edit form if you may change it, and its details if you may not.</GuideStep>
          <GuideStep title="An empty day">If you can add events, selecting an empty day opens <strong>Add event</strong> with that date already filled in.</GuideStep>
          <GuideStep title="Add or remove from the day list">The day list has an <strong>Add event</strong> button for another entry on the same day, and a delete control on each event you may remove. Removing asks you to confirm with <strong>Remove</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Add from the top">The <strong>Add event</strong> button at the top of the page opens the form dated today. The form is the same one described in Plan the school calendar.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="The page says No school year yet">Create a year on Sessions &amp; Terms first. The timeline and the month grid both need one.</GuideStep>
          <GuideStep title="Selecting an empty day does nothing">You are looking at an archived year, or your role cannot add events.</GuideStep>
          <GuideStep title="An event is missing from the grid">Check the branch selector in the sidebar. An event for another branch is not shown while you look at one branch.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You can use this view when">You can find today on the timeline, move to any month of the year, and open a day to see everything dated on it.</GuideCallout>
      </GuideSection>
    </div>
  );
}
