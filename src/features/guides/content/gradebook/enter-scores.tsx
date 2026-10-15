import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function EnterScoresArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>You enter the marks for a subject in a class when you are its main teacher there. An assistant teacher, the class teacher and the head of the subject&apos;s department can open the sheet and read it, but only the main teacher enters and submits it.</p>
        <GuideChecklist items={[
          "The school has an assessment structure for the class's programme: its components, such as two continuous assessments and an examination, and their maximums.",
          "You are the subject's main teacher in the class this term.",
          "For a subject that is not core, the students who take it are recorded, so the sheet lists only them.",
        ]} />
      </GuideSection>

      <GuideSection id="open-a-sheet" title="Open a sheet">
        <p>Open <strong>Gradebook</strong>, then <strong>My sheets</strong>. Each card is one subject in one class, with how many students are entered and when the examination paper is sat. Select the card to open its sheet. Where you teach more than one subject in the same class, tabs across the top of the sheet move between them.</p>
        <p><strong>Your other duties</strong> lists the class you lead as class teacher and the department you head, with how far each has got.</p>
      </GuideSection>

      <GuideSection id="enter-marks" title="Enter marks">
        <p>The sheet lists every student down the side and each component across the top, with its maximum. Type a whole mark into a cell. It is saved when you leave the cell, and the line shows the student&apos;s total, percentage, grade and remark as soon as every component has a mark.</p>
        <GuideSteps>
          <GuideStep title="Move down a column">Press Enter to move to the next student in the same column. Tab moves across.</GuideStep>
          <GuideStep title="A mark that is refused">A mark above the column&apos;s maximum, below 0 or with decimals is not saved. The cell turns red and says why; correct it and leave the cell again.</GuideStep>
          <GuideStep title="Clear a mark">Delete the number and leave the cell. The cell is blank again.</GuideStep>
        </GuideSteps>
        <GuideCallout title="A blank is not a zero">A blank cell means nothing has been entered yet, and a sheet with a blank cell cannot be submitted. A student who scored nothing gets 0.</GuideCallout>
      </GuideSection>

      <GuideSection id="absent-and-excused" title="Absent and excused">
        <GuideSteps>
          <GuideStep title="A, for absent">The student missed it without an excuse. It counts as zero and prints as ABS.</GuideStep>
          <GuideStep title="E, for excused">The student could not have sat it, for example because they were admitted after the test. The component is left out of what they could obtain, so their percentage is worked out from the rest.</GuideStep>
        </GuideSteps>
        <p>Press the small cross beside ABS or Exc to clear it.</p>
      </GuideSection>

      <GuideSection id="on-a-phone" title="On a phone">
        <p>On a phone the sheet shows one student at a time, with a box for each component and ABS and Excused beside it. Use <strong>Next</strong> and <strong>Previous</strong> at the foot of the screen, or pick a student from the list at the top. It is the same sheet, so marks entered on a phone appear on the computer and the other way round.</p>
      </GuideSection>

      <GuideSection id="upload" title="Upload marks from a spreadsheet">
        <GuideSteps>
          <GuideStep title="Download the template">On the sheet, select <strong>Upload marks</strong>, then <strong>Download the template</strong>. It lists every student with their admission number and the marks already entered.</GuideStep>
          <GuideStep title="Fill it in">Type each mark, or ABS or EXC. Leave a cell blank to keep what the sheet already has.</GuideStep>
          <GuideStep title="Upload and check">Choose the file. Nothing is saved yet: each row shows a new mark in green, a mark that replaces one already entered in amber, and any problem in red, such as an admission number nobody holds or a mark over the maximum.</GuideStep>
          <GuideStep title="Save the rows you want">The rows that change something start ticked. Rows with a problem cannot be saved; fix them in the file and upload it again.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="If the sheet changed meanwhile">When someone changes a mark after your file was checked, nothing is saved and the file is checked again, so newer marks are never overwritten.</GuideCallout>
      </GuideSection>

      <GuideSection id="submit" title="Submit the sheet">
        <p><strong>Submit sheet</strong> works once every cell has a mark, ABS or Excused; until then it says how many students are still blank. Submitting locks the sheet for you.</p>
        <p>Where the subject&apos;s department is moderated, the sheet then goes to the head of the department, who approves it or sends it back. Otherwise it goes straight on to the class teacher, who compiles the class.</p>
      </GuideSection>

      <GuideSection id="returned" title="A sheet that comes back">
        <p>When the head of department or the principal returns a sheet, it opens again for you with their note pinned at the top. Nothing is deleted: every mark stays as it was until you change it. Correct what the note asks for and submit again.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There are no boxes to type in">You are not the subject&apos;s main teacher in this class, or the sheet has been submitted. The line under the progress count says which.</GuideStep>
          <GuideStep title="A student is missing from an elective sheet">The sheet lists only the students recorded as taking the subject. Ask the class teacher or an administrator to record them.</GuideStep>
          <GuideStep title="My sheets is empty">You are not the main teacher of a subject in any class this term, or the term has not begun.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
