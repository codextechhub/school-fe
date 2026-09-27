import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function PostingAndReachArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open <strong>Posting &amp; reach</strong> under Staff in the sidebar. It appears only for people who can choose between branches, because at a one-branch school, or for someone who works in one branch, there is nothing to decide.</p>
        <GuideChecklist items={[
          "Your role lets you edit staff records.",
          "Your school has more than one branch.",
          "You know which branch each person should be based at, and why they are moving.",
        ]} />
      </GuideSection>

      <GuideSection id="posting-and-reach" title="Posting and reach are different">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Posting</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Where somebody is based: one or more branches, or the whole school. It is changed on this screen.</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Reach</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Which branches&apos; records their roles open. It comes from their role grants and is changed on the Access tab of their profile.</p>
          </div>
        </div>
        <GuideCallout tone="info" title="Moving a posting leaves roles alone">Changing where somebody is based does not change what their roles reach. The drawer shows their reach under <strong>Role reach stays the same</strong> so you can see it before you save.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-a-roster" title="Read a branch roster">
        <GuideSteps>
          <GuideStep title="Choose the branch">Pick the branch in <strong>Show roster for branch</strong>. The cards count who is <strong>On this roster</strong>, <strong>Posted here</strong>, <strong>Reaches by role</strong> and <strong>School-wide</strong>.</GuideStep>
          <GuideStep title="Choose the view"><strong>Staff postings</strong> lists people based at the branch. <strong>Role reach</strong> lists people whose roles open this branch&apos;s records. <strong>School-wide</strong> lists people who belong to the whole school and appear on every branch roster.</GuideStep>
          <GuideStep title="Search">Search by name, staff ID or role.</GuideStep>
          <GuideStep title="Open a person">In Staff postings, selecting a person opens their posting. In Role reach, it opens the Access tab of their profile, where roles are managed.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="change-a-posting" title="Change a posting">
        <GuideSteps>
          <GuideStep title="Choose who moves">Select one person in <strong>Staff postings</strong>, or tick several and select <strong>Change postings</strong> to move them together.</GuideStep>
          <GuideStep title="Choose where">Under <strong>Posted to</strong>, pick <strong>Selected branches</strong> and tick each branch, or <strong>School-wide</strong> where you cover the whole school. Selected branches are equal postings. School-wide also covers branches opened later.</GuideStep>
          <GuideStep title="Say why">Add a <strong>Reason</strong>. It is optional and kept with the change.</GuideStep>
          <GuideStep title="Save">Select <strong>Move posting</strong>. A message confirms how many people moved, and any warning the school raises is shown after it.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Check reach after a move">If somebody moves branch for good, their roles may still open only their old branch. Open Role reach, or their Access tab, and ask whoever manages roles to change the grant if needed.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Posting & reach is not in the sidebar", body: "Your school has one branch, you work in one branch, or your role cannot edit staff records." },
          { title: "A person cannot be ticked", body: "They also work beyond the branches you cover, or they are not on the roll. Only a school-wide administrator can move them." },
          { title: "School-wide is not offered", body: "Only someone who covers the whole school can post people school-wide." },
          { title: "The roster did not load", body: "Choose another branch, or try again in a moment." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Each person appears under Staff postings for the branch they work at, and their reach matches the work they do there.</GuideCallout>
      </GuideSection>
    </div>
  );
}
