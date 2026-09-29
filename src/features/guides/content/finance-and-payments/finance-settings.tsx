import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";
import { useGuideWords } from "../../guide-words";

const PROBLEMS = [
  { title: "Everything is greyed out", body: "You can read settings but not change them. The page says You have read-only access; changing needs the finance settings update permission." },
  { title: "Finance settings are protected", body: "You do not have the finance settings view permission. Ask whoever manages roles." },
  { title: "An account is missing from a mapping list", body: "Each role only offers active, postable accounts of the type it expects. Create or fix the account in the Chart of Accounts first." },
  { title: "Save stays disabled", body: "Nothing has changed, or a number is out of range. The message beside the button says which." },
] as const;

export default function FinanceSettingsArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Settings</strong>, at the foot of the Finance sidebar, holds the rules behind the school&apos;s books. Day-to-day work stays on the other screens; come here when a default needs to change.</p>
        <GuideChecklist items={[
          "You have agreed the change with the bursar or accountant.",
          "You know what the setting affects before you save it.",
        ]} />
        <GuideCallout tone="info" title="Every change is kept">
          Each section lists its <strong>Recent changes</strong>, and the full record stays in the finance audit trail.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="sections" title="What each section holds">
        <GuideSteps>
          <GuideStep title="Overview">A card per section, with its state, and the set of books the settings apply to.</GuideStep>
          <GuideStep title="Fiscal calendar">How posting periods are controlled. <strong>Open period workbench</strong> takes you to Fiscal Periods, where years and periods are managed.</GuideStep>
          <GuideStep title="Accounting defaults">Which account each posting role uses, such as receivables, customer credit or bad debt.</GuideStep>
          <GuideStep title="Documents">Billing defaults for invoices and receipts.</GuideStep>
          <GuideStep title="Banking and cash">Defaults for bank matching, receipt allocation and petty cash alerts.</GuideStep>
          <GuideStep title="Reference data">Links to the Chart of accounts, Tax codes and Cost centres.</GuideStep>
          <GuideStep title="Approvals">Which finance documents go through an approval path. <strong>Manage workflows</strong> opens the approval templates, for people allowed to see them.</GuideStep>
          <GuideStep title="Fee due dates">When fee bills fall due. It has a guide of its own.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="accounting-defaults" title="Accounting defaults">
        <p>Each posting role shows <strong>Default</strong> with the starter account&apos;s code, or <strong>Custom</strong> when changed. Pick a different account from its list and select <strong>Save changes</strong>; posting uses the new account straight away. The undo arrow beside a role drops an unsaved change.</p>
        <GuideCallout tone="danger" title="Change a mapping only with your accountant">
          Every invoice, receipt and write-off posts through these roles. Pointing receivables at the wrong account puts every fee bill from then on in the wrong place.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="documents" title="Documents">
        <GuideSteps>
          <GuideStep title="Default invoice due days">The due date given to an invoice raised without one, including invoices generated from a fee structure.</GuideStep>
          <GuideStep title="Primary collection account">The bank account printed on invoices and receipts as the place to pay.</GuideStep>
          <GuideStep title="Term collection target (%)">The share of a {w.term}&apos;s fees you aim to have collected by its end. It is drawn as the target on the dashboard&apos;s collection curve.</GuideStep>
          <GuideStep title="Default invoice narration, and two switches">The narration pre-fills manual invoices. <strong>Post manual invoices immediately</strong> decides whether a manual invoice posts or waits as a draft. <strong>Allow customer opening balances</strong> decides whether a customer can be created with an amount already owed.</GuideStep>
        </GuideSteps>
        <p>Select <strong>Save document policy</strong>. The section also links to <strong>Fee structures</strong> and <strong>Dunning policies</strong>.</p>
      </GuideSection>

      <GuideSection id="banking-and-cash" title="Banking and cash">
        <p><strong>Reconciliation date tolerance (days)</strong> lets automatic matching pair lines whose dates differ by up to that many days. <strong>Default receipt allocation</strong> is <strong>Oldest due first</strong> or <strong>Largest balance first</strong>. <strong>Petty cash low-balance threshold (%)</strong> flags a float for a top-up. <strong>Allow grouped automatic matches</strong> lets one bank line match several ledger lines with the same total. Select <strong>Save banking policy</strong>. A choice made on the screen itself always wins over these defaults.</p>
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
        <GuideCallout tone="tip" title="Settings are in order when">
          The printed collection account is the one parents should pay into, the default due days match your policy, the account mappings are the ones your accountant agreed, and Recent changes shows nothing you cannot explain.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
