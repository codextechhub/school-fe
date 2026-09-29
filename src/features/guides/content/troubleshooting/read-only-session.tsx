import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords } from "../../guide-words";

export default function ReadOnlySessionArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Classes, levels, subjects, calendars and timetables each belong to one session. When the session you are looking at is archived, XVS keeps its records exactly as they were: you can read them, but nothing in them can be changed.</p>
        <GuideChecklist items={[
          "You know which session is the school's active one.",
          "You are on a screen that follows the session, such as Academic Structure, Calendar, Timetables or Students.",
        ]} />
      </GuideSection>

      <GuideSection id="recognise-it" title="Recognise a read-only session">
        <p>A line under the header reads <strong>Read-only.</strong> and names the archived session you are viewing. Where there is an active session it adds <em>Switch to</em> and its name. On the same screen, buttons that add, edit or delete are hidden.</p>
        <GuideCallout tone="info" title="Not a permission problem">Your role has not changed. The same buttons return as soon as you look at a session that is not archived.</GuideCallout>
      </GuideSection>

      <GuideSection id="switch-session" title="Switch to the active session">
        <GuideSteps>
          <GuideStep title="Find the session selector">It sits at the foot of the sidebar and shows the session you are viewing. When the sidebar is collapsed it shows only a calendar icon.</GuideStep>
          <GuideStep title="Open it">The list opens upward. Each session is marked <strong>active</strong>, <strong>draft</strong> or <strong>archived</strong>.</GuideStep>
          <GuideStep title="Choose the active session">The read-only line disappears and the screen shows that session&apos;s records, with their buttons.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li>There is no session selector: the school has only one session, or this screen does not follow the session. Neither case is read-only.</li>
          <li>A record from an archived session needs correcting: these screens cannot change it. Raise a ticket from the headset in the header and describe the correction.</li>
          <li>No session is marked active: the school has not started its current session yet. Whoever manages <strong>Sessions &amp; {w.Terms}</strong> sets it up.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "The session selector shows the session marked active.",
          "The Read-only line is gone.",
          "The buttons you expect are back on the screen.",
        ]} />
      </GuideSection>
    </div>
  );
}
