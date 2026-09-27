import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["A permission you ticked is not working", "Open the role. If it is listed under Waiting for approval, it has not been granted yet. It takes effect once the request is approved."],
  ["Someone you gave a role to still cannot do the job", "The grant may be waiting for approval. The message when you gave it said so, and the person's staff profile lists it under Waiting for approval."],
  ["You cannot find the request", "Look under Workflow in the sidebar: Approvals holds what waits for your decision, and My Submissions holds what you sent."],
  ["A permission is already waiting", "The editor lists it under Waiting for approval and does not warn about it again. Wait for the first request to be decided."],
] as const;

export default function RoleChangeApprovalArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Some permissions are powerful enough that one person should not be able to hand them out alone. XVS calls these <strong>restricted</strong> permissions. Adding one to a role, or giving someone a role that carries them, goes through an approval before it takes effect.</p>
        <GuideChecklist items={[
          "You know which permissions the role needs and why.",
          "You know who in your school approves role changes.",
          "You have a clear reason to write on the role form, because the approver reads it.",
        ]} />
      </GuideSection>

      <GuideSection id="what-needs-approval" title="What needs approval">
        <p>In the role editor, a restricted permission carries an <strong>Approval required</strong> label beside it. Two things raise a request:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Adding a restricted permission to any role</strong>, whether the role is being created or already exists, and whoever holds it. This applies to your own role too.</li>
          <li><strong>Giving someone a role that carries restricted permissions you do not hold yourself.</strong> Instead of being refused, the grant becomes a request.</li>
        </ul>
        <p>Everything else in the same save or grant takes effect straight away.</p>
      </GuideSection>

      <GuideSection id="when-you-save-a-role" title="When you save a role">
        <GuideSteps>
          <GuideStep title="Read the warning before saving">When you tick a restricted permission the role does not already have, the form names it and says the role saves and sends it for approval.</GuideStep>
          <GuideStep title="Write a real reason">The <strong>Why is this role needed or changing?</strong> answer is sent with the request as its justification.</GuideStep>
          <GuideStep title="Save">After saving, the message says how many restricted permissions were sent for approval and that you can find them under Approvals.</GuideStep>
          <GuideStep title="Check the role">On the role&apos;s <strong>Permissions</strong> tab, a <strong>Waiting for approval</strong> box lists them. They take effect once the request is approved.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="when-you-give-a-role" title="When you give a role to someone">
        <p>When you select <strong>Give</strong> on a role&apos;s People tab and the grant needs approval, the message says the role is waiting for approval for that person and takes effect once approved in Approvals. Until then the person does not hold the role, and it does not appear on the role&apos;s People tab.</p>
        <GuideCallout tone="info" title="Only one administrator?">The request still goes through the approval step. When nobody else is on that step, the request comes to you and you can approve it yourself. When someone else is on that step, they decide.</GuideCallout>
      </GuideSection>

      <GuideSection id="follow-the-request" title="Follow the request">
        <p>A role change is decided alongside every other document that needs a decision. Open <strong>Workflow</strong> in the sidebar: <strong>Approvals</strong> lists what is waiting for you, and <strong>My Submissions</strong> lists what you have sent and where it has got to.</p>
        <GuideCallout tone="warning" title="Approving grants real access">Before approving, read the permission, the role, who holds it and the reason given. Once approved, everyone holding the role gets that access.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The role&apos;s Permissions tab has no <strong>Waiting for approval</strong> box, the permission appears in its list, and the person you gave the role to appears on its People tab.</GuideCallout>
      </GuideSection>
    </div>
  );
}
