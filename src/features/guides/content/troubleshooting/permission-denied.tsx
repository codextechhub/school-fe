import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function PermissionDeniedArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>XVS shows each person only what their role allows and what the school&apos;s plan includes. When something is missing or refused, the screen is usually working as set up. The fix is a change to your role, made by whoever manages roles at your school.</p>
        <GuideChecklist items={[
          "Note the screen you were on and what you tried to do.",
          "Know who manages roles at your school.",
        ]} />
      </GuideSection>

      <GuideSection id="recognise-the-message" title="Recognise the message">
        <GuideSteps>
          <GuideStep title="Access Denied on a whole page">The page reads <strong>Access Denied</strong> and says you do not have permission to view it. Your role does not include this screen.</GuideStep>
          <GuideStep title="A refusal when you save">A red message such as <strong>You don&apos;t have permission to perform this action.</strong> appears when you save, send or delete. You may read the record but not change it.</GuideStep>
          <GuideStep title="A message beside a field">A form can refuse one field and accept the rest. The message sits under the field. The school&apos;s <strong>Field Access</strong> settings decide who may change it.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="missing-menu-or-button" title="A menu item or button is missing">
        <p>A sidebar item, a button such as <strong>Add</strong>, or an action in the search box is hidden, not greyed out, when you cannot use it. There are three reasons it can be hidden:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Your role</strong> does not include it. This is the most common reason.</li>
          <li><strong>The school&apos;s plan</strong> does not include that part of XVS. Your school administrator can confirm this with XVS.</li>
          <li><strong>The session is archived.</strong> Buttons that change records are hidden while you look at an archived session, even if your role allows them. Switch to the active session first.</li>
        </ul>
        <GuideCallout tone="tip" title="Check the session before asking for access">If a colleague with the same role can see the button and you cannot, compare the session each of you has chosen at the foot of the sidebar first.</GuideCallout>
      </GuideSection>

      <GuideSection id="ask-for-access" title="Ask for access">
        <GuideSteps>
          <GuideStep title="Tell your administrator exactly what you need">Name the screen and the action, for example &quot;add a class on Classes &amp; Arms&quot;, rather than asking for more access in general.</GuideStep>
          <GuideStep title="Wait for the change to take effect">Your administrator changes your role under <strong>Roles &amp; Permissions</strong>. Some changes need an approval before they apply, and the role shows as waiting until then.</GuideStep>
          <GuideStep title="Refresh your view">XVS checks your permissions again when you come back to the tab. If the item still does not appear, reload the page.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Do not share accounts">Never sign in as a colleague to reach a screen your role does not include. Every action is recorded against the account that took it.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li>You see the list but not one record: your role may be limited to certain branches. Ask your administrator which branches your account reaches.</li>
          <li>A guide shows <strong>Access Denied</strong>: the guide describes work your role does not include.</li>
          <li>The refusal started after a role change: come back to the tab or reload so XVS reads your new permissions.</li>
          <li>You believe the refusal is wrong: raise a ticket from the headset in the header and name the screen and the action.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "You know which of role, plan or archived session is stopping you.",
          "Your administrator knows the exact screen and action you need.",
          "After the change, the item appears once you reload.",
        ]} />
      </GuideSection>
    </div>
  );
}
