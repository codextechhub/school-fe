import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The code is refused", body: "Use exactly four digits, starting with the account type's number: 1 assets, 2 liabilities, 3 equity, 4 income, 5 expenses." },
  { title: "An account is missing from a picker", body: "Pickers offer only active, postable accounts of the right type. Check its Settings tab, and that Postable was ticked when it was made." },
  { title: "An account cannot be renamed", body: "Editing needs the update-account permission. Without it the Settings tab reads Read-only." },
] as const;

export default function ChartOfAccountsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The school&apos;s books come with a starter chart of accounts. Most schools only add to it: an income account per kind of fee, an expense account per kind of spending, a tax code or two, and cost centres for the departments that spend.</p>
        <GuideChecklist items={[
          "Your accountant has agreed the accounts you need.",
          "You have checked the chart for an account that already does the job.",
        ]} />
        <GuideCallout tone="warning" title="Accounts are used everywhere at once">
          Fee structures, invoices, payroll and every report read these accounts. Agree changes with your accountant rather than adding accounts on the fly.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="read-the-chart" title="Read the chart">
        <p>Open <strong>Chart of Accounts</strong>. <strong>Tree</strong> shows accounts under their groups; <strong>Flat</strong> lists them one per row. Filter by type or search by code or name. Accounts tagged <strong>CTRL</strong> are control accounts, such as <strong>Accounts receivable (what customers owe)</strong>, which holds what parents owe: they are fed by Receivables and similar screens, not by hand.</p>
        <p>A starter account known by an accounting term has the plain words beside it: <strong>Accounts receivable (what customers owe)</strong>, <strong>Accounts payable (what is owed to suppliers)</strong>, <strong>WHT payable (withholding tax)</strong> and <strong>Gateway clearing (online payments not yet in the bank)</strong>. An account the school has renamed keeps its own name.</p>
        <p>Select an account to see its balance and its <strong>Activity</strong>, a <strong>T-account</strong> view, and any <strong>Sub-accounts</strong>. A group account shows the balance of everything under it.</p>
      </GuideSection>

      <GuideSection id="add-an-account" title="Add an account">
        <GuideSteps>
          <GuideStep title="Select New account">Enter a four-digit <strong>Code</strong>. The first digit sets the type: 4 for income, 5 for expenses, and so on. <strong>Account type</strong> fills in from it.</GuideStep>
          <GuideStep title="Name it">Use a name anyone would understand, such as <em>Tuition revenue</em> or <em>Exam fees</em>. <strong>Subtype</strong> is optional.</GuideStep>
          <GuideStep title="Place it">Choose a <strong>Parent account</strong> to file it under a group. Keep <strong>Postable (accepts entries)</strong> ticked for an account that invoices and journals post to.</GuideStep>
          <GuideStep title="Select Create account">Change the name or switch it off later on its <strong>Settings</strong> tab.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="tax-codes" title="Tax codes">
        <p>Open <strong>Tax Codes</strong> and select <strong>New tax code</strong>. Enter the <strong>Code</strong>, <strong>Name</strong> and <strong>Rate (%)</strong>, and the accounts tax collected and paid are posted to. Tick <strong>Recoverable (input tax offsets output)</strong> only where your accountant says the tax can be reclaimed. A fee line with no tax code is treated as exempt.</p>
      </GuideSection>

      <GuideSection id="cost-centres" title="Cost centres">
        <p>A cost centre tags spending and income with the department or branch that owns it, so reports can show, for example, what the science department or the Ikeja Branch spent. Open <strong>Cost Centres</strong> and select <strong>New cost centre</strong>, then enter a <strong>Code</strong>, a <strong>Name</strong> and, optionally, a <strong>Parent</strong>. Untick Active to retire one; past entries keep their tag.</p>
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
        <GuideCallout tone="tip" title="Your setup is ready when">
          Every fee has an income account, every kind of spending has an expense account, the tax codes you bill with exist, and the departments that report on spending have cost centres.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
