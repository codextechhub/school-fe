import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function EnrolStudentArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Select <strong>Enrol student</strong> on the Student Directory, or type <em>enrol a student</em> in the search box. The form asks for one thing at a time and saves nothing until the last step.</p>
        <GuideChecklist items={[
          "Your role lets you enrol students.",
          "The classes for this year exist in Academic Structure.",
          "You have the child's name, date of birth and gender.",
          "You have at least one guardian's name, phone number and relationship to the child.",
        ]} />
        <GuideCallout tone="tip" title="Many children at once?">For a whole roll, import a spreadsheet from the Student Directory instead. The guide on importing students explains how.</GuideCallout>
      </GuideSection>

      <GuideSection id="choose-what-you-create" title="Choose what you are creating">
        <p>Under <strong>What are you creating?</strong> choose one:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Enrol a student</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Joins the roll today and takes a seat in the class you choose.</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Save as an applicant</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Waiting on a decision. Records the level applied for and takes no seat.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection id="fill-the-steps" title="Fill in the steps">
        <p>The steps are <strong>Student</strong>, <strong>Placement</strong>, <strong>Guardians</strong>, <strong>Details</strong> and <strong>Review</strong>. <strong>Next</strong> checks only the step you are on, and any step you have reached stays open to go back to.</p>
        <GuideSteps>
          <GuideStep title="Student">Enter <strong>First name</strong>, <strong>Last name</strong>, <strong>Date of birth</strong> and <strong>Gender</strong>. Middle name, nationality, state of origin and previous school are optional. A date of birth that makes the child younger than 2 or older than 25 is flagged as a likely typing mistake.</GuideStep>
          <GuideStep title="Placement">Where your school has more than one branch, choose the <strong>Branch</strong>. If you are working in one branch, it is set for you; switch branch in the sidebar to enrol elsewhere. Then pick the <strong>Entry class</strong>, which lists each class with its seats used. An applicant gets <strong>Level applied for</strong> instead.</GuideStep>
          <GuideStep title="Admission number">Enter the <strong>Admission number</strong> in your school&apos;s own format. It is required only when your school says so, and the hint under the field shows the expected format. Otherwise leave it blank and add it later from the record.</GuideStep>
          <GuideStep title="Details">Home address, the student&apos;s own phone and email, the medical details and the emergency contact are all optional. Select <strong>Skip</strong> to move past them.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="The branch cannot be changed here later">Check it before you save. A class belongs to one branch, so pick the branch first and the class list follows it.</GuideCallout>
      </GuideSection>

      <GuideSection id="add-guardians" title="Add guardians">
        <p>Every student needs at least one guardian and exactly one primary contact.</p>
        <GuideSteps>
          <GuideStep title="Look for them first">Select <strong>Find an existing guardian</strong> and type two or more letters in <strong>Search the school&apos;s guardians</strong>. A parent who already has a child at the school should be reused, not typed again.</GuideStep>
          <GuideStep title="Or add them">If nobody matches, select <strong>Add a new one</strong> and enter the first name, last name and phone. Email is optional. This button appears only when your role may create guardian records.</GuideStep>
          <GuideStep title="Set the relationship">Choose the <strong>Relationship</strong> for every guardian, such as Mother, Father or Legal guardian.</GuideStep>
          <GuideStep title="Mark the primary contact">Choose <strong>Primary contact</strong> on the one guardian the school calls first.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="review-and-save" title="Review and save">
        <p>The <strong>Review</strong> step shows everything you entered in blocks you can jump back to. The line at the foot of the form counts details still needed across the whole form, so nothing can hide on an earlier step. When it reads <strong>Ready to save.</strong>, select <strong>Enrol student</strong>, or <strong>Save applicant</strong> for an applicant.</p>
        <p>An enrolled student opens on their profile. An applicant takes you to Applicants.</p>
      </GuideSection>

      <GuideSection id="duplicates-and-full-classes" title="Duplicates and full classes">
        <GuideCallout tone="warning" title="Is this a different child?">If the school already has a student with the same details, the form asks before saving. Check the directory first. Select <strong>Yes, enrol them</strong> only when you are sure this is a different child.</GuideCallout>
        <GuideCallout tone="warning" title="The class is full">The Placement step warns when the class you picked is at capacity. If the school refuses the enrolment because the class is full, the button changes to <strong>Enrol anyway</strong>. Select it only if the child should join that class over its limit.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "No classes are offered", body: "Pick a branch first. If the list is still empty, the classes for this year have not been set up in Academic Structure." },
          { title: "The admission number is refused", body: "It does not match your school's format or another student already has it. The form takes you back to the field with the reason." },
          { title: "Add a new one is missing", body: "Your role may link existing guardians but not create them. Find the guardian instead, or ask a colleague who can add guardians." },
          { title: "Some required details are missing", body: "The form jumps to the first step with a gap and marks the fields. Fill them and go on." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The student&apos;s profile opens with the right class and branch, a primary guardian is shown, and the admission number is issued or noted for later.</GuideCallout>
      </GuideSection>
    </div>
  );
}
