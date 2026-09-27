import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function AddStaffArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Select <strong>Add staff</strong> on the Staff Directory or on Invitations. One form creates the staff record and sends the invitation when you save. The same form serves teachers and everyone else: the bursar and the registrar are staff too.</p>
        <GuideChecklist items={[
          "Your role lets you add staff.",
          "You have the person's first name, last name and a working email address.",
          "You know which branch they will be based at, if your school has more than one.",
          "The email address is theirs alone. It is where the invitation goes and the address they sign in with.",
        ]} />
      </GuideSection>

      <GuideSection id="bio-and-employment" title="Bio and employment">
        <GuideSteps>
          <GuideStep title="Bio">Enter <strong>First name</strong>, <strong>Last name</strong> and <strong>Email address</strong>. Middle name, gender, phone, date of birth and a photograph are optional. Your school may hide or lock some of these fields for your role.</GuideStep>
          <GuideStep title="Staff ID">Enter the <strong>Staff ID</strong> in your school&apos;s own format, or leave it blank. It only has to be unique within the school.</GuideStep>
          <GuideStep title="Employment">Add the <strong>Job title</strong>, <strong>Employment type</strong> (Full-time, Part-time, Contract or Volunteer) and <strong>Hire date</strong>. Length of service is worked out from the hire date.</GuideStep>
          <GuideStep title="Posted to">Where you can choose between branches, pick where the person is based in <strong>Posted to</strong>. Only someone who covers the whole school can choose <strong>Across the whole school</strong>; a branch administrator can post people only to their own branches.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="role-and-duties" title="Role and teaching duties">
        <p>At a running school the form does not ask for a role. Everybody starts on the school&apos;s starting role, reaching as far as their posting, and the form says which role that is under <strong>What happens when you save</strong>. Roles are added or removed afterwards from Roles &amp; Permissions by whoever manages them.</p>
        <p>While the school is still being set up, a <strong>Role</strong> step asks for the administrator role to grant, and <strong>This role reaches</strong> says which branch&apos;s records it opens. It follows the posting unless you widen it.</p>
        <p>When the starting role is a teaching role and the year&apos;s classes and subjects exist, a <strong>Teaching duties</strong> step appears. Pick subjects and classes: every subject you pick is assigned in every class you pick, with the person as main teacher where that class subject has none. The form counts how many duties that makes. The step is optional, and duties can be changed later on Teaching duties.</p>
      </GuideSection>

      <GuideSection id="qualifications" title="Qualifications">
        <p>Select <strong>Add a row</strong> for each qualification, with the institution and the year obtained. These are recorded as your school types them; nothing checks them. Leave the section empty to add qualifications later.</p>
      </GuideSection>

      <GuideSection id="create-and-invite" title="Create and invite">
        <GuideSteps>
          <GuideStep title="Save">Select <strong>Create and invite</strong>. The record is created with employment status Invited and the account waiting for activation.</GuideStep>
          <GuideStep title="Check the confirmation">The <strong>Invitation sent</strong> page shows where the invitation went, the role and the staff ID. Invitations go by email and in the app, never by SMS.</GuideStep>
          <GuideStep title="Go on">Choose <strong>Add another</strong>, <strong>View their record</strong>, <strong>Resend invitation</strong> or <strong>Back to directory</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="The link is single-use and expires">The person activates their account by opening the link and setting a password. Resending voids the old link and restarts the clock, and never creates a second record.</GuideCallout>
      </GuideSection>

      <GuideSection id="import-many-people" title="Import many people at once">
        <p>To add a whole staff list, select <strong>Import</strong> on the Staff Directory. This needs permission to upload import batches, which is separate from adding staff one at a time. The <strong>Import staff</strong> drawer loads a spreadsheet, checks every row, and writes nothing until you confirm. Everybody imported arrives as Invited.</p>
        <p>Afterwards, <strong>Recent imports</strong> on the directory toolbar shows how each import finished.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Add staff is missing", body: "Adding staff needs its own permission. Ask whoever manages roles at your school." },
          { title: "The email is refused", body: "It is not a valid address, or it is already in use. Every account needs its own email." },
          { title: "The Teaching duties step does not appear", body: "The starting role is not a teaching role, or this year has no classes or subjects yet. Assign duties later on Teaching duties." },
          { title: "Posted to is not on the form", body: "It appears only when you can choose between more than one branch. Otherwise the person is filed under the branch you work in." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The person appears in the directory as Invited, their invitation is listed on Invitations, and their posting and job title are right.</GuideCallout>
      </GuideSection>
    </div>
  );
}
