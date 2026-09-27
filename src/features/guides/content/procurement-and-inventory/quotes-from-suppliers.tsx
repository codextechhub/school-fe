import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function QuotesFromSuppliersArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>For a bigger purchase, such as new classroom furniture or a year&apos;s supply of diesel, the school asks several suppliers to quote before choosing one. A request for quotation (RFQ) lists what is wanted without prices. Each supplier&apos;s answer is recorded as a quotation, and the chosen one becomes a purchase order.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations, then RFQs under Sourcing.",
          "The suppliers you want to invite are set up under Vendors, active and not on hold.",
          "If it started as a requisition, that requisition is Approved.",
          "Know how many suppliers your school requires to quote. It is set in Procurement Settings.",
        ]} />
      </GuideSection>

      <GuideSection id="prepare-the-rfq" title="Prepare the RFQ">
        <GuideSteps>
          <GuideStep title="Select New RFQ">Give it a <strong>Title</strong>. To start from a requisition, choose it in <strong>From requisition</strong> and its lines fill in.</GuideStep>
          <GuideStep title="Set the dates">Enter the <strong>Issue date</strong> and <strong>Response due</strong>. The response date cannot be before the issue date. A <strong>Budget estimate</strong> is optional.</GuideStep>
          <GuideStep title="Invite suppliers">Under <strong>Invite vendors</strong>, add each supplier. Only active suppliers that are not on hold or KYC-rejected are offered.</GuideStep>
          <GuideStep title="Describe what you want">Add the lines with description and quantity. Lines carry no price; the suppliers give the prices.</GuideStep>
          <GuideStep title="Save or issue">Select <strong>Save Draft</strong>, or <strong>Create &amp; Issue</strong> to send it straight away. An RFQ needs at least one line and one invited supplier to be issued.</GuideStep>
        </GuideSteps>
        <p>A saved draft is issued with <strong>Issue</strong> in its drawer. Issued RFQs show as <strong>Open</strong>.</p>
      </GuideSection>

      <GuideSection id="manage-an-open-rfq" title="Manage an open RFQ">
        <p>The <strong>Vendors invited</strong> tab shows each supplier&apos;s invitation and whether they have quoted.</p>
        <GuideChecklist items={[
          "Resend: sends the invitation to a supplier again.",
          "Extend: gives one supplier a later deadline without changing it for the others.",
          "Amend: publishes a change to every invited supplier, with a Change summary. Tick Require a new response if earlier quotes no longer fit.",
        ]} />
      </GuideSection>

      <GuideSection id="record-quotations" title="Record the quotations">
        <GuideSteps>
          <GuideStep title="Select New Quotation">On <strong>Quotations</strong>, choose the <strong>RFQ</strong>, then the <strong>Vendor</strong>. Only invited suppliers who have not yet quoted are offered.</GuideStep>
          <GuideStep title="Enter their offer">Fill in the <strong>Quote date</strong>, <strong>Valid until</strong>, <strong>Lead time (days)</strong>, the supplier&apos;s <strong>Reference</strong>, and a price for each line. Select <strong>Create quotation</strong>.</GuideStep>
          <GuideStep title="Submit it">Open the quotation and select <strong>Submit</strong>. A submitted quotation is a firm offer in contention.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="compare-and-award" title="Compare and award">
        <GuideSteps>
          <GuideStep title="Select Compare">The <strong>Compare quotations</strong> dialog sets the bids for one RFQ side by side: total, lead time, validity and the unit price for each line. The cheapest is marked <strong>Lowest bid</strong>.</GuideStep>
          <GuideStep title="Weigh more than price">Compare shows only the recorded figures. Quality, past delivery and after-sales service are for you to judge; Vendor Performance under Analytics can help.</GuideStep>
          <GuideStep title="Award">Select <strong>Award</strong> on the chosen quotation and confirm. The school&apos;s minimum number of quotes is checked, the other quotations are rejected, and a draft purchase order is raised from the winning lines.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Below the minimum">If fewer suppliers quoted than your school requires, the award is refused unless someone with override access gives a written reason, which is kept in the audit record.</GuideCallout>
        <p>The draft purchase order then goes through approval like any other. See the guide on ordering, receiving and paying.</p>
      </GuideSection>

      <GuideSection id="close-or-cancel" title="Close or cancel without an award">
        <p><strong>Close</strong> finishes an open RFQ without an award and rejects the quotations on it. <strong>Cancel RFQ</strong> abandons a draft or open RFQ and cannot be undone. Neither asks for a reason, so note why in the RFQ before you do it.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "Issue is refused: add at least one line and one invited supplier.",
          "A supplier is not offered: it is inactive, on hold, or KYC-rejected.",
          "Award is missing: the quotation is not Submitted, has expired, or the RFQ is already awarded.",
          "A supplier is missing from New Quotation: they were not invited, or have already quoted.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The RFQ shows Awarded, the winning quotation shows the purchase order it raised, and that purchase order is on its way to approval.</GuideCallout>
      </GuideSection>
    </div>
  );
}
