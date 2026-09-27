import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ResetPasswordArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A reset link goes to the email address on your account, whether you ask with that email or with your staff ID. Never share a password or a reset link: nobody helping you needs either.</p>
        <GuideChecklist items={[
          "You can open the email account on your XVS account.",
          "You are at your school's own web address.",
          "Your account has been activated at least once.",
        ]} />
      </GuideSection>

      <GuideSection id="request-a-reset-link" title="Request a reset link">
        <GuideSteps>
          <GuideStep title="Select Forgot password">It sits under the password box on the sign-in page and opens <strong>Forgot Password</strong>.</GuideStep>
          <GuideStep title="Enter Email or staff ID">Use the same email or staff ID you sign in with.</GuideStep>
          <GuideStep title="Select Send Reset Link">You see <strong>Check your Email!</strong>. If you entered a staff ID, the page does not show the address, because a staff ID never reveals it: the link goes to the email on your account.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Nothing arrived?">Check spam and any quarantine folder, then select <strong>Try again</strong> on the same page. Use only the newest email if more than one arrives.</GuideCallout>
      </GuideSection>

      <GuideSection id="set-a-new-password" title="Set a new password">
        <GuideSteps>
          <GuideStep title="Open the link in the email">The page shows <em>Verifying your reset link…</em>, then <strong>Set a New Password</strong> with your Name and Email filled in.</GuideStep>
          <GuideStep title="Enter New Password and Confirm Password">Use at least 12 characters with an uppercase letter, a lowercase letter, a number and a special character. It must be different from a password you have used before.</GuideStep>
          <GuideStep title="Select Reset Password">You see <strong>Password Reset!</strong>. Select <strong>Continue to Login</strong>, or wait a few seconds for the sign-in page to open, and sign in with the new password.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Link Expired</strong>: the link is out of date or has been used. Select <strong>Request New Link</strong> and start again.</li>
          <li><strong>This address does not belong to a school</strong>: you opened the forgot password page at an address that names no school. Open your school&apos;s own address and try again.</li>
          <li>The new password is refused: read the message under the password box, which names the rule it missed.</li>
          <li>The reset works but sign-in still fails: the account may be suspended or deactivated, which only your administrator can change.</li>
        </ul>
        <GuideCallout tone="warning" title="Treat the link like a password">Do not paste a reset link into a support ticket, a chat, or a screenshot.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "Password Reset! appeared.",
          "You can sign in with the new password.",
          "The old password no longer works.",
          "Nobody else has seen the reset link.",
        ]} />
      </GuideSection>
    </div>
  );
}
