import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const LINES = [
  ["An Email switch", "You choose. The text under the event says whether the current setting is the XVS default or your school's choice."],
  ["Always sent", "A transactional event, such as a receipt or a password reset. It always emails, because the person it concerns is owed it, so there is no switch."],
  ["No switch and no label", "The event has no email. It shows in the bell only."],
] as const;

const PROBLEMS = [
  ["A switch will not move", "Another change is still saving. Wait a moment and try again."],
  ["There is no switch for a receipt or a password reset", "Those are always sent. Nobody at the school can turn them off."],
  ["Nothing to configure yet", "No events that send notifications are set up for your school."],
  ["Somebody still sees the event after you turned email off", "Turning email off stops the email only. Every event still appears in the bell inside XVS."],
] as const;

export default function SettingsNotificationsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Notifications</strong> in <strong>Settings</strong> chooses which events also send an email to the people they concern. It applies to everyone at your school, not only to you. Your role needs the key to manage notification settings for this area to appear.</p>
        <GuideCallout tone="info" title="The bell always carries everything">
          Whatever you choose here, every event still appears in the bell inside XVS. These switches decide only whether an email goes out as well.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="read-the-list" title="Read the list">
        <p>Events are grouped under the name of the part of XVS they come from. Each event shows one of three things:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LINES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="turn-email-on-or-off" title="Turn email on or off">
        <GuideSteps>
          <GuideStep title="Find the event">Scroll to the group the event belongs to.</GuideStep>
          <GuideStep title="Flip the switch">Turn the <strong>Email</strong> switch on or off. It saves straight away and XVS confirms whether the event will be emailed. There is no separate Save, so leaving the page loses nothing.</GuideStep>
        </GuideSteps>
        <p>Once you change an event, the text under it reads <strong>Your school&apos;s choice.</strong> Until then it reads <strong>The XVS default.</strong></p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Each event you care about shows the email setting your school wants, and its text reads <strong>Your school&apos;s choice.</strong></GuideCallout>
      </GuideSection>
    </div>
  );
}
