import { GuideCallout, GuideChecklist, GuideSection } from "../../article-components";

const SECTIONS = [
  ["General defaults", "The Default payment terms given to new suppliers, and the Default delivery address."],
  ["Purchasing policy", "Whether suppliers must be KYC verified or may still be pending, the default requisition lead days, and whether a goods receipt needs a purchase order."],
  ["Sourcing and lifecycle", "Default RFQ response days, how soon an RFQ counts as closing, and the contract renewal notice days."],
  ["Competitive governance", "The minimum number of suppliers invited and quotations submitted before an award."],
  ["Invoice matching", "How far quantity and price may differ before a bill is blocked, whether bills without a purchase order are allowed, and their spend limit."],
  ["Accounting integration", "Which accounts purchasing posts to. They are owned by Finance and changed there with Edit in Finance."],
  ["Approvals", "Which approval path each purchasing document follows. They are changed under Workflow with Manage workflows."],
  ["Reference data", "Shortcuts to vendors, categories, catalogue, contracts and stock items."],
] as const;

export default function ProcurementSettingsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Procurement Settings</strong> holds the school&apos;s purchasing rules: how many quotes a big purchase needs, how strictly a supplier&apos;s bill must match the delivery, and the defaults new records start with.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations, then Settings under Administration in the Procurement sidebar.",
          "Agree any change with the bursar and the proprietor first.",
          "If the page says you have read-only access, you can read the rules but not change them.",
        ]} />
      </GuideSection>

      <GuideSection id="find-your-way" title="Find the right section">
        <p><strong>Overview</strong> shows the health of each section at a glance. The others each hold one area:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SECTIONS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="change-a-rule" title="Change a rule">
        <p>Open the section, change the value, and select its save button, such as <strong>Save purchasing policy</strong> or <strong>Save matching policy</strong>. Only the values you changed are recorded, and <strong>Recent changes</strong> shows who changed what.</p>
        <GuideCallout tone="warning" title="Rules apply from now on">A new rule is checked the next time a document reaches it: the next award, the next match, the next supplier record. Documents already finished keep what they had.</GuideCallout>
        <p>For example, raising <strong>Minimum submitted quotations</strong> from 1 to 3 means the next award on any open RFQ needs three submitted quotes, or a written override from someone allowed to give one.</p>
      </GuideSection>

      <GuideSection id="rules-you-cannot-switch-off" title="Rules you cannot switch off">
        <p>Some controls always apply, and Purchasing policy lists them: a purchase order needs an approved requisition, a supplier must be verified before it is paid, and a payment must be approved before it is posted.</p>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Each section you changed shows the new value, and Recent changes records it against your name.</GuideCallout>
      </GuideSection>
    </div>
  );
}
