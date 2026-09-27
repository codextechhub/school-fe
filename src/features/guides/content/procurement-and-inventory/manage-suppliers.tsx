import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ManageSuppliersArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Every supplier the school buys from, such as the uniform maker, the stationery wholesaler or the diesel vendor, needs a record under <strong>Vendors</strong> before it can receive an order or a payment.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations, then Vendors.",
          "Have the supplier's registered name, email, phone, tax identifier and address.",
          "Have their bank name, account number and account name from a letterhead or invoice, not from a phone call.",
        ]} />
      </GuideSection>

      <GuideSection id="add-a-supplier" title="Add a supplier">
        <GuideSteps>
          <GuideStep title="Select Add Vendor">Fill in <strong>Company</strong>: the <strong>Company name</strong>, <strong>Category</strong> and <strong>Payment terms</strong>.</GuideStep>
          <GuideStep title="Add contact and tax details">Under <strong>Contact &amp; tax</strong>, enter the email, phone, <strong>Tax identifier</strong> and <strong>Registered address</strong>.</GuideStep>
          <GuideStep title="Add the people you deal with">Under <strong>Vendor contacts</strong>, select <strong>Add contact</strong>. Tick <strong>Receives RFQs</strong> and <strong>Receives purchase orders</strong> for whoever should get quote requests and orders, and mark one as <strong>Primary</strong>.</GuideStep>
          <GuideStep title="Set accounting defaults and bank details">Choose the <strong>Payable account</strong>, <strong>Default expense account</strong> and <strong>Default WHT code</strong> if your bursar uses them, then the <strong>Bank details</strong>.</GuideStep>
          <GuideStep title="Create">Select <strong>Create Vendor</strong>. A new supplier starts with its checks (KYC) pending.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="approve-and-hold" title="Clear checks, or put a supplier on hold">
        <p>Open the supplier and select <strong>Edit Vendor</strong>. <strong>Status &amp; Governance</strong> appears when editing, and holds:</p>
        <GuideChecklist items={[
          "Active: switch off for a supplier you no longer use.",
          "KYC status: Pending, Verified or Rejected, once the supplier's documents are checked.",
          "Risk: Low, Medium or High.",
          "On hold: stops new orders while a dispute is settled.",
        ]} />
        <GuideCallout tone="warning" title="What blocks a supplier">Inactive, on-hold and KYC-rejected vendors cannot receive new purchasing commitments. Payments additionally require KYC verified. Changing KYC, risk or hold needs vendor governance access, which your role may not include.</GuideCallout>
      </GuideSection>

      <GuideSection id="review-a-supplier" title="Review a supplier">
        <p>Select a supplier to open its record:</p>
        <GuideChecklist items={[
          "Profile: code, category, terms, default accounts and year-to-date spend.",
          "Contacts: who receives quote requests and orders.",
          "Bank & Compliance: bank details with the account number masked, tax identifier, KYC and risk.",
          "Contracts & History: contracts, purchase orders and invoices with this supplier.",
          "Performance: orders, deliveries, on-time delivery and payment times.",
        ]} />
        <p>Some figures and tabs need extra access. Where yours does not include it, the screen says so, or shows <strong>Restricted</strong>, rather than a figure.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "A supplier is missing from the purchase order form: it is inactive, on hold, or KYC-rejected.",
          "A payment is refused: the supplier's KYC is not Verified.",
          "Bank or contact details are blank for you: those fields are restricted for your role.",
          "Status & Governance is missing: it appears only when editing an existing supplier.",
        ]} />
        <GuideCallout tone="danger" title="Confirm bank changes out loud">A message asking the school to change a supplier&apos;s bank account is a common fraud. Call the supplier on a number you already hold before saving new bank details.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The supplier shows Active with KYC Verified, has at least one contact receiving purchase orders, and its bank details match its own paperwork.</GuideCallout>
      </GuideSection>
    </div>
  );
}
