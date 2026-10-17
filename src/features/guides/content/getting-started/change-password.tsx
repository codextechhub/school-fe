import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ChangePasswordArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Change your password whenever somebody else may know it: you typed it where others could see, shared it in a chat, or used it on another site. You need the password you sign in with now. If you have forgotten it, use <strong>Forgot password</strong> on the sign-in page instead.</p>
        <GuideChecklist items={[
          "You are signed in to your school's own address.",
          "You know your current password.",
          "You are not proxying as somebody else.",
        ]} />
      </GuideSection>

      <GuideSection id="change-your-password" title="Change your password">
        <GuideSteps>
          <GuideStep title="Open Account security">Select your picture at the top right, then <strong>Change password</strong>. You can also type <em>change password</em> into the search box.</GuideStep>
          <GuideStep title="Enter Current password">Use the eye button at the end of each box to see what you typed.</GuideStep>
          <GuideStep title="Enter New password and Confirm new password">The rules sit beside the boxes: at least 12 characters with an uppercase letter, a lowercase letter, a number and a special character, and different from your current password. If the two new boxes differ, <strong>Passwords do not match.</strong> appears and <strong>Save password</strong> stays off.</GuideStep>
          <GuideStep title="Select Save password">The boxes empty and <strong>Password changed.</strong> appears.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="after-you-save" title="After you save">
        <p>Changing your password signs you out of every device signed in to your account, this one included. Each device, a phone left signed in or a computer at home, asks for the new password within 15 minutes.</p>
        <GuideCallout tone="tip" title="Sign in again straight away">Select <strong>Sign in again now</strong> under the message and sign in with the new password. Otherwise this screen signs you out on its own within 15 minutes, which can interrupt something half finished.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Current password is incorrect.</strong> under Current password: check Caps Lock and try again. If you have forgotten it, sign out and use <strong>Forgot password</strong>.</li>
          <li>A message under New password: it names the rule the password missed. <strong>New password must differ from current password.</strong> means you typed your current one.</li>
          <li><strong>Exit proxy to change your password</strong>: you are proxying as somebody else. Exit proxy from the account menu and open the page again.</li>
        </ul>
        <GuideCallout tone="warning" title="Never send a password in a chat">Nobody helping you, at your school or at XVS, needs your password.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "Password changed. appeared.",
          "You signed in again with the new password.",
          "The old password no longer works.",
        ]} />
      </GuideSection>
    </div>
  );
}
