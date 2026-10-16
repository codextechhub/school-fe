import { GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ResultsHubArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="read-the-figures" title="Read the figures">
        <p>Open <strong>Gradebook</strong>, then <strong>Results this term</strong>. The line under the title says which branches you are looking at, the day results are released when the calendar has a Results day, and when the term ends. At a school with several branches, the branch picker at the foot of the sidebar narrows everything to one branch.</p>
        <GuideSteps>
          <GuideStep title="Subject sheets in">How many of the sheets due this term are in, and how many are still to come. A sheet is in once it is submitted, and approved by its head where the programme is moderated.</GuideStep>
          <GuideStep title="Classes compiled, awaiting approval, published">How many classes have every subject in and their comments written, how many are with the principal, and how many are published. A published result is locked: a change to it is an amendment.</GuideStep>
          <GuideStep title="Results held">How many results are held over fees, and so not released to the family.</GuideStep>
        </GuideSteps>
        <p>Use the sliding stage switch to show all classes, classes still entering scores, classes being compiled, or classes that have reached approval or publication.</p>
      </GuideSection>

      <GuideSection id="by-class" title="By class">
        <p>Each class shows how many subject sheets are in, the stage it has reached (Entering, Compiling, Awaiting approval or Published) and its class teacher. <strong>Returned</strong> beside the stage means the principal sent the class back. Select anywhere on the row to open the broadsheet; a subject heading on the broadsheet opens that score sheet.</p>
      </GuideSection>

      <GuideSection id="late-sheets" title="What is late">
        <p><strong>Needs attention</strong> lists every sheet due this term that is not in, with the reason the platform knows: how many students are entered, that the head has not moderated it yet, that it was returned and by whom, that its teacher&apos;s last working day is coming, or that nobody is its main teacher. Where the teacher cannot sign in, a role that can unlock staff accounts is told so, with a link to their staff record. Select <strong>Open sheet</strong> to read it.</p>
      </GuideSection>

      <GuideSection id="remind" title="Remind a teacher">
        <p>Select <strong>Remind</strong> to send the sheet&apos;s main teacher a reminder in the app and by email. Each sheet can be reminded once a school day; after that the button says <strong>Reminded today</strong>. A sheet waiting for its head has no Remind, because it is not the teacher&apos;s to finish.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="A class has no branch">At a school with several branches a class needs a branch for its results to be kept. Give it one under Classes &amp; Arms.</GuideStep>
          <GuideStep title="Remind is refused">The teacher was already reminded today, has left, or cannot sign in. The message says which.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
