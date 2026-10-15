import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function AnalyticsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Analytics read the term&apos;s published results only. Open <strong>Gradebook</strong>, <strong>Analytics</strong>. At a school with several branches, the branch selector narrows the figures to one.</p>
        <GuideChecklist items={[
          "Your role may read performance analytics. Downloading the tables needs its own permission.",
          "At least one class is published this term.",
        ]} />
      </GuideSection>

      <GuideSection id="read" title="Read the figures">
        <GuideSteps>
          <GuideStep title="By subject and class">Each subject in each published class: its average, how many students reached each grade, the pass rate and how many were marked.</GuideStep>
          <GuideStep title="The same subject across classes">Where more than one class offers a subject, each class&apos;s average and the gap between highest and lowest.</GuideStep>
          <GuideStep title="Term on term">Each student&apos;s overall average against their most recent earlier published term, biggest fall first. A student with no earlier published result is not listed.</GuideStep>
          <GuideStep title="Top of each class">Where the school ranks, who leads each class.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A question, not a verdict">A gap between classes is a question for the head of department, not a judgement on a teacher.</GuideCallout>
      </GuideSection>

      <GuideSection id="export" title="Download a table">
        <p>Select <strong>Export</strong> on the subject table or the term-on-term table and choose CSV or Excel. The file holds the same figures as the screen, and each download is recorded.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There is no Export button">Your role may read analytics but not download them.</GuideStep>
          <GuideStep title="A column is missing">Your role may not read that figure, so it is left out of the screen and the file alike.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
