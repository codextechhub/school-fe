import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function CorrectionsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Once a register has closed, a mark on it changes only through a correction: a teacher or administrator asks for the change, and an attendance administrator decides it. Open <strong>Attendance</strong>, then <strong>Corrections</strong>. The sidebar shows how many are waiting on you.</p>
      </GuideSection>

      <GuideSection id="read-the-queue" title="Read the queue">
        <p><strong>Pending</strong> lists each waiting request with the child, class and requested mark change. Select a request to keep the queue in place while its full evidence opens beside it. On a phone, the selected review opens below the queue. <strong>Decided</strong> lists the requests already settled, newest first.</p>
        <p>The search checks only the page you are viewing. Use the page controls to move through the full queue.</p>
      </GuideSection>

      <GuideSection id="decide" title="Approve or reject">
        <GuideSteps>
          <GuideStep title="Approve">Changes the mark. The original stays in the register&apos;s history, and a change away from Absent tells the guardian who was emailed that the mark was corrected.</GuideStep>
          <GuideStep title="Reject">Leaves the mark as it is. The request and your decision stay on the student&apos;s record.</GuideStep>
          <GuideStep title="Add a note">Write an optional decision note in the selected request, then choose Approve or Reject and confirm. The note stays on the student&apos;s record. Use it to say what you saw, such as a hospital card, or why you refused.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Your own requests">Nobody decides a correction they asked for. Another administrator decides it.</GuideCallout>
      </GuideSection>

      <GuideSection id="your-requests" title="Follow your own requests">
        <p>A teacher who can ask for corrections but not decide them sees only the requests they made, and whether each was approved or rejected, with the decision note.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="The mark has moved since the request">If the mark changed after the request was made, approving is refused. Ask for a fresh correction from the register.</GuideStep>
          <GuideStep title="No Approve button">The request is yours, or your role can only ask for corrections.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
