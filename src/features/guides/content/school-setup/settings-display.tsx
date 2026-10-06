import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords } from "../../guide-words";

const PROBLEMS = [
  ["Display is not in Settings", "It opens for a role that can view school settings. Ask whoever manages roles at your school."],
  ["The choices are greyed out and there is no Save", "Your role reads these settings without changing them, or you work in one branch. The date style, the clock and the school's time zone are the whole school's, and the screen says why at the bottom."],
  ["There is no Branches in another time zone panel", "Your school has one branch, so its time zone is the school's. Change the school's time zone instead."],
  ["A branch has no list or Save beside it", "Your role can read the branch's zone but not change it, or the branch is not one you work in."],
  ["Save stays grey beside a branch", "The zone picked is the one the branch already runs in. Pick a different zone."],
  ["Save display settings stays grey", "Nothing has changed yet."],
  ["A colleague still sees the old style", "Their screens follow once they come back to XVS from another tab or window. A screen already open may keep the old style until they move to another one."],
  ["A receipt shows a date differently from the screen", "Invoices, receipts, emails and exported files do not follow the date style or the clock chosen here."],
  ["We could not save these settings. Try again.", "The save did not go through. Check your connection and select Save display settings again."],
  ["That time zone could not be saved.", "A branch's zone did not save. Check your connection and select Save beside the branch again."],
] as const;

/**
 * Settings > Your school > Display: how every date and time on screen is
 * written, the school's time zone, and the branches that keep a zone of their
 * own.
 */
export default function SettingsDisplayArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Display</strong> in <strong>Settings</strong> decides how dates and times read across XVS, and the time zone your school keeps. Open <strong>Settings</strong>, then <strong>Your school</strong>, and select <strong>Display</strong>. You can also type &quot;display settings&quot;, &quot;date format&quot; or &quot;time zone&quot; into the search box in the header.</p>
        <p>The date style, the clock and the school&apos;s time zone are the whole school&apos;s: somebody who works in one branch reads them without changing them. A branch administrator can still set their own branch&apos;s time zone, under <strong>Branches in another time zone</strong>.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "You work across the whole school, or, for a branch's time zone, in that branch.",
          "You know how your school writes a date, and whether it reads the clock in 12 or 24 hours.",
        ]} />
      </GuideSection>

      <GuideSection id="dates" title="Dates">
        <p>Under <strong>Dates</strong>, choose one of three cards. Each shows a date written that way:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>29 Sep 2026</strong>, the day, a short month name and the year. Until you choose, dates read this way.</li>
          <li><strong>29/09/2026</strong>, day first, then month, then year.</li>
          <li><strong>2026-09-29</strong>, year first, which sorts in order in a list.</li>
        </ul>
        <p>Every date on screen follows the choice: lists, profiles, the calendar, date boxes and the dates in Finance and Procurement. So does a date inside a Finance message, such as a refusal that names the date a shared bank account is split. A month on its own always shows its name, such as <strong>Sep 2026</strong>, whichever style is chosen, so a heading never reads like a card expiry date.</p>
      </GuideSection>

      <GuideSection id="times" title="Times">
        <p>Under <strong>Times</strong>, choose <strong>12-hour</strong>, where a time reads <strong>2:05 pm</strong>, or <strong>24-hour</strong>, where it reads <strong>14:05</strong>. Until you choose, the clock is 12-hour. Lesson and bell times, events, exam papers and every other time on screen follow it.</p>
      </GuideSection>

      <GuideSection id="school-time-zone" title="Your school's time zone">
        <p>Under <strong>Your school&apos;s time zone</strong>, choose the zone your school runs in from the list, such as <em>Lagos (West Africa Time, UTC+1)</em>, the zone every school starts on. The zone decides when a school day starts and ends, what &quot;today&quot; is, and the time shown on everything that has no branch of its own.</p>
        <p>The line under the list shows today&apos;s date and the time now in the zone you picked, written the way the cards above say, so you can check the choice before you save.</p>
        <p>&quot;Today&quot; reaches further than a clock. It is the day the calendar and {w.Term} view mark, the day a date box offers as today, and the day that decides when something is due or overdue.</p>
      </GuideSection>

      <GuideSection id="save-the-settings" title="Save the settings">
        <GuideSteps>
          <GuideStep title="Make your changes">Change any of the three panels. <strong>Unsaved changes</strong> appears beside the button while something is not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save display settings</strong>. XVS confirms with <strong>Display settings saved.</strong> and your own screens follow straight away.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Colleagues follow when they come back">Colleagues already signed in see the new style once they return to XVS from another tab or window. A screen already open on their device may keep the old style until they move to another one.</GuideCallout>
      </GuideSection>

      <GuideSection id="branch-time-zones" title="Branches in another time zone">
        <p>At a school with more than one branch, <strong>Branches in another time zone</strong> lists each branch you work in, with the zone it runs in: <strong>Follows the school: Lagos (West Africa Time, UTC+1)</strong>, or <strong>Its own zone:</strong> and the zone it keeps.</p>
        <GuideSteps>
          <GuideStep title="Give a branch its own zone">Pick the zone in the list beside the branch and select <strong>Save</strong>. XVS confirms with, for example, <strong>Nairobi Branch now keeps its own time zone.</strong></GuideStep>
          <GuideStep title="Send it back to the school's zone">Select <strong>Use the school&apos;s</strong> beside a branch that keeps its own. XVS confirms with <strong>Nairobi Branch now follows the school&apos;s time zone.</strong></GuideStep>
        </GuideSteps>
        <p>A branch with its own zone has its own school day and its own &quot;today&quot;, and every time on its records follows its zone. A screen narrowed to that branch, with the branch selector at the foot of the sidebar or because you work only in that branch, reads in the branch&apos;s zone. A view of the whole school reads in the school&apos;s zone.</p>
        <GuideCallout tone="info" title="Only the zone is a branch's own">A branch keeps the school&apos;s date style and clock. A Lagos school with a Nairobi branch writes <strong>29 Sep 2026</strong> and <strong>2:05 pm</strong> in both, while the Nairobi Branch&apos;s day turns at midnight in Nairobi.</GuideCallout>
      </GuideSection>

      <GuideSection id="what-follows" title="What follows these settings">
        <p>Every date and time on screen follows them, in every area of XVS, Finance and Procurement included.</p>
        <p>Invoices, receipts, emails and exported files do not follow the date style or the clock, so a date on a receipt can read differently from the same date on screen. These guides write dates and times in the style a school starts with; your own screens show your school&apos;s choice.</p>
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
        <GuideCallout tone="tip" title="You are done when">The date style, the clock and the school&apos;s time zone are the ones your school agreed, no unsaved changes are left, each branch in another zone keeps its own, and the line under the time zone shows the date and time it is at your school.</GuideCallout>
      </GuideSection>
    </div>
  );
}
