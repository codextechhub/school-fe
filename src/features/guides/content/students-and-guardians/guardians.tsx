import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function GuardiansArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A guardian is one record, however many children they have at the school. Their name and contact details belong to the guardian. Their relationship to a child, and whether they are that child&apos;s primary contact, belong to each link between them. Open <strong>Guardians</strong> in the sidebar to see every guardian.</p>
        <GuideChecklist items={[
          "Your role lets you view students.",
          "To edit a guardian or link a child, your role also lets you edit student records.",
          "You have checked whether the guardian already exists before adding them again.",
        ]} />
      </GuideSection>

      <GuideSection id="find-a-guardian" title="Find a guardian">
        <GuideSteps>
          <GuideStep title="Search">Type in the search box. It searches by name and by the contact details your role may read.</GuideStep>
          <GuideStep title="Narrow to names to check">Choose <strong>Names to check</strong> to see only guardians whose name was split automatically from one line and has not been confirmed. Choose <strong>All guardians</strong> to go back.</GuideStep>
          <GuideStep title="Read the cards">Each card shows the guardian&apos;s first contact detail, how many students they have and their names. <strong>CHECK NAME</strong> marks a name to confirm, and <strong>SIBLINGS</strong> marks a guardian of more than one child. <strong>Contact missing</strong> means a detail you may read is empty.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="The branch narrows by the children">A guardian has no branch of their own. When you work in one branch, the list shows the guardians of that branch&apos;s students, and the page says so.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-a-guardian" title="Read a guardian's page">
        <p>Select a card. The page shows the guardian&apos;s phone and email, a <strong>Personal and contact</strong> panel, and <strong>Students under this guardian</strong> with each child&apos;s class, status and relationship. Switch between <strong>List</strong> and <strong>Grid</strong>, and select a child to open their profile.</p>
        <p><strong>Contact and access</strong> says whether the guardian can be reached by phone and email and whether they have a parent account. <strong>Guardian summary</strong> counts their linked students, primary contact links and active students.</p>
        <p>As on a student profile, the <strong>As at</strong> control shows the page as it stood at the end of an earlier day, with nothing that changes the record.</p>
      </GuideSection>

      <GuideSection id="edit-and-confirm-names" title="Edit details and confirm names">
        <GuideSteps>
          <GuideStep title="Open the drawer">Select <strong>Edit details</strong>. For a name waiting to be checked, the button reads <strong>Check name</strong> and the drawer opens on the confirmation.</GuideStep>
          <GuideStep title="Correct the fields">Change the first, middle and last name, phone, email, occupation or home address. The email is also the address any parent account is issued to. A line at the foot says which fields will change.</GuideStep>
          <GuideStep title="Save">Select <strong>Save changes</strong>. When checking a name that is already right, select <strong>Confirm name</strong> to confirm it as shown.</GuideStep>
        </GuideSteps>
        <p>The <strong>Profile completeness</strong> card and the <strong>Missing information</strong> list work as they do on a student: select <strong>Fill</strong> beside a gap to open the drawer.</p>
      </GuideSection>

      <GuideSection id="link-guardians-and-students" title="Link guardians and students">
        <p>You can link from either side.</p>
        <GuideSteps>
          <GuideStep title="From the guardian">Select <strong>Link another child</strong>. In <strong>Find the student</strong>, search by name or admission number and pick the child. Choose the <strong>Relationship</strong> and select <strong>Link child</strong>.</GuideStep>
          <GuideStep title="From the student">On the student&apos;s profile, select <strong>Link guardian</strong>. Choose <strong>Find an existing guardian</strong> and search <strong>Search the school&apos;s guardians</strong>, or <strong>Add a new one</strong> with a first name, last name and phone, and an email where your school requires one. Choose the <strong>Relationship</strong> and select <strong>Link guardian</strong>.</GuideStep>
        </GuideSteps>
        <p>The <strong>Relationship</strong> list holds the fixed choices and any words your school has added in <strong>Settings</strong> under <strong>Guardians</strong>, such as Sponsor. A guardian already on record is linked without a new email, even at a school that requires one for a new guardian.</p>
        <GuideCallout tone="warning" title="Reuse a guardian rather than typing them again">A parent entered twice becomes two records that drift apart. Search first. A student already linked shows as already linked and cannot be picked twice.</GuideCallout>
      </GuideSection>

      <GuideSection id="primary-contact" title="The primary contact">
        <p>Each student has exactly one primary contact, the guardian the school calls first. When linking, tick <strong>Primary contact</strong> (or <strong>Primary contact for this student</strong> from the guardian&apos;s page). If the student already has one, the marker moves to this guardian rather than adding a second. A student with no primary contact makes the first guardian linked their primary contact.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Edit details is missing", body: "Changing a guardian needs permission to edit student records." },
          { title: "Add a new one is missing", body: "Your role may link existing guardians but not create them. Search for the guardian instead." },
          { title: "A contact detail is not shown", body: "Your school decides which roles may read each guardian field. A field you may not read is left off the page, which is different from Not recorded." },
          { title: "A guardian cannot be removed from a child", body: "Your school asks for a number of guardians for every child, and the child has only that many. Link another guardian first." },
          { title: "A relationship is refused", body: "It is not one your school records. Pick one from the list, or ask a school administrator to add it in Settings, under Guardians." },
          { title: "The guardian list looks short", body: "You are working in one branch, so only the guardians of that branch's students are listed. Choose All branches if your role allows it." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Names to check is empty, each guardian you worked on shows Record complete, and every student has one primary contact.</GuideCallout>
      </GuideSection>
    </div>
  );
}
