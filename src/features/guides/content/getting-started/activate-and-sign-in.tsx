import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ActivateAndSignInArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Your school creates your account and sends an invitation to your email address. The link in that invitation is how you set your first password. After that, you sign in at your school&apos;s own web address with your email or your staff ID.</p>
        <GuideChecklist items={[
          "Open the invitation from an email account only you use.",
          "Know your school's web address, such as your-school.xvs.codexng.com.",
          "Prepare a password of at least 12 characters with an uppercase letter, a lowercase letter, a number and a special character.",
          "Never forward the invitation or share its link.",
        ]} />
        <GuideCallout tone="warning" title="The invitation link is personal">Anybody holding the link can set the password on your account. If it has been shared, or it shows somebody else&apos;s name, stop and ask your administrator for a fresh invitation.</GuideCallout>
      </GuideSection>

      <GuideSection id="activate-your-account" title="Activate your account">
        <GuideSteps>
          <GuideStep title="Open the invitation link">The page shows <em>Verifying your invite link…</em> while it checks the link, then opens <strong>Set Your Password</strong>.</GuideStep>
          <GuideStep title="Check Name and Email">Both are filled in and cannot be changed. If either is wrong, do not continue: ask your administrator to correct the account and send a new invitation.</GuideStep>
          <GuideStep title="Enter Password and Confirm Password">The rules are shown under the password box. If a password is refused, the reason appears under the box it is about.</GuideStep>
          <GuideStep title="Select Activate Account">You see <strong>Account Activated!</strong>. Select <strong>Continue to Login</strong>, or wait a few seconds and the sign-in page opens by itself.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="sign-in" title="Sign in">
        <GuideSteps>
          <GuideStep title="Open your school's address">The sign-in page reads <strong>Sign in to your school</strong>. If it says <strong>This address does not belong to a school</strong>, you are at the wrong address: open your school&apos;s own address instead.</GuideStep>
          <GuideStep title="Enter Email or staff ID">Use the email address shown during activation, or your staff ID (for example STF/0012).</GuideStep>
          <GuideStep title="Enter Password and select Sign in">A school that is live opens on the <strong>Dashboard</strong>. A school still being set up opens on its onboarding screens. If you were sent to sign in from a page, you may be returned to that page instead.</GuideStep>
        </GuideSteps>
        <GuideCallout title="What you see after signing in">Your role decides which menus and buttons appear. Signing in proves who you are; it does not add anything to what your role allows.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Link Expired</strong> on the activation page: the invitation is invalid, already used, or out of date. Ask your administrator to resend it from the <strong>Invitations</strong> screen, then use only the newest email.</li>
          <li><strong>Invalid credentials. Please try again.</strong>: check the email or staff ID and the password. If you have forgotten the password, use <strong>Forgot password</strong> on the sign-in page.</li>
          <li><strong>Your account is not yet activated</strong>: finish activation from your invitation email first.</li>
          <li><strong>Your account is locked</strong>: reset your password or ask your administrator to unlock it.</li>
          <li><strong>Your account has been suspended</strong> or <strong>This account has been deactivated</strong>: only your administrator can restore it. A password reset does not.</li>
          <li><strong>Too many attempts. Please wait a moment and try again.</strong>: stop for a minute before the next try.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "Your account shows Account Activated! once.",
          "You can sign in at your school's own address.",
          "Your email or staff ID and password work together.",
          "Nobody else has seen your invitation link or password.",
        ]} />
      </GuideSection>
    </div>
  );
}
