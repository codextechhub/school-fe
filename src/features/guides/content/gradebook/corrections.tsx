import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function CorrectionsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Once a class is published, its marks are locked. A mark found wrong afterwards is put right by a correction: one person asks for it, someone else approves it, and the report card is re-issued.</p>
        <GuideChecklist items={[
          "The class is published.",
          "Your role may ask for corrections, or decide them. One person cannot do both for the same correction.",
        ]} />
      </GuideSection>

      <GuideSection id="ask" title="Ask for a correction">
        <GuideSteps>
          <GuideStep title="Open the student's Results tab">From the student&apos;s record, or by selecting their name on Report cards.</GuideStep>
          <GuideStep title="Select Ask for a correction">On the subject it concerns, in the published term.</GuideStep>
          <GuideStep title="Change the marks and say why">Each column starts at the mark as published. Change what is wrong, or mark ABS or Exc, and write the reason. Only the columns you change are sent.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="One at a time">While a correction to a student&apos;s subject waits, another to the same subject cannot be asked for.</GuideCallout>
      </GuideSection>

      <GuideSection id="decide" title="Approve or reject">
        <p>Open <strong>Gradebook</strong>, <strong>Corrections</strong>. The summary and sliding filter separate requests that need review from approved and rejected corrections. Select a request to focus its published marks, requested marks, reason and full decision trail.</p>
        <p>Select <strong>Review decision</strong>. <strong>Approve correction</strong> takes an optional note; <strong>Reject correction</strong> needs one.</p>
        <p>Approving changes only that student&apos;s report card. It is re-issued as the next version, the published one is kept, and where the result was released the guardian is told an updated report card is ready.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There is no Approve button">You asked for this correction yourself, or your role cannot decide corrections.</GuideStep>
          <GuideStep title="Ask for a correction is missing">The term is not published, or your role cannot ask for corrections.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
