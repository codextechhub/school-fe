import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["You cannot manage this school's roles", "Your account can read the checklist but not the roles. A school administrator confirms the roles."],
  ["You cannot manage this school's staff", "Your account cannot read the staff list. A school administrator invites people and sees who has accepted."],
  ["The Role list offers only admin roles","Only admins can be invited during onboarding. Invite teachers and other staff after go-live."],
  ["Save and continue shows an error", "XVS checks this step before accepting it. Open the control room to see what is outstanding."],
  ["An invitation did not arrive", "Use Resend invitation from the row's menu. It reuses the same account, so it never creates a second record."],
  ["The email address is refused", "The message appears under the field, for example when someone with that email already exists."],
] as const;

export default function ConfirmRolesAndInviteStaffArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>XVS sets your school up with a baseline of roles. This step asks you to look them over, add any of your own, confirm them, and invite the people who will operate the system. The screen has two tabs: <strong>Roles &amp; Permissions</strong> and <strong>Invitations</strong>. The roles card in the control room opens the first (<strong>Review</strong>) and the staff card opens the second (<strong>Open invitations</strong>).</p>
        <GuideChecklist items={[
          "You know which jobs in your school need access to XVS.",
          "You have the name and email address of each administrator to invite.",
          "You know which of them runs the whole school and which runs one branch.",
        ]} />
      </GuideSection>

      <GuideSection id="review-the-roles" title="Review the roles">
        <GuideSteps>
          <GuideStep title="Read the two tables">On <strong>Roles &amp; Permissions</strong>, <strong>Default role templates</strong> lists the roles XVS set up and <strong>Custom roles</strong> lists the ones your school added. Each row shows how many people hold the role and how many permissions it has. Use <strong>Search roles</strong> to find one by name.</GuideStep>
          <GuideStep title="Open a role">Select a row to open the role. The <strong>Permissions</strong> tab lists what it can reach, grouped by area, with <strong>Search granted permissions</strong> to find one. <strong>People</strong> lists who holds it and <strong>Overview</strong> summarises it. Select <strong>Back to roles</strong> to return.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="The default roles are maintained by XVS">To work differently from a default role, add a role of your own rather than looking for a way to change the default.</GuideCallout>
      </GuideSection>

      <GuideSection id="add-your-own-role" title="Add a role of your own">
        <p>Select <strong>Add custom role</strong>. The form is the same one used after go-live: name the role, choose its branch reach, tick its permissions and say why it is needed, then select <strong>Create role</strong>. The guide on creating and editing a role walks through each field.</p>
        <GuideCallout tone="warning" title="Some permissions wait for approval">A permission marked <strong>Approval required</strong> is restricted. The role saves straight away, and the restricted permissions take effect only once the request is approved.</GuideCallout>
      </GuideSection>

      <GuideSection id="confirm-the-roles" title="Confirm the roles">
        <p>When the roles look right, select <strong>Save and continue</strong>. XVS checks the step, confirms your roles and takes you back to the control room. Once confirmed, the button reads <strong>Confirmed</strong>.</p>
      </GuideSection>

      <GuideSection id="invite-administrators" title="Invite administrators">
        <GuideSteps>
          <GuideStep title="Open the Invitations tab">Select <strong>Invitations</strong>, or open it from the staff card in the control room.</GuideStep>
          <GuideStep title="Fill in Invite a user">Enter <strong>First name</strong>, <strong>Last name</strong> and <strong>Email address</strong>, and choose a <strong>Role</strong>. Only admins can be invited during onboarding.</GuideStep>
          <GuideStep title="Send it">Select <strong>Send invitation</strong>. The invitation goes out by email and appears in the app. There is no SMS.</GuideStep>
          <GuideStep title="Follow it up">Under <strong>Invitations sent</strong>, each person shows <strong>Invited</strong> until they activate their account and <strong>Active</strong> after. To chase someone, choose <strong>Resend invitation</strong> from the row&apos;s menu.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Teachers come later">Invite the admin staff who will run the system during setup. Teachers and other staff can follow after go-live.</GuideCallout>
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
        <GuideCallout tone="tip" title="You are done when">The roles button reads <strong>Confirmed</strong>, every administrator you need appears under <strong>Invitations sent</strong>, and both steps show <strong>Done</strong> in the control room.</GuideCallout>
      </GuideSection>
    </div>
  );
}
