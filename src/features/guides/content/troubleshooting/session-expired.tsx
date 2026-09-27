import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function SessionExpiredArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>XVS signs you out after a spell with no activity, so an unattended screen cannot be used by somebody else. It warns you first and gives you time to stay.</p>
        <GuideChecklist items={[
          "Save your work before you step away from the screen.",
          "Know your email or staff ID and password, or how to reset the password.",
        ]} />
      </GuideSection>

      <GuideSection id="stay-signed-in" title="Stay signed in">
        <GuideSteps>
          <GuideStep title="Watch for Still there?">After about five minutes with no mouse, keyboard or touch activity, <strong>Still there?</strong> appears with a countdown until automatic sign-out.</GuideStep>
          <GuideStep title="Select Continue Session">You stay signed in and carry on where you were. <strong>Log Out</strong> signs you out straight away.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Time away still counts">If your computer sleeps or you switch to another tab, XVS measures the time you were away when you come back. A long absence goes straight to <strong>Session Expired</strong>.</GuideCallout>
      </GuideSection>

      <GuideSection id="sign-back-in" title="Sign back in">
        <GuideSteps>
          <GuideStep title="Select Go to Login">When the countdown runs out, <strong>Session Expired</strong> appears. Select <strong>Go to Login</strong>.</GuideStep>
          <GuideStep title="Read the note on the sign-in page">A line above the form says why you were signed out, for example that your session expired due to inactivity.</GuideStep>
          <GuideStep title="Sign in again">You may be returned to the page you were on. Otherwise you land on the Dashboard; use the sidebar or search box to go back.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Unsaved work is not kept">Anything typed into a form that was not saved before sign-out is gone. Enter it again after you sign back in.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Your session has ended. Please sign in again.</strong>: your sign-in could not be restored, often after a long time away or when the browser was closed. Sign in again.</li>
          <li><strong>Please sign in through your school&apos;s portal.</strong>: the account you used is not a school account. Sign in with your own school account at your school&apos;s address.</li>
          <li>You keep being signed out while you are working: raise a ticket from the headset in the header and say roughly when it happens.</li>
          <li>You cannot remember your password: use <strong>Forgot password</strong> on the sign-in page.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "You are signed in again.",
          "Any unsaved entries have been re-entered and saved.",
          "You know to select Continue Session when Still there? appears.",
        ]} />
      </GuideSection>
    </div>
  );
}
