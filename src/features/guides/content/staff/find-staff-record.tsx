import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function FindStaffRecordArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open <strong>Staff</strong> in the sidebar to reach the <strong>Staff Directory</strong>. It lists everybody employed at the school, teaching and non-teaching. Employment is not tied to an academic year, so only the branch you choose in the sidebar narrows the list.</p>
        <GuideChecklist items={[
          "Your role lets you view staff.",
          "The branch in the sidebar is the one you mean, or All branches.",
          "You know the person's name, email or staff ID.",
        ]} />
      </GuideSection>

      <GuideSection id="search-and-filter" title="Search and filter the directory">
        <GuideSteps>
          <GuideStep title="Search">Type a name or staff ID in the search box. Where your role may read staff emails, you can search by email too.</GuideStep>
          <GuideStep title="Filter">Select <strong>Filters</strong> to narrow by <strong>Role</strong>, <strong>Employment status</strong> or <strong>Account status</strong>. Where the school has branches, tick <strong>Posted school-wide only</strong> for people with no single branch, such as a registrar.</GuideStep>
          <GuideStep title="Clear what you set">Each filter appears as a chip. Select a chip to remove it, or <strong>Clear all</strong>.</GuideStep>
          <GuideStep title="Read the table">Each row shows the staff ID, role, where the person is posted, their <strong>Employment</strong> and <strong>Account</strong> status, their teaching load and a <strong>Record</strong> bar for how complete the record is.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Employment and account are two different things">Employment says whether the person still works here, such as Active, On leave or Resigned. Account says whether their sign-in works, such as Pending activation or Locked. A teacher locked out after mistyping a password is still fully employed.</GuideCallout>
      </GuideSection>

      <GuideSection id="counts-and-attention" title="Use the counts and attention list">
        <p>The cards at the top count <strong>Total staff</strong>, <strong>Currently employed</strong>, <strong>Teaching staff</strong> and <strong>Needs attention</strong>. Select <strong>Teaching staff</strong> to list only people with teaching duties.</p>
        <p><strong>Staff attention</strong> lists what may need an administrator. Each item filters the directory to those people:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Review invitations</strong> for invitations nobody has accepted.</li>
          <li><strong>Review accounts</strong> for accounts that are locked.</li>
          <li><strong>View absences</strong> for people on leave.</li>
        </ul>
        <p><strong>Recent imports</strong> on the toolbar shows staff imports, unfinished ones first, and links to every import.</p>
      </GuideSection>

      <GuideSection id="read-the-profile" title="Read a staff profile">
        <p>Select a row, or choose <strong>View profile</strong> from the row menu. The header shows the person&apos;s name, staff ID, job title, and their employment and account status side by side.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { tab: "Overview", body: "Personal and contact details, employment details including length of service, snapshots of teaching, qualifications and documents, access and reach, a leave snapshot and recent activity." },
            { tab: "Teaching", body: "What the person teaches this year and their part in each class subject." },
            { tab: "Access", body: "The roles they hold, the branches those roles reach, and any permission allowed or denied for them alone." },
            { tab: "Qualifications", body: "The qualifications recorded for them, with the institution and year." },
            { tab: "Documents", body: "The files on their record. View opens one. Where your role may update staff records, choose a type and select Upload document to add a file, or Remove to delete one." },
            { tab: "Leave", body: "Days taken by type, and every leave request with its status." },
            { tab: "History", body: "Every change to their employment and account, newest first." },
          ].map(({ tab, body }) => (
            <div key={tab} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{tab}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p>The <strong>As at</strong> control shows the record and every tab as they stood at the end of an earlier day, with every button that changes the record hidden.</p>
        <GuideCallout tone="info" title="Not everybody sees every tab">Your school decides in <strong>Settings</strong>, under <strong>Staff profiles</strong>, how much of a profile each person sees. Somebody whose role does not reach a colleague&apos;s record, such as a teacher opening a colleague from the organogram, gets a contact card with the colleague&apos;s name, photograph, post, branch, sign-in email and phone number, plus only the tabs your school shows them. That view changes nothing and has no <strong>As at</strong>. The same setting decides which tabs a member of staff sees on their own profile when their role holds no key for them.</GuideCallout>
      </GuideSection>

      <GuideSection id="fix-the-record" title="Fix the record">
        <GuideSteps>
          <GuideStep title="Find the gaps">The <strong>Profile completeness</strong> card counts details still missing. Select <strong>Complete profile</strong> to scroll to <strong>Missing information</strong>, then <strong>Fill</strong> beside a gap.</GuideStep>
          <GuideStep title="Edit">Select <strong>Edit staff</strong>, correct the name, contact, staff ID, job title, employment type or hire date, and select <strong>Save changes</strong>. To add or replace the photograph, select the camera on the picture at the top of the drawer; it saves straight away. The hire date is what length of service is worked out from.</GuideStep>
          <GuideStep title="Change the sign-in email">Use <strong>Change email address</strong>, where your role allows it. Type the new email twice and select <strong>Continue</strong>, then <strong>Change email</strong>. Employment status is changed with <strong>Change status</strong>.</GuideStep>
          <GuideStep title="Unlock or resend">For a locked account, <strong>Unlock account</strong> lets the person sign in again. For someone who has not activated, <strong>Resend invitation</strong> sends a fresh link.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Some people only a school-wide administrator can change">A branch administrator can read colleagues who also work at other branches or school-wide, but cannot change their record. The profile says so under the buttons.</GuideCallout>
      </GuideSection>

      <GuideSection id="leave" title="Apply for or record leave">
        <GuideSteps>
          <GuideStep title="Open the Leave tab">On your own profile, select <strong>Apply for leave</strong>. On a colleague&apos;s profile, where your role files leave for others, select <strong>Record leave</strong>.</GuideStep>
          <GuideStep title="Fill in the request">Choose the <strong>Type of leave</strong>, the <strong>First day</strong> and the <strong>Last day</strong>, and add a <strong>Note</strong> for the approver if needed.</GuideStep>
          <GuideStep title="File it">Select <strong>File request</strong>. It goes to whoever your school has appointed to approve leave, including leave filed on somebody&apos;s behalf.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Days taken is not a balance">The school does not record a leave entitlement, so the tab counts days taken and never shows days remaining.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Somebody I expect is missing", body: "Check the branch in the sidebar and clear every filter chip. A person posted to another branch appears only when that branch or All branches is chosen." },
          { title: "The row menu has only View profile", body: "Either your role cannot change staff, or the person works beyond your branch and only a school-wide administrator can change them." },
          { title: "The Teaching or Leave tab says it opens at go-live", body: "Teaching duties and leave belong to a running school year. They open once the school goes live." },
          { title: "Apply for leave is missing", body: "You are looking at somebody else's record, or looking at an earlier day. Open your own record on today's date: select your picture at the top right, then My staff record. If your own profile has no Leave tab, your school does not show leave to staff on their own profile; ask your school administrator." },
          { title: "A colleague's profile has fewer tabs than mine", body: "Your role does not reach their record, so you see what your school shows people in your position. Your school sets it in Settings, under Staff profiles." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">You can find anyone by name or staff ID, tell their employment status from their account status, read each tab of their profile, and fill a gap from Missing information.</GuideCallout>
      </GuideSection>
    </div>
  );
}
