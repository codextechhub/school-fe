import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

const TABS = [
  ["Overview", "Your contact and personal details, your employment details including length of service, and snapshots of the rest."],
  ["Teaching", "What you teach this year and your part in each class subject."],
  ["Access", "The roles you hold and the branches they reach."],
  ["Qualifications", "The qualifications recorded for you."],
  ["Documents", "The files on your record."],
  ["Leave", "Days you have taken by type, and every leave request with its status. You apply for leave here."],
  ["History", "Every change to your employment and account, newest first."],
] as const;

export default function MyStaffRecordArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="open-your-record" title="Open your record">
        <p>Everybody who works at the school has a staff record, and you can always open your own, even if your role cannot open anybody else&apos;s.</p>
        <GuideSteps>
          <GuideStep title="From your picture">Select your picture at the top right, then <strong>My staff record</strong>.</GuideStep>
          <GuideStep title="From the search box">Type <em>my staff record</em> in the search box at the top and choose <strong>View my staff record</strong>. Typing <em>apply for leave</em> and choosing <strong>Apply for leave</strong> takes you straight to your Leave tab.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="what-you-see" title="What you see">
        <p>Unless your school has chosen otherwise, you see every tab of your own record:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TABS.map(([tab, body]) => (
            <div key={tab} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{tab}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <GuideCallout tone="info" title="Your school can close a tab">A school administrator can hide any of these tabs from staff reading their own record, in <strong>Settings</strong> under <strong>Staff profiles</strong>, in the <strong>Themselves</strong> column. A closed tab does not appear. Your contact details are always shown.</GuideCallout>
      </GuideSection>

      <GuideSection id="update-your-details" title="Update your details">
        <p>You can correct a few facts about yourself without anybody&apos;s help.</p>
        <GuideSteps>
          <GuideStep title="Open the drawer">On your own record, select <strong>Update my details</strong>.</GuideStep>
          <GuideStep title="Change your photograph">Select the camera on your picture and choose a photo. It saves straight away.</GuideStep>
          <GuideStep title="Correct the rest">Change your <strong>Middle name</strong>, <strong>Date of birth</strong> or <strong>Phone</strong>, then select <strong>Save changes</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Some details are the school's to change">Your job title, hire date and where you are posted are changed by a school administrator. Where your school has closed your personal details to you, the drawer offers only your photograph and phone.</GuideCallout>
      </GuideSection>

      <GuideSection id="apply-for-leave" title="Apply for leave">
        <GuideSteps>
          <GuideStep title="Open the Leave tab">Select <strong>Apply for leave</strong>.</GuideStep>
          <GuideStep title="Fill in the request">Choose the <strong>Type of leave</strong>, the <strong>First day</strong> and the <strong>Last day</strong>, and add a <strong>Note</strong> for the approver if needed.</GuideStep>
          <GuideStep title="File it">Select <strong>File request</strong>. It goes to whoever your school has appointed to approve leave, and its status shows on the tab.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "It says you have no staff record here", body: "Your account is not on this school's staff list. If you work here, ask a school administrator to add you." },
          { title: "A tab is missing", body: "Your school has closed that tab for staff reading their own record. Ask your school administrator if you need it." },
          { title: "Apply for leave is missing", body: "You are looking at an earlier day, your role cannot apply for leave, or your school has closed the Leave tab. Return to today's date, or ask your school administrator." },
          { title: "A detail about you is wrong", body: "Your photograph, middle name, date of birth and phone you can correct yourself with Update my details. For anything else, such as your job title or hire date, ask a school administrator." },
          { title: "Update my details is missing", body: "Your role can edit staff records, so you have Edit staff instead, which changes everything on your record. On an earlier day neither button appears." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">You can open your own record from your picture or the search box, read each tab your school shows you, correct your own phone and photograph, and see your leave requests and their status.</GuideCallout>
      </GuideSection>
    </div>
  );
}
