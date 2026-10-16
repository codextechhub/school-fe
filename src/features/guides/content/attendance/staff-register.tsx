import { GuideSection } from "../../article-components";

export default function StaffRegisterArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The staff register records what an administrator saw; there is no clock-in. Open <strong>Attendance</strong>, then <strong>Staff register</strong>, or select <strong>Staff register</strong> on the Today screen. The summary and branch cards show what is complete and what still needs attention. Open a branch card to mark its full register. Use the date to open an earlier day.</p>
      </GuideSection>

      <GuideSection id="mark-staff" title="Mark the staff">
        <p>Each person has three buttons: <strong>P</strong> present, <strong>L</strong> late (with the time they arrived) and <strong>A</strong> absent. <strong>Everyone else present</strong> fills the rows not yet marked. <strong>Submit staff register</strong> works once every row at that branch is marked. Staff absences notify nobody.</p>
        <p>Until the register closes, anyone who may take the staff register can still change a row.</p>
      </GuideSection>

      <GuideSection id="leave-and-leaving" title="Leave, and staff who are leaving">
        <p>Somebody on approved leave that day is shown as <strong>On leave</strong>, filled in from Staff Management, and cannot be marked over. If you can read staff leave, the row says which leave and when it ends, and opens their leave record. Somebody who has resigned is still listed until their last working day, with that day shown.</p>
      </GuideSection>

      <GuideSection id="no-home-branch" title="No home branch">
        <p>A member of staff is marked on their home branch&apos;s register. Somebody with no home branch cannot be marked anywhere, so they are listed apart, locked, for an administrator who covers the whole school. Give each a home branch in Staff Management and they move to that branch&apos;s register.</p>
      </GuideSection>
    </div>
  );
}
