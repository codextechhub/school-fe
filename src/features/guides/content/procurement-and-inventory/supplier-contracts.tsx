import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function SupplierContractsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A contract records a standing agreement with a supplier, such as a year of school bus maintenance or a catering service for the boarding house, so the school can see what it has agreed, what is due and when it ends.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations, then Contracts under Sourcing.",
          "The supplier is set up under Vendors and can receive orders.",
          "Have the signed agreement's dates, value, payment terms and any milestones.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-contract" title="Create the contract">
        <GuideSteps>
          <GuideStep title="Select New contract">Choose the <strong>Vendor</strong> and give it a <strong>Type / title</strong>, such as &quot;Bus maintenance 2026/27&quot;.</GuideStep>
          <GuideStep title="Enter the terms">Set the <strong>Start date</strong>, <strong>End date</strong>, <strong>Contract value</strong>, <strong>Payment terms</strong> and <strong>Renewal notice (days)</strong>. Tick <strong>Auto-renew</strong> only if the agreement renews by itself.</GuideStep>
          <GuideStep title="Add milestones">Under <strong>Milestones (optional)</strong>, select <strong>Add milestone</strong> for each deliverable with its name and amount.</GuideStep>
          <GuideStep title="Save or activate">Select <strong>Save draft</strong>, or <strong>Create &amp; activate</strong> to bring it into force now. A draft is activated later with <strong>Activate</strong>. Activation needs both dates and an eligible supplier.</GuideStep>
        </GuideSteps>
        <p>If the supplier already has an active contract of the same type, the form warns you. You can still continue.</p>
      </GuideSection>

      <GuideSection id="follow-the-contract" title="Follow the contract">
        <GuideChecklist items={[
          "Milestones: select Complete when a milestone is delivered.",
          "Linked POs: Linked orders were raised against this contract; In-term orders are other orders with this supplier during its dates.",
          "The Expiring tab and card list contracts approaching their end, using each contract's own renewal notice.",
        ]} />
      </GuideSection>

      <GuideSection id="renew-or-end" title="Renew or end the contract">
        <GuideSteps>
          <GuideStep title="Renew">On an active or expired contract, select <strong>Renew</strong>. Enter the <strong>New start date</strong>, <strong>New end date</strong> and <strong>Contract value</strong>, and tick <strong>Copy pending milestones to the renewal</strong> if they carry over. A successor contract is created and the old one is marked renewed.</GuideStep>
          <GuideStep title="Terminate">On an active contract, <strong>Terminate</strong> ends it early. It cannot be undone. The reason is optional, but record one.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="An expired contract can only be renewed">Once a contract has expired, Renew is the change the school accepts. To agree new dates or a new value with the same supplier, renew it.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "Activate is refused: add both dates, and check the supplier is active and not on hold.",
          "A draft is not on the Active tab: drafts appear only under All.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The contract shows Active with the right dates and value, and its milestones are listed.</GuideCallout>
      </GuideSection>
    </div>
  );
}
