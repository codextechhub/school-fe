import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const STAGES = [
  ["Purchase order", "Commits the school to a supplier, from an approved requisition. Approved before it is sent."],
  ["Goods receipt", "Records what actually arrived, what was accepted and what was sent back."],
  ["Vendor invoice", "The supplier's bill, matched against the order and the receipt, approved, then posted."],
  ["Vendor payment", "Pays one or more posted bills, approved, then posted."],
] as const;

export default function OrderReceiveAndPayArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>This guide follows an approved requisition to a paid supplier. It is usually shared: the bursar or procurement officer raises the order, the stores keeper records the delivery, and the bursar records and pays the bill. Each person needs the matching Procurement access.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STAGES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <GuideChecklist items={[
          "The requisition shows Approved.",
          "The supplier is set up under Vendors, active, and not on hold.",
          "You have the delivery note and the supplier's invoice to hand when you reach those steps.",
        ]} />
      </GuideSection>

      <GuideSection id="raise-the-purchase-order" title="Raise the purchase order">
        <GuideSteps>
          <GuideStep title="Select New Purchase Order">On <strong>Purchase Orders</strong>, select <strong>New Purchase Order</strong> and choose the <strong>Approved requisition</strong>. Its lines are copied in and cannot be changed here.</GuideStep>
          <GuideStep title="Fill in the order">Choose the <strong>Vendor</strong>, the <strong>Order date</strong>, and if known the <strong>Expected delivery</strong>, <strong>Payment terms</strong>, contract and <strong>Delivery address</strong>. Suppliers that are inactive, on hold or failed their checks are not offered.</GuideStep>
          <GuideStep title="Send it for approval">Select <strong>Create &amp; Review Approval</strong>, or <strong>Save Draft</strong> and later <strong>Submit for Approval</strong>. In the <strong>Raise this purchase order for approval?</strong> dialog you can tick <strong>Automatically email this PO to the vendor when fully approved</strong>. Select <strong>Raise for Approval</strong>.</GuideStep>
          <GuideStep title="Email the supplier">After full approval, <strong>Email Vendor</strong> sends the order as a PDF. The <strong>Vendor Email</strong> tab shows what was sent and to whom. <strong>Print</strong> gives a copy for the file.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="The badge can still read Draft">While a purchase order waits for approval, its drawer shows <strong>Locked while approval is pending</strong>, and it can still carry a Draft badge. Use the <strong>Pending Approval</strong> tab or the approval trail to see where it stands.</GuideCallout>
      </GuideSection>

      <GuideSection id="record-the-delivery" title="Record the delivery">
        <GuideSteps>
          <GuideStep title="Select New Goods Receipt">On <strong>Goods Receipts</strong>, select <strong>New Goods Receipt</strong> and choose the order in <strong>Against PO</strong>. The vendor fills in from it.</GuideStep>
          <GuideStep title="Enter what arrived">Set the <strong>Received date</strong> and the delivery note or waybill number as <strong>Reference</strong>. For each line, enter the <strong>Accepted qty</strong> and <strong>Rejected qty</strong>. Together they cannot exceed what is still outstanding.</GuideStep>
          <GuideStep title="Note any problems">Under <strong>Inspection notes</strong>, record damage, short delivery or why items were rejected.</GuideStep>
          <GuideStep title="Post it">Select <strong>Create &amp; Post</strong>, or save a draft and later <strong>Post Receipt</strong>. Only accepted quantities count. For a part delivery, <strong>Receive Remaining</strong> on the posted receipt starts the next one.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="A posted receipt cannot be edited">Count before you post. The screen has no way to reverse a receipt.</GuideCallout>
      </GuideSection>

      <GuideSection id="record-the-invoice" title="Record and post the supplier's bill">
        <GuideSteps>
          <GuideStep title="Select Record Invoice">On <strong>Vendor Invoices</strong>, select <strong>Record Invoice</strong>. Choose <strong>PO-backed invoice</strong>, then the <strong>Vendor</strong> and <strong>Purchase order</strong>, and enter the supplier&apos;s own <strong>Vendor invoice #</strong>, <strong>Invoice date</strong> and <strong>Due date</strong>.</GuideStep>
          <GuideStep title="Watch for duplicates">If the same number is already recorded for that supplier, the drawer says so. Do not record a bill twice.</GuideStep>
          <GuideStep title="Check the match">Open the <strong>3-Way Match</strong> tab, or select <strong>Run Match</strong>. It compares what was ordered, received and billed. <em>3-way match passed</em> is what you want; <em>Under received - blocks posting</em> usually means a delivery has not been received yet.</GuideStep>
          <GuideStep title="Attach the paper bill">After saving, add the scanned invoice under <strong>Attachments</strong>.</GuideStep>
          <GuideStep title="Submit, then post">Select <strong>Submit for Approval</strong>. Once approved, select <strong>Post Invoice</strong> to record what the school owes.</GuideStep>
        </GuideSteps>
        <p>A bill with no purchase order, such as a plumber&apos;s call-out, uses <strong>Direct invoice</strong> instead, if your school allows bills without a purchase order.</p>
      </GuideSection>

      <GuideSection id="pay-the-supplier" title="Pay the supplier">
        <GuideSteps>
          <GuideStep title="Select New Payment">On <strong>Vendor Payments</strong>, select <strong>New Payment</strong>, choose the <strong>Vendor</strong>, the <strong>Method</strong>, the <strong>Payment date</strong> and the account to <strong>Pay from</strong>, and add the bank <strong>Reference</strong>.</GuideStep>
          <GuideStep title="Choose the bills">Under <strong>Outstanding invoices</strong>, enter how much of each posted bill this payment settles. The totals show <strong>Gross settled</strong>, <strong>WHT withheld</strong> and <strong>Net cash paid</strong>.</GuideStep>
          <GuideStep title="Submit, then post">Select <strong>Create &amp; Submit</strong>. Once approved, select <strong>Post Payment</strong>. Bill balances change only when the payment is posted.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Reverse only when the money did not go">An approved payment that has not been posted can be cancelled with <strong>Cancel</strong>. A posted payment can be undone with <strong>Reverse</strong>, which restores the bill balances. Use it only for a payment that genuinely failed or was recorded in error.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "The requisition is not offered for a purchase order: it is not yet Approved.",
          "The supplier is not offered: it is inactive, on hold, or failed its checks. See Vendors.",
          "Post Invoice is missing: the bill is not yet approved, or the match blocks posting.",
          "No bills appear on a new payment: the supplier has no posted invoice with a balance.",
          "A document waits with nobody to approve it: ask whoever manages approvals to add an approver rather than choosing Continue anyway.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The goods receipt is posted, the invoice shows Paid, and the payment is posted with the bank reference.</GuideCallout>
      </GuideSection>
    </div>
  );
}
