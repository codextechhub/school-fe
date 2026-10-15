import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function GradebookSetupArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open <strong>Settings</strong>, then <strong>Gradebook</strong>. Everything here applies to every branch, so only somebody who works for the whole school can change it; a branch administrator reads it.</p>
        <GuideChecklist items={[
          "Your programmes are set up under Academic structure.",
          "You know how your school weights continuous assessment against the examination, and its grade bands.",
          "Settle these before the term's first mark is entered. Changing them afterwards is possible, but has the effects described below.",
        ]} />
      </GuideSection>

      <GuideSection id="structures" title="Assessment structures">
        <p>A structure is what a programme&apos;s marks are made of, for example a 1st CA of 20, a 2nd CA of 20 and an examination of 60. Each programme has one in use; a branch can have its own, which it uses instead.</p>
        <GuideSteps>
          <GuideStep title="Start one">Select <strong>New draft</strong> on the programme&apos;s card. Name the components, give each a short name for the report card and a maximum, and tick the one that is the examination.</GuideStep>
          <GuideStep title="Check it">The line under the components says what they total. It must be exactly 100, with no more than one examination. A draft can be saved before it passes, so you can finish it later.</GuideStep>
          <GuideStep title="Put it in use">Select <strong>Put in use</strong>. It replaces the one in use, which is kept as history. A class that already has marks keeps the structure it started with.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="scales" title="Grading scales">
        <p>A scale turns a percentage into a grade and remark. Each band has its lowest mark and runs up to the next band&apos;s, so bands from 70, 60, 50, 40 and 0 cover every mark with no gap. Tick <strong>Fail</strong> on the bands that fail.</p>
        <GuideCallout tone="warning" title="A scale change regrades results">Results are graded by the scale in use until they are published. Putting a new scale in use, or editing the one in use, changes the grades of every result not yet published. Published results keep the grades they were given.</GuideCallout>
      </GuideSection>

      <GuideSection id="locked" title="A structure or scale that is locked">
        <p>Once a published result rests on a structure or scale, it is locked and says which class published with it. Select <strong>Copy to edit</strong> to start a draft from it, change the draft, and put the draft in use. The published results are untouched.</p>
      </GuideSection>

      <GuideSection id="report-card" title="Report card options">
        <p>Each switch saves as soon as you turn it and changes every report card not yet published: the class average, highest and lowest beside each subject; the position in class; the conduct and skills ratings; and the line explaining the 1 to 5 key. With ratings on, <strong>Edit traits</strong> changes which traits a class teacher rates, from 1 to 15 of them.</p>
      </GuideSection>

      <GuideSection id="moderation" title="Moderation">
        <p>Turn moderation on for a programme and its submitted score sheets go to the head of the subject&apos;s department, who approves them or sends them back, before the class teacher compiles the class. Name each department&apos;s head under Academic structure, Departments. A department with no head sends its sheets straight on.</p>
      </GuideSection>

      <GuideSection id="templates" title="Principal's remark templates">
        <p>One sentence for each band of overall average. When the principal writes the comments for a class, each band starts from its template and can be reworded for that class. Select <strong>Edit templates</strong>; one band must start at 0 so every average has a remark.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="A programme's sheets will not open">Nothing is in use for it. Put a structure and a scale in use for the programme.</GuideStep>
          <GuideStep title="Put in use is refused">The structure does not total 100 or has two examinations, or the scale does not start at 0, has two bands starting at one mark, or has no pass band. The message says which.</GuideStep>
          <GuideStep title="There are no buttons">You work for one branch, or your role cannot change assessment setup.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
