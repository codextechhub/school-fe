import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const LINES = [
  ["An Email switch", "You choose. The text under the event says where its current setting comes from."],
  ["Always sent", "A transactional event, such as a receipt or a password reset. It always emails, because the person it concerns is owed it, so there is no switch."],
  ["No switch and no label", "The event has no email. It shows in the bell only."],
] as const;

const PROBLEMS = [
  ["A switch will not move", "Another change is still saving, or you are reading a scope you cannot change: a branch administrator can read the whole school but change only their own branch. A switch set for the whole school only cannot be changed at a branch."],
  ["A branch keeps sending an email the school turned off", "The branch made its own choice, shown as Set for this branch. Pick that branch and select Use the school's choice to follow the whole school again."],
  ["There is no switch for a receipt or a password reset", "Those are always sent. Nobody at the school can turn them off."],
  ["Nothing to configure yet", "No events that send notifications are set up for your school."],
  ["Somebody still sees the event after you turned email off", "Turning email off stops the email only. Every event still appears in the bell inside XVS."],
] as const;

export default function SettingsNotificationsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Notifications</strong> in <strong>Settings</strong> chooses which events also send an email to the people they concern. It applies to everyone at your school, or at one branch, not only to you. Your role needs the key to manage notification settings for this area to appear.</p>
        <GuideCallout tone="info" title="The bell always carries everything">
          Whatever you choose here, every event still appears in the bell inside XVS. These switches decide only whether an email goes out as well.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="whole-school-or-branch" title="Choose the whole school or a branch">
        <p>At a school with more than one branch, a picker sits at the top: <strong>Whole school</strong>, then the branches you work in. The line beside it says what your changes reach:</p>
        <GuideSteps>
          <GuideStep title="Whole school">Changes here apply to every branch, unless a branch has made its own choice.</GuideStep>
          <GuideStep title="One branch">Changes apply to that branch only. Emails that belong to no branch, such as those about the school as a whole, follow the whole school.</GuideStep>
          <GuideStep title="A branch administrator">Opens on their own branch. They can read the whole school&apos;s choices, and change them only for their branch.</GuideStep>
        </GuideSteps>
        <p>A branch can make its own choice for fee and payment emails (invoice issued, invoice overdue, payment received, statements, debit and credit notes) and for approval emails (a stage waiting, rejected, returned or finally approved). Every other email is set for the whole school only.</p>
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
        <p>For readers who manage approval paths, an <strong>Approvals</strong> panel sits above the list with one switch, <strong>Approval notifications</strong>, for the whole school. Turned off, approvals tell nobody, by email or in the bell, whatever the list says for each one.</p>
      </GuideSection>

      <GuideSection id="turn-email-on-or-off" title="Turn email on or off">
        <GuideSteps>
          <GuideStep title="Find the event">Scroll to the group the event belongs to.</GuideStep>
          <GuideStep title="Flip the switch">Turn the <strong>Email</strong> switch on or off. It saves straight away and XVS confirms whether the event will be emailed. There is no separate Save, so leaving the page loses nothing.</GuideStep>
        </GuideSteps>
        <p>At the whole school, a changed event reads <strong>Your school&apos;s choice.</strong> Until then it reads <strong>The XVS default.</strong> At a branch, the text says <strong>Set for this branch.</strong>, <strong>Follows your school&apos;s choice.</strong>, <strong>Follows the XVS default.</strong>, or <strong>Set for the whole school only</strong> for an email that is not about one branch.</p>
        <p>A branch&apos;s own choice has a <strong>Use the school&apos;s choice</strong> button beside it, which drops the branch&apos;s choice so it follows the whole school again.</p>
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
        <GuideCallout tone="tip" title="You are done when">Each event you care about shows the email setting you want, at the whole school or at the branch you chose, and its text says where that setting comes from.</GuideCallout>
      </GuideSection>
    </div>
  );
}
