import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Run reminders now raised nothing", body: "No invoice has reached a stage's days overdue yet, or no policy is active. Check the Policies tab." },
  { title: "A parent got no email", body: "The customer has no billing email, or the stage uses In-app only. Check the customer's Contact tab and the stage's channels." },
  { title: "The Send button is missing", body: "It shows only on notices still Scheduled, for people who can send reminders." },
  { title: "Overdue looks wrong", body: "Overdue counts from the invoice's due date. A bill raised without a due date takes one from Finance Settings, Documents." },
] as const;

export default function FeeRemindersArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Dunning</strong> is the school&apos;s ladder of reminders for unpaid fees: a friendly note on the due date, a firmer one a week later, and so on. It works from each invoice&apos;s due date.</p>
        <GuideChecklist items={[
          "The school has agreed how many reminders go out and when.",
          "Parents' billing emails are correct on their customer records.",
          "Invoices carry the right due dates.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-aging" title="See who is overdue">
        <p>The cards at the top split unpaid fees by age: <strong>Due soon (0–7d)</strong>, <strong>Overdue 1–30d</strong>, <strong>Overdue 31–60d</strong> and <strong>Overdue 60d+</strong>, each with the number of invoices.</p>
      </GuideSection>

      <GuideSection id="set-up-a-policy" title="Set up the reminder ladder">
        <GuideSteps>
          <GuideStep title="Open the Policies tab">Select <strong>New policy</strong>, or <strong>Edit</strong> on an existing one. <strong>Configure cadence</strong> at the top takes you to the same tab.</GuideStep>
          <GuideStep title="Name it and set it as default">Give a <strong>Policy name</strong>, and tick <strong>Active</strong> and <strong>Default policy</strong>.</GuideStep>
          <GuideStep title="Add a stage per reminder">Select <strong>Add stage</strong> for each rung. Give it a <strong>Template name</strong>, the <strong>Days overdue</strong> it fires at (0 means the due date) and its <strong>Channels</strong>: Email, In-app or both.</GuideStep>
          <GuideStep title="Save the policy">Stages fire when an invoice reaches the days-overdue threshold. A run raises one notice per invoice, at the highest stage it has reached.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="run-and-send" title="Raise and send reminders">
        <GuideSteps>
          <GuideStep title="Select Run reminders now">Notices are raised for overdue invoices and appear on the <strong>Reminder queue</strong> tab as <strong>Scheduled</strong>. <strong>Generate notices</strong> on a policy card does the same for that one policy.</GuideStep>
          <GuideStep title="Review the queue">Each row shows the customer, the stage, the channel and how many days overdue. <strong>Cancel</strong> a notice that should not go, such as for a parent who paid this morning.</GuideStep>
          <GuideStep title="Send">Select <strong>Send</strong> on a row, check the customer, invoice and channel, then <strong>Send reminder</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="A sent reminder cannot be recalled">
          Check payments recorded today before sending. A reminder to a parent who has just paid costs goodwill.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="one-parent" title="Remind one parent">
        <p>For a single family, open the customer and select <strong>Run reminders</strong>: each of their overdue invoices moves up one reminder level, and running it again the same day changes nothing. From an invoice, the <strong>Reminders</strong> tab has <strong>Send reminder</strong> for that one bill and lists the reminders already sent.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(({ title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="It is working when">
          One active default policy holds the agreed ladder, the queue is reviewed before each send, and each invoice&apos;s Reminders tab shows what its parent has been sent.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
