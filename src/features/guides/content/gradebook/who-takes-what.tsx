import { GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function WhoTakesWhatArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Core subjects are taken by everybody in a class. A subject that is not core, such as French or Further Mathematics, is taken only by the students recorded as taking it: its score sheet lists only them, and a student who does not take it is on no sheet, no average and no position for it.</p>
        <GuideChecklist items={[
          "The subject is offered at the class's level and is not marked core, under Academic structure, Subjects.",
          "You are the class teacher, or an administrator for the class's branch.",
        ]} />
      </GuideSection>

      <GuideSection id="tick-the-grid" title="Tick the grid">
        <GuideSteps>
          <GuideStep title="Open it">Open <strong>Gradebook</strong>, then <strong>Who takes what</strong>. An administrator chooses the class at the top; a class teacher sees the class they lead.</GuideStep>
          <GuideStep title="Tick">Each column is a subject that is not core, with how many students take it. Tick a box to put a student on the subject, untick it to take them off. Each tick is saved as you make it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="taking-a-student-off" title="Taking a student off a subject">
        <p>A student who already has marks on the subject&apos;s sheet cannot be taken off it, because the marks would be lost. The message says so. Ask the subject&apos;s teacher to clear the marks first if the student really has stopped taking it.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="The boxes cannot be ticked">You are not the class teacher, or an administrator for its branch. The line above the grid says so.</GuideStep>
          <GuideStep title="A subject is missing">It is core at the class&apos;s level, so everybody takes it, or it is not offered at that level.</GuideStep>
          <GuideStep title="No class to set">You do not lead a class this term.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
