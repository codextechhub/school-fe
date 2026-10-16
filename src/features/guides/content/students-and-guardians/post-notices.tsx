import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function PostNoticesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A notice is a message from the school to its students: a holiday, a meeting, a change of plan. Students read it in their portal and get an email when it is published. Open <strong>Notices</strong> under Communication in the sidebar.</p>
        <GuideChecklist items={[
          "Your role can read notices.",
          "To post, your role can post notices, or post notices to the classes you teach.",
          "Students only see a notice if they have been given portal access.",
        ]} />
      </GuideSection>

      <GuideSection id="post-a-notice" title="Post a notice">
        <GuideSteps>
          <GuideStep title="Start a notice">Select <strong>New notice</strong>.</GuideStep>
          <GuideStep title="Write it">Give it a <strong>Title</strong> and write the <strong>Message</strong>. Plain text with line breaks; up to 5,000 characters.</GuideStep>
          <GuideStep title="Choose who it is for">Under <strong>Who it is for</strong>, tick <strong>Whole school</strong>, or the branches, levels and classes it is for. You are offered only what you may post to: a teacher sees the classes they teach or lead, and a branch administrator sees their own branches and classes.</GuideStep>
          <GuideStep title="Publish or save a draft">Turn on <strong>Publish now</strong> and select <strong>Publish notice</strong> to send it at once, or leave it off and select <strong>Save draft</strong> to check it first.</GuideStep>
        </GuideSteps>
        <GuideCallout title="Who it is for is fixed once published">You can correct the title and message of a published notice, and students see it marked as edited. To send it to different students, withdraw it and post a new one.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-and-manage" title="Read, publish and withdraw">
        <p>Select a notice in the list to open it. A published notice shows how many students in its audience have read it, counted against every student on the roll in the audience, including those without a portal sign-in.</p>
        <GuideSteps>
          <GuideStep title="Publish a draft">Open the draft and select <strong>Publish</strong>.</GuideStep>
          <GuideStep title="Withdraw a notice">Open it and select <strong>Withdraw</strong>. It leaves every student&apos;s portal straight away; emails already sent cannot be taken back. Staff still see it under <strong>Withdrawn</strong>.</GuideStep>
        </GuideSteps>
        <p>Edit, Publish and Withdraw appear only on notices you may manage. A teacher manages the notices they wrote for their own classes.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Choose who this notice is for before publishing it.</strong>: tick at least one audience, or save it as a draft.</li>
          <li><strong>You can post only to the classes and branches you work with.</strong>: remove the audience outside your reach, or ask an administrator to post it.</li>
          <li>A student says they cannot see a notice: check they are in its audience and have portal access on their record.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "The notice shows as Published in the list.",
          "Its read count rises as students open it.",
        ]} />
      </GuideSection>
    </div>
  );
}
