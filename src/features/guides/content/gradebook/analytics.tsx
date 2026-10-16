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
          <GuideStep title="Start with the term summary">See how many classes and subjects are represented. Where your role may read class figures, the overview also shows the weighted average mark and pass rate across the published subject entries.</GuideStep>
          <GuideStep title="Choose a subject">The subject list combines its published classes. Select one to see each class&apos;s average, pass rate and marked count together.</GuideStep>
          <GuideStep title="Review the signals">Needs attention keeps the largest visible class gaps and falls together. They are prompts for review, not judgements on a teacher.</GuideStep>
          <GuideStep title="Compare terms">Each student&apos;s overall average is compared with their most recent earlier published term. A student with no earlier published result is not listed.</GuideStep>
          <GuideStep title="Top of each class">Where the school ranks, who leads each class.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A question, not a verdict">A gap between classes is a question for the head of department, not a judgement on a teacher.</GuideCallout>
      </GuideSection>

      <GuideSection id="export" title="Download a table">
        <p>Select <strong>Export</strong> at the top of the page, choose the subject performance or term movement table, then choose CSV or Excel. The file holds the same figures as the screen, and each download is recorded.</p>
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
