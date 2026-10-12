import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function CorrectionsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Once a register has closed, a mark on it changes only through a correction: a teacher or administrator asks for the change, and an attendance administrator decides it. Open <strong>Attendance</strong>, then <strong>Corrections</strong>. The sidebar shows how many are waiting on you.</p>
      </GuideSection>

      <GuideSection id="read-the-queue" title="Read the queue">
        <p><strong>Waiting for a decision</strong> lists each request with the child, the class, the day, the mark it is now and the mark asked for, the reason and note, and who asked. Select the day to open that register, or the child&apos;s name to open their attendance. <strong>Decided</strong> lists the requests already settled, newest first.</p>
      </GuideSection>

      <GuideSection id="decide" title="Approve or reject">
        <GuideSteps>
          <GuideStep title="Approve">Changes the mark. The original stays in the register&apos;s history, and a change away from Absent tells the guardian who was emailed that the mark was corrected.</GuideStep>
          <GuideStep title="Reject">Leaves the mark as it is. The request and your decision stay on the student&apos;s record.</GuideStep>
          <GuideStep title="Add a note">Both ask for an optional note, kept on the student&apos;s record. Use it to say what you saw, such as a hospital card, or why you refused.</GuideStep>
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
