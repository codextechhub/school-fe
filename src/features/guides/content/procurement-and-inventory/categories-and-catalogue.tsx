import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function CategoriesAndCatalogueArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Categories</strong> group what the school spends on, such as Stationery, Laboratory or Maintenance, so spend can be read by kind. The <strong>Catalog</strong> is the list of things the school buys again and again, such as A4 paper or chalk, with a usual unit and price, so requisitions are quicker and consistent.</p>
        <GuideChecklist items={[
          "Open Procurement under Operations, then Categories or Catalog.",
          "Agree a short list of categories with the bursar before creating many.",
        ]} />
      </GuideSection>

      <GuideSection id="build-categories" title="Build the categories">
        <GuideSteps>
          <GuideStep title="Select New Category">Enter a <strong>Category code</strong>, which cannot be changed later, and a <strong>Category name</strong>.</GuideStep>
          <GuideStep title="Nest it if useful">Choose a <strong>Parent category</strong> to place it under another, for example Science Chemicals under Laboratory. Three levels is the deepest allowed.</GuideStep>
          <GuideStep title="Set the expense account">Choose a <strong>Default expense account</strong> if the bursar wants this kind of spend charged to one account. It applies only where the line and the supplier do not already give one.</GuideStep>
          <GuideStep title="Create">Select <strong>Create Category</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="add-catalogue-items" title="Add catalogue items">
        <GuideSteps>
          <GuideStep title="Select New Item">On <strong>Catalog</strong>, select <strong>New Item</strong>. Enter the <strong>Item name</strong> and <strong>Unit of measure</strong>, such as ream, box or litre. A <strong>SKU / external code</strong> is generated if you leave it blank.</GuideStep>
          <GuideStep title="Add purchasing defaults">Choose a <strong>Category</strong>, a <strong>Preferred vendor</strong>, a <strong>Standard unit price</strong> and a <strong>Lead time (days)</strong>. The price is a guide, not a quotation.</GuideStep>
          <GuideStep title="Create">Select <strong>Create Item</strong>. It is offered as a <strong>Catalog item</strong> on new requisition lines.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Defaults only fill new lines">Changing an item&apos;s price or account affects lines added from then on. Requisitions and orders already raised keep what they had.</GuideCallout>
      </GuideSection>

      <GuideSection id="retire-old-entries" title="Retire what you no longer use">
        <p>Edit the category or item and switch off <strong>Active</strong>. It stays on old records but is no longer offered for new ones. An active category needs an active parent.</p>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Your common purchases appear as catalogue items with the right unit and category, and a new requisition line fills in from them.</GuideCallout>
      </GuideSection>
    </div>
  );
}
