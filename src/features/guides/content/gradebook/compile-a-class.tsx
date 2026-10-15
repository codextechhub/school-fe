import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function CompileAClassArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The class teacher compiles a class: they read every subject&apos;s totals together, write each student&apos;s comment and conduct ratings, and send the class to the principal. Open it from <strong>Gradebook</strong>, <strong>My sheets</strong>, the card under <strong>Your other duties</strong>. An administrator opens a class&apos;s <strong>Broadsheet</strong> from <strong>Results this term</strong>, and reads it.</p>
        <GuideChecklist items={[
          "You are the class's class teacher.",
          "Every subject's sheet is in: submitted, and approved by its head where the programme is moderated.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-broadsheet" title="Read the broadsheet">
        <p>Each student is a row and each subject a column. A number is the student&apos;s total; a dash means the student does not take that subject; a dot means the subject&apos;s sheet is not in yet, and the column names its teacher. Each row ends with the student&apos;s overall average and, where the school ranks, their position. Select <strong>Print</strong> for a landscape copy for the results meeting.</p>
        <p>A note above the table says when the class has school days with no register taken, because the attendance on the report cards will be short by those days.</p>
      </GuideSection>

      <GuideSection id="write-the-reports" title="Write each student's report">
        <GuideSteps>
          <GuideStep title="Open a student">Select <strong>Open</strong> on their row. You see their subjects with total and grade, their overall average and their attendance this term.</GuideStep>
          <GuideStep title="Rate and comment">Where the school rates conduct, pick 1 to 5 for each trait. Write the comment; it is required and prints on the report card.</GuideStep>
          <GuideStep title="Save and next">Saves this student and opens the next on the roll, so you can work down the class in one sitting. <strong>Previous</strong> and <strong>Next</strong> move without saving.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="submit" title="Submit the class">
        <p>The button at the top says what is left: subjects missing, or comments to write. Once nothing is left it reads <strong>Submit the class</strong>. Submitting sends the class to the principal and locks its comments and ratings for you.</p>
      </GuideSection>

      <GuideSection id="returned" title="A class that comes back">
        <p>When the principal returns the class, it opens again with their note pinned at the top. Change what the note asks for and submit again. Nothing you wrote is lost.</p>
        <GuideCallout tone="info" title="One subject can come back alone">The principal can also return a single subject&apos;s sheet to its teacher. The class then waits for that sheet before it can be submitted again.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There is no Open button">Your role cannot compile or approve results.</GuideStep>
          <GuideStep title="The report cannot be changed">The class is with the principal, or published. A published result is changed by an amendment.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
