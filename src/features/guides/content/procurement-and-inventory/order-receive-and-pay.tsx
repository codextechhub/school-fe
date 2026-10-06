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
        <GuideCallout tone="info" title="While it waits for approval">A purchase order with its approvers reads <strong>Pending Approval</strong>, on its row and in its drawer, and the drawer says <em>With the approver. Nobody can change it until they decide or send it back.</em> The <strong>Pending Approval</strong> tab lists it, and the approval trail shows which step it is on.</GuideCallout>
        <GuideCallout tone="info" title="When an approver sends a document back">This applies to purchase orders, vendor invoices, vendor payments and vendor credit notes alike. The person who sent it for approval sees <strong>Sent back to you</strong> in its drawer, with the approver&apos;s reason. <strong>Edit</strong> corrects it in place, and <strong>Resume</strong> sends the corrected version back into the same approval. Nobody else gets these buttons. Meanwhile a badge reading <strong>Sent back</strong>, in its own colour, shows on its row and in its drawer: on a purchase order it is the status badge, and on invoices, payments and credit notes it is the approval badge. A document still with its approver keeps its usual word.</GuideCallout>
      </GuideSection>

      <GuideSection id="record-the-delivery" title="Record the delivery">
        <GuideSteps>
          <GuideStep title="Select New Goods Receipt">On <strong>Goods Receipts</strong>, select <strong>New Goods Receipt</strong> and choose the order in <strong>Against PO</strong>. The vendor fills in from it.</GuideStep>
          <GuideStep title="Enter what arrived">Set the <strong>Received date</strong> and the delivery note or waybill number as <strong>Reference</strong>. For each line, enter the <strong>Accepted qty</strong> and <strong>Rejected qty</strong>. Together they cannot exceed what is still outstanding.</GuideStep>
          <GuideStep title="Note any problems">Under <strong>Inspection notes</strong>, record damage, short delivery or why items were rejected.</GuideStep>
          <GuideStep title="Post it">Select <strong>Create &amp; Post</strong>, or save a draft and later <strong>Post Receipt</strong>. Only accepted quantities count. For a part delivery, <strong>Receive Remaining</strong> on the posted receipt starts the next one.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="A posted receipt cannot be edited">Count before you post. Goods that turn out to be wrong after posting are sent back with a goods return, below.</GuideCallout>
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
          <GuideStep title="Choose the bills">Under <strong>Outstanding invoices</strong>, enter how much of each posted bill this payment settles. The totals show <strong>Gross settled</strong>, <strong>WHT withheld</strong> and <strong>Net cash paid</strong>. WHT withheld is worked out from the WHT code on the bills. If you type a different figure, it reads <em>Entered by hand</em>; <strong>Work it out again</strong> puts the worked-out figure back, on a new payment or when you edit one.</GuideStep>
          <GuideStep title="Submit, then post">Select <strong>Create &amp; Submit</strong>. Once approved, select <strong>Post Payment</strong>. Bill balances change only when the payment is posted.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Reverse only when the money did not go">An approved payment that has not been posted can be cancelled with <strong>Cancel</strong>. A posted payment can be undone with <strong>Reverse</strong>, which restores the bill balances. Use it only for a payment that genuinely failed or was recorded in error.</GuideCallout>
      </GuideSection>

      <GuideSection id="correct-a-bill" title="Correct a posted bill">
        <p>A posted bill is never edited. How it is corrected depends on whether anything has been paid or credited on it.</p>
        <GuideSteps>
          <GuideStep title="Nothing paid or credited yet: void it">Open the bill and select <strong>Void</strong>, then <strong>Void bill</strong>. Its posting is reversed, the purchase order gets its billed quantities back, and the bill stays in history as voided. Use it for a bill keyed in error or sent twice.</GuideStep>
          <GuideStep title="Something paid or credited: raise a credit note">Select <strong>Credit note</strong> on the bill. Give the <strong>Credit note date</strong>, the supplier&apos;s own number under <strong>Vendor reference</strong>, and a <strong>Reason</strong>, such as <em>10 reams returned damaged</em>. Under <strong>What to credit</strong>, choose <strong>Whole bill</strong> for everything it has left, <strong>By amount</strong> for a price allowance spread across it, or <strong>By line</strong> for a quantity or value on named lines.</GuideStep>
          <GuideStep title="Approve and post the credit note">It is saved as a draft. Select <strong>Submit for approval</strong>; approvers decide it under Workflow, Approvals, where large credit notes (₦500,000 and above, unless your school changed it) also need a senior approver. Once approved, select <strong>Post credit note</strong>.</GuideStep>
        </GuideSteps>
        <p>Posting lowers what the bill owes. If the bill was already paid, the credit stays as that branch&apos;s credit with the supplier: say Ikeja is credited ₦50,000 on a paid stationery bill, the ₦50,000 waits for Ikeja&apos;s next bill from that supplier. Use <strong>Apply credit</strong> on the credit note to put it on an open bill, <strong>Oldest bills first</strong> or by choosing bills.</p>
        <p>Every credit note is listed on <strong>Vendor Invoices</strong> under the <strong>Credit notes</strong> view, and a bill&apos;s own notes are on its <strong>Credit Notes</strong> tab. A posted credit note raised in error is undone with <strong>Void</strong>, which reverses it and every bill it was applied to.</p>
      </GuideSection>

      <GuideSection id="return-goods" title="Send goods back to the supplier">
        <GuideSteps>
          <GuideStep title="Open the posted goods receipt and select Return">Choose <strong>Choose quantities</strong> and enter how many of each line go back, or <strong>Everything still on it</strong> to undo a receipt entered in error.</GuideStep>
          <GuideStep title="Date it and say why">Set the <strong>Return date</strong> and fill in <strong>Why the goods are going back</strong>, such as <em>20 chairs arrived broken</em>. Select <strong>Return goods</strong>.</GuideStep>
        </GuideSteps>
        <p>Stock falls by what goes back, at the receipt&apos;s cost. The receipt lists its returns under <strong>Returns</strong>.</p>
        <GuideCallout tone="warning" title="Billed goods take a credit note, not a return">
          A return cannot reach goods the supplier has already billed: raise a credit note on the bill instead. A goods return is never voided. If goods went back in error, or come back, receive them again against the order.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="opening-bills" title="Bring in bills owed from before">
        <p>When the school moves onto these books, carry in each supplier bill still unpaid, so what the school owes and its aging start out right.</p>
        <GuideSteps>
          <GuideStep title="Select Opening bills">On <strong>Vendor Invoices</strong>. The button needs its own permission.</GuideStep>
          <GuideStep title="Fill in the rows">Select <strong>Template</strong>, or paste rows into the box. One row per unpaid bill: <strong>vendor</strong> (the supplier&apos;s code), <strong>invoice_date</strong> (when the supplier raised it), <strong>due_date</strong>, <strong>vendor_reference</strong>, <strong>amount</strong> (still owed, in naira), and <strong>narration</strong>. Where you are asked for a branch, the template has a <strong>branch</strong> column too.</GuideStep>
          <GuideStep title="Choose the file and import">Select <strong>Choose CSV file</strong>, check the list, and select <strong>Import</strong> with the number of bills. At most 500 go in one import.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="All or nothing, and no approval">
          One bad row refuses the whole file and nothing is imported. Opening bills post straight to what the school owes, with no approval, so check them first. Bills dated on or after the day the books went live are refused: record those as ordinary bills.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "The requisition is not offered for a purchase order: it is not yet Approved.",
          "The supplier is not offered: it is inactive, on hold, or failed its checks. See Vendors.",
          "Post Invoice is missing: the bill is not yet approved, or the match blocks posting.",
          "Edit and Resume are missing on a document sent back: only the person who sent it for approval gets them, and Edit also needs a role that may edit that kind of document.",
          "No bills appear on a new payment: the supplier has no posted invoice with a balance.",
          "A document waits with nobody to approve it: ask whoever manages approvals to add an approver rather than choosing Continue anyway.",
          "Void on a bill offers a credit note instead: money has been paid, or a credit note has settled part of it. Credit what is left.",
          "A goods return is refused for billed goods: raise a credit note on the bill first.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The goods receipt is posted, the invoice shows Paid, and the payment is posted with the bank reference.</GuideCallout>
      </GuideSection>
    </div>
  );
}
