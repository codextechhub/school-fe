import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ReportCardsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Report cards exist once the principal publishes a class. Open <strong>Gradebook</strong>, <strong>Report cards</strong>, and pick the class.</p>
        <GuideChecklist items={[
          "Your role may read the release of results.",
          "The class is published. Before that, every student reads Not published and nothing has been sent.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-release" title="Read the release">
        <p>Each student shows their primary guardian, whether the result was released or held, and what became of the email: emailed and when, held with nothing sent, no email on file, or not sent.</p>
        <GuideCallout tone="info" title="What the email says">The email tells the guardian the report card is ready to collect. Nothing from the result is in it: no score, grade, position, comment, attachment or link.</GuideCallout>
      </GuideSection>

      <GuideSection id="print" title="Preview and print">
        <GuideSteps>
          <GuideStep title="One student">Select <strong>Preview</strong> on their row, then <strong>Print this report card</strong>. It prints on one A4 page, black and white.</GuideStep>
          <GuideStep title="The whole class">Select <strong>Print class</strong>. Every released student&apos;s card prints, one to a page. Held students are left out, and the page names them.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="student-results" title="A student's results">
        <p>Open the student&apos;s record and its <strong>Results</strong> tab. Every term of their school years is there, newest first: the overall average, the position where the term ranked, whether the card was released, and each subject. A term with nothing published says so. Holds and corrections are listed under History.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There is no Print class button">The class is not published yet.</GuideStep>
          <GuideStep title="A card shows Version 2">The result was corrected after publication by an approved amendment.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
