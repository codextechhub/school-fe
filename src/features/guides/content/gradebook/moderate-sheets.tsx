import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ModerateSheetsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Moderation is a second look at a submitted sheet, by the head of its subject&apos;s department, before the class teacher compiles the class. It happens only in programmes the school moderates.</p>
        <GuideChecklist items={[
          "The programme is switched on under Settings, Gradebook, Moderation.",
          "You are named head of the department under Academic structure, Departments.",
        ]} />
      </GuideSection>

      <GuideSection id="read-a-sheet" title="Read a sheet">
        <p>Open <strong>Gradebook</strong>, then <strong>Moderation</strong>, or the moderation card on your own sheets. Each sheet shows its teacher, how many students are marked, the class average, the highest and lowest totals, the pass rate, and the other classes that offer the same subject, so a column that looks out of line stands out. Sheets waiting for your decision come first. Select <strong>View sheet</strong> to read every mark.</p>
      </GuideSection>

      <GuideSection id="approve" title="Approve">
        <p>Select <strong>Approve</strong>. The sheet is in, and it goes on to the class teacher.</p>
      </GuideSection>

      <GuideSection id="return" title="Return with a note">
        <GuideSteps>
          <GuideStep title="Write the note">Select <strong>Return with a note</strong> and say what to check. The note is required.</GuideStep>
          <GuideStep title="Send it back">Select <strong>Return with this note</strong>. The sheet reopens for its teacher with your note pinned above the grid, and they are told in the app.</GuideStep>
        </GuideSteps>
        <GuideCallout title="Nothing is deleted">Returning a sheet changes no mark. The teacher corrects what the note asks for and submits again, and it comes back to you.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There is no Approve">The sheet is not submitted yet, or it belongs to a department you do not head. An administrator reads the queue but does not decide.</GuideStep>
          <GuideStep title="Moderation is not in the sidebar">Your school moderates no programme, or you head no department.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
