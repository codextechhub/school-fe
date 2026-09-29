import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const DOCUMENTS = [
  "CV",
  "Degree certificate",
  "Professional certificate",
  "National ID",
  "Other",
] as const;

const SELF_EDIT = [
  "First name",
  "Middle name",
  "Last name",
  "Photo",
  "Date of birth",
  "Gender",
  "Phone",
] as const;

const PROBLEMS = [
  ["Staff is not in Settings", "It opens for a role that can view both school settings and staff. Ask whoever manages roles at your school."],
  ["The boxes are greyed out and there is no Save", "Your role reads these rules without changing them, or you work in one branch. The rules are the whole school's, and the screen says why at the bottom."],
  ["The starting role is refused on save", "The role carries permissions your own role does not hold, so you cannot make it everybody's starting role. Ask an administrator who holds them, or pick another role."],
  ["Hires are waiting and nobody can approve them", "The hire approvers group is empty. Select Add approvers on the Hiring panel, or open Approvers under Workflow, and put somebody in it. The waiting hires become theirs to decide straight away."],
  ["Use 0 to 366 days, or leave it blank for no limit", "An allowance takes a whole number of days from 0 to 366. Clear the box for a type with no limit."],
  ["Choose at least one working day", "Every day is switched off under Working days. Select the days your school works."],
  ["A request filed last week still counts Saturday", "Counting leave days applies to requests filed after you save. Requests already filed keep the days they were counted with."],
] as const;

function Cards({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(([title, body]) => (
        <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-black-01">{title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
        </div>
      ))}
    </div>
  );
}

export default function SettingsStaffArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Staff</strong> in <strong>Settings</strong> holds your school&apos;s own rules for its staff: the role a new member of staff starts with, the documents kept on file, what staff change about themselves, whether a hire is approved before the invitation goes out, and how leave is limited and counted. The rules are the whole school&apos;s: somebody who works in one branch reads them without changing them.</p>
        <GuideChecklist items={[
          "Your role can view school settings and view staff. Saving a change needs the key to update settings as well.",
          "You act for the whole school, not one branch.",
          "You have agreed the leave allowances and working days with whoever runs your staff.",
        ]} />
      </GuideSection>

      <GuideSection id="starting-role" title="Starting role">
        <p>Under <strong>Starting role</strong>, pick the role everybody added to the staff starts with, whether they are added on the Add staff form or imported from a spreadsheet. Until you choose, it is <strong>Teacher</strong>. The list holds your school&apos;s active roles.</p>
        <p>Give somebody a different role afterwards with <strong>Grant or withdraw</strong> on the <strong>Access</strong> tab of their profile.</p>
      </GuideSection>

      <GuideSection id="documents-on-file" title="Documents on file">
        <p>Under <strong>Documents on file</strong>, tick each document your school expects on every staff record. Until you choose, none is expected.</p>
        <GuideChecklist items={DOCUMENTS} />
        <GuideCallout tone="info" title="A flag, never a gate">A missing document never stops anybody starting, because a school hiring on a Friday for Monday rarely has every paper in hand. The record shows what is missing on its <strong>Documents</strong> tab, and the Staff Directory counts the people missing one under <strong>Staff attention</strong>.</GuideCallout>
      </GuideSection>

      <GuideSection id="what-staff-change" title="What staff change themselves">
        <p>Under <strong>What staff change themselves</strong>, tick the details anyone on the staff may correct on their own record with <strong>Update my details</strong>. Until you choose, that is Middle name, Photo, Date of birth and Phone. The choices are:</p>
        <GuideChecklist items={SELF_EDIT} />
        <p>The locked line under the boxes names what stays out of reach whatever you tick: <strong>Never changed by the person themselves: Staff ID, Job title, Employment type, Hire date, Exit date, Email, Posting.</strong> Somebody who manages staff changes those.</p>
        <p>With nothing ticked, <strong>Update my details</strong> no longer appears on anybody&apos;s own record.</p>
      </GuideSection>

      <GuideSection id="hiring" title="Hiring">
        <p>Turn on <strong>Approve a hire before the invitation goes out</strong> if a second person should agree to each new member of staff before they are told.</p>
        <GuideSteps>
          <GuideStep title="Somebody adds a person">The record is created as <strong>Awaiting approval</strong> and nothing is sent to them. The hire goes to the school&apos;s hire approvers in Workflow, narrowed to the branch the person is posted to.</GuideStep>
          <GuideStep title="An approver approves it">The invitation goes out and the record moves to Invited, as for any other hire.</GuideStep>
          <GuideStep title="Or the hire is declined or withdrawn">The record is closed as Terminated, the account can never be signed into, and nothing is ever sent to the person.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="The hire approvers group starts empty">Until somebody is in it, every new member of staff waits with nobody to approve them. Select <strong>Add approvers</strong> on the panel to open <strong>Approvers</strong> in Workflow, and fill the group before you save the switch.</GuideCallout>
        <p>The person who added somebody may approve that hire only when they are the only approver, so a school with one administrator is never stuck. A school still being set up never waits for approval.</p>
      </GuideSection>

      <GuideSection id="leave-allowances" title="Leave allowances">
        <p>Under <strong>Leave allowances</strong>, type the days each leave type allows in one academic session. Leave a box blank for no limit. The count starts again when a new session begins.</p>
        <p>An allowance counts approved and pending requests. Leave past an allowance is still filed: the approver sees by how much, and decides. A member of staff sees what is left of each allowance on the <strong>Leave</strong> tab of their record and when they apply.</p>
      </GuideSection>

      <GuideSection id="counting-leave-days" title="Counting leave days">
        <p>Under <strong>Counting leave days</strong>, choose which days a leave request counts:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Working days</strong>: select any of Mon to Sun. Until you choose, Monday to Friday.</li>
          <li><strong>Leave out days the school is closed</strong>: public holidays and breaks on the school calendar do not count against anybody&apos;s leave. On until you turn it off.</li>
        </ul>
        <p>For example, with Monday to Friday and closures left out, leave from Monday to the following Friday with a public holiday on the Wednesday counts 9 days. A request is counted this way when it is filed. Requests already filed keep their days.</p>
      </GuideSection>

      <GuideSection id="save-the-rules" title="Save the rules">
        <GuideSteps>
          <GuideStep title="Make your changes">Change any of the panels. <strong>Unsaved changes</strong> appears beside the button while something is not saved yet.</GuideStep>
          <GuideStep title="Save">Select <strong>Save staff rules</strong>. XVS confirms with <strong>Staff rules saved.</strong> and the next person added, and the next leave request, follow them.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <Cards items={PROBLEMS} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The starting role, documents, self-service details, hire approval and leave rules are the ones your school agreed, the hire approvers group has somebody in it if hires are approved, and no unsaved changes are left.</GuideCallout>
      </GuideSection>
    </div>
  );
}
