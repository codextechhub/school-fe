import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function FeeHoldsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A held result is approved and locked, but not released to the family until the hold is lifted. Holds are only ever placed by a person, never automatically. Open <strong>Gradebook</strong>, <strong>Fee holds</strong>.</p>
        <GuideChecklist items={[
          "Your role may read fee holds. Placing and lifting them needs its own permission.",
          "The student is on a class roll this term.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-list" title="Read the list">
        <p>The ledger opens on the families who owe, with anyone already held, so you can lift a hold once a family pays. Slide from <strong>Needs attention</strong> to <strong>Whole roll</strong> to see every student. Search by name or admission number, or pick a class.</p>
        <p>Balances come from Finance at the time shown at the top. They are context for your decision, not a rule. No mark appears on this screen.</p>
        <GuideCallout tone="warning" title="When Finance cannot answer">The balances are blank, never zero, and every student is listed. You can still place and lift holds.</GuideCallout>
      </GuideSection>

      <GuideSection id="hold" title="Hold a result">
        <GuideSteps>
          <GuideStep title="Select the student">Their Finance context and current hold come into focus.</GuideStep>
          <GuideStep title="Select Hold result">Use the action in the focused student panel.</GuideStep>
          <GuideStep title="Write the reason">It is required. The reason stays on this screen; the principal sees only that the result is held, and by whom.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="lift" title="Lift a hold">
        <p>Select <strong>Lift hold</strong>, add a note if you wish, and confirm. If the class is already published, the result is released then and the guardian is emailed that the report card is ready. If not, it goes out when the class is published.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There is no Hold result button">The result is already released, or your role may read holds but not place them.</GuideStep>
          <GuideStep title="A family who paid still shows a balance">The figure is Finance&apos;s as of the time shown. Reload the page to read it again.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
