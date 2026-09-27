import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ProcurementOverviewAndReportsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The <strong>Procurement overview</strong> is the first screen in Procurement. It shows where the school&apos;s buying stands: what is waiting, what is owed and what is running low. The reports under <strong>Analytics</strong> go deeper for the bursar and the proprietor.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations. The overview opens first.",
          "Each card appears only when your role can read the documents behind it, so two colleagues may see different cards.",
          "The Analytics reports need procurement analytics access.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-overview" title="Read the overview">
        <p>The <strong>Overview</strong> tab starts with the headline figures: spend for the period, <strong>Open orders</strong>, <strong>Waiting on you</strong>, <strong>Overdue bills</strong> and <strong>Active vendors</strong>. Below them:</p>
        <GuideChecklist items={[
          "Purchase to payment: how many requisitions, RFQs, orders, unbilled deliveries and bills sit at each stage.",
          "Committed vs spent: what the school has ordered against what it has actually been billed.",
          "Waiting on your approval: your own queue, with a link to Approvals.",
          "Control exceptions: failed matches, prices above the order, bills from suppliers on hold, and deliveries with no bill after 30 days.",
          "Bills falling due and Contracts ending soon.",
        ]} />
        <p><strong>New requisition</strong> and <strong>New purchase order</strong> at the top start either task straight away, if your role allows it.</p>
      </GuideSection>

      <GuideSection id="other-views" title="Spend and stock views">
        <GuideSteps>
          <GuideStep title="Spend &amp; suppliers">Shows spend against plan, a <strong>Vendor scorecard</strong>, open RFQs, what competition saved, spend by branch, and how long buying takes.</GuideStep>
          <GuideStep title="Stock &amp; receiving">Shows stock value, items below their reorder level or out of stock, expected deliveries and what was issued to departments. Under <strong>Running low</strong>, <strong>Draft a requisition for all</strong> starts one draft requisition for every low item, for you to review and submit.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="use-the-reports" title="Use the Analytics reports">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["AP Aging", "What the school owes suppliers, grouped by how late it is. Choose an As of date, and select a supplier to see its open bills."],
            ["GR/IR & Control", "Goods received but not yet billed, and bills for goods not yet received. A difference to investigate usually means a missing receipt or invoice."],
            ["Spend", "Posted bills by category, by supplier and by month, between the From and To dates."],
            ["Vendor Performance", "On-time delivery and payment times from posted records, and each supplier's latest assessment."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="assess-a-supplier" title="Assess a supplier">
        <p>On <strong>Vendor Performance</strong>, select <strong>New assessment</strong>, choose the <strong>Vendor</strong>, and score <strong>On-Time Delivery</strong>, <strong>Quality Acceptance</strong>, <strong>Invoice Accuracy</strong> and <strong>Responsiveness</strong>. The <strong>Weighted overall score</strong> updates as you go. Add <strong>Notes</strong> and select <strong>Save assessment</strong>.</p>
        <GuideCallout tone="warning" title="An assessment cannot be changed">Once saved it is permanent. Record a new assessment later if things improve.</GuideCallout>
      </GuideSection>

      <GuideSection id="act-on-what-you-find" title="Act on what you find">
        <p>The reports show problems; the fix happens on the document itself. An overdue bill is paid on <strong>Vendor Payments</strong>, a missing delivery is received on <strong>Goods Receipts</strong>, and a match failure is resolved on the bill in <strong>Vendor Invoices</strong>.</p>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">You know what is waiting on you, what is overdue, and which document to open to deal with each.</GuideCallout>
      </GuideSection>
    </div>
  );
}
