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
        <p>A deadline is a day and a time. Pick the day, then the time on your school&apos;s clock; the line under it says whose time it is, for example <em>In Ikeja Branch&apos;s time.</em> When amending, a new deadline needs both a day and a time: a half-filled one reads <em>Give the new deadline both a day and a time, or leave both empty.</em></p>
      </GuideSection>

      <GuideSection id="record-quotations" title="Record the quotations">
        <p>Invited suppliers can use the emailed link and verification code to submit their own quotations. The form shows the RFQ version and the local closing date and time. A supplier can enter a quantity offered below the requested quantity, mark an unavailable line as no-bid, and view uploaded images in a gallery. Whole quantities display without trailing decimals. Submission sends the RFQ buyer an in-app alert.</p>
        <GuideSteps>
          <GuideStep title="Select New Quotation">On <strong>Quotations</strong>, choose the <strong>RFQ</strong>, then the <strong>Vendor</strong>. Only invited suppliers who have not yet quoted are offered.</GuideStep>
          <GuideStep title="Enter their offer">Fill in the <strong>Quote date</strong>, <strong>Valid until</strong>, <strong>Lead time (days)</strong>, the supplier&apos;s <strong>Reference</strong>, and a price for each line. Select <strong>Create quotation</strong>.</GuideStep>
          <GuideStep title="Submit it">Open the quotation and select <strong>Submit</strong>. A submitted quotation is a firm offer in contention.</GuideStep>
          <GuideStep title="Review the evidence">Open the submitted quotation, select <strong>Evidence</strong>, then select <strong>View image</strong> under Attachments. Use <strong>Previous</strong> and <strong>Next</strong> to inspect each image without leaving the quotation.</GuideStep>
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

      <GuideSection id="buy-together" title="Buy together across branches">
        <p>When two branches need the same thing, one RFQ gets one set of quotes. Say Ikeja has an approved requisition for 60 chairs and Lekki one for 40: suppliers see one line of 100 chairs, and the award raises one purchase order for each branch, 60 for Ikeja and 40 for Lekki, so each branch receives, owes and reports its own.</p>
        <GuideSteps>
          <GuideStep title="Select New RFQ and choose Several branches together">Under <strong>Who is buying</strong>. It is offered at a school with more than one branch, to a buyer who works in at least two of them.</GuideStep>
          <GuideStep title="Pick the requisition lines">Under <strong>Approved requisition lines to buy together</strong>, tick each requisition, or single lines of it. Search by item or requisition number; what you have already picked stays picked. Lines from at least two branches are needed.</GuideStep>
          <GuideStep title="Check what suppliers will see">The same items are put on one RFQ line, with each branch&apos;s quantity shown underneath. You may reword the line&apos;s description.</GuideStep>
          <GuideStep title="Finish as usual">Set the dates, invite the suppliers, then save or issue. Quotes, comparing and the award work as for any RFQ.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="What buying together cannot do">
          Each requisition line goes on whole: part of a line cannot be shared. A line already on an open RFQ or purchase order is not offered, so nothing is put out to tender twice. Once saved, the RFQ&apos;s lines cannot be edited: to change them, cancel it and raise a new one.
        </GuideCallout>
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
          "Several branches together is not offered: your school has one branch, or you work in only one.",
          "A requisition line is missing from the shared list: it is not approved yet, or it is already on an RFQ or purchase order.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The RFQ shows Awarded, the winning quotation shows the purchase order it raised, and that purchase order is on its way to approval.</GuideCallout>
      </GuideSection>
    </div>
  );
}
