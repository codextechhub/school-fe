import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ManageStockArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Inventory tracks what the school holds in its stores, such as exercise books, chalk, cleaning materials and kitchen supplies: how many, what they are worth, and where they went. Stock comes in through posted goods receipts and goes out when the stores keeper issues it to a department.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations, then Stock Items under Inventory.",
          "Ask the bursar which inventory and expense accounts each kind of stock uses.",
          "Decide whether the school keeps one store or several, for example a main store and a kitchen store.",
        ]} />
      </GuideSection>

      <GuideSection id="set-up-items-and-stores" title="Set up stock items and stores">
        <GuideSteps>
          <GuideStep title="Add a stock item">On <strong>Stock Items</strong>, select <strong>New stock item</strong>. Enter the <strong>Name</strong>, <strong>Unit of measure</strong> and <strong>Inventory account</strong>, and optionally a <strong>Default expense account</strong>, <strong>Reorder level</strong> and <strong>Reorder qty</strong>. A reference is generated if you leave <strong>SKU / external code</strong> blank.</GuideStep>
          <GuideStep title="Add a store if you have more than one">On <strong>Stock Locations</strong>, select <strong>New location</strong>. Give it a <strong>Code</strong> and <strong>Name</strong>, such as KITCHEN and Kitchen store, and choose its <strong>Branch</strong>. Goods received at that branch land in its default store.</GuideStep>
          <GuideStep title="Choose the default store">One store is always the default; movements that do not name a store use it. Use <strong>Make default</strong> to move the flag.</GuideStep>
        </GuideSteps>
        <p>Store choices only appear on the stock screens once the school has two or more active stores.</p>
      </GuideSection>

      <GuideSection id="issue-stock" title="Issue stock to a department">
        <GuideSteps>
          <GuideStep title="Open the item and select Issue">Choose the <strong>Store</strong> it comes from, if you have several, and the <strong>Quantity</strong>. You cannot issue more than the store holds.</GuideStep>
          <GuideStep title="Say where it went">Set the <strong>Movement date</strong> and <strong>Expense account</strong>, and choose who it was <strong>Issued to</strong>, such as the kitchen or the science department. Add a <strong>Reference</strong>, such as the store requisition slip number.</GuideStep>
          <GuideStep title="Check and issue">Read the <strong>Journal preview</strong>, then select <strong>Issue</strong>. Stock goes out at the store&apos;s weighted-average cost.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="adjust-a-count" title="Correct a count">
        <p>After a stock count, open the item and select <strong>Adjust</strong>. Choose <strong>Increase</strong> or <strong>Decrease</strong>, the <strong>Store</strong> and the <strong>Quantity</strong>, and give a <strong>Reference</strong> and <strong>Narration</strong> that explain the difference. For an increase, <strong>Unit cost</strong> defaults to the average when left blank. Select <strong>Adjust</strong>.</p>
        <GuideCallout tone="warning" title="There is no undo">Issues and adjustments cannot be reversed from the item. Count twice before you adjust, and if you make a mistake, correct it with a second adjustment that explains the first.</GuideCallout>
      </GuideSection>

      <GuideSection id="review-stock" title="Review stock and reorder">
        <GuideChecklist items={[
          "Stock Items: tick Needs reorder to see items at or below their reorder level.",
          "Stock Movements: every receipt, issue and adjustment, filtered by type or store.",
          "The item's Movements tab: its own history and running balance.",
          "The Procurement overview's Stock & receiving tab: items running low, with Draft a requisition for all to start one draft requisition for them.",
        ]} />
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "Not enough here: the chosen store holds less than you asked for. Another store may hold it.",
          "A delivery did not add stock: its goods receipt is still a draft, or the item was rejected on receipt.",
          "The default store cannot be deactivated: make another store the default first.",
          "Moving stock between stores: there is no transfer action. Agree with the bursar how your school records a move, because an issue and a later receipt value the stock separately.",
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">On-hand quantities match the shelves, and every issue names the department it went to.</GuideCallout>
      </GuideSection>
    </div>
  );
}
