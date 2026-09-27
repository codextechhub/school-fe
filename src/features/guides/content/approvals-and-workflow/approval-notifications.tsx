import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ApprovalNotificationsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>One switch decides whether approvals tell people what is happening, by email and in the bell. It is one answer for the whole school and every branch, not a setting on each approval path, and changing it needs the same access as changing an approval path.</p>
        <GuideChecklist items={[
          "Open Settings, then Notifications. The Approvals panel is at the top.",
          "Agree with the head teacher or proprietor before you switch it off.",
        ]} />
      </GuideSection>

      <GuideSection id="what-people-are-told" title="What people are told">
        <p>While <strong>Approval notifications</strong> is on, approvals tell people at four moments, by email and in the app:</p>
        <GuideChecklist items={[
          "A step activates, and the people who can approve it are told it is waiting.",
          "A request is sent back for changes, and whoever raised it is told why.",
          "A request is rejected, and whoever raised it is told.",
          "A request is fully approved, and whoever raised it is told.",
        ]} />
      </GuideSection>

      <GuideSection id="switch-it" title="Switch it on or off">
        <GuideSteps>
          <GuideStep title="Use the switch">Turn the <strong>Notify</strong> switch beside <strong>Approval notifications</strong> on or off. It saves straight away.</GuideStep>
          <GuideStep title="Read the confirmation">Turned on, the message reads <em>Approvals will notify people again.</em> Turned off, it reads <em>Approvals will not notify anybody.</em></GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Off means nobody is told about approvals">Off stops approvals telling anybody, by email or by the bell in XVS, whatever the event list below it says for each one. Approvals still run with the same approvers. A bursar who raises a requisition hears nothing when it is approved, and the head teacher finds it only by opening Approvals.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The line under Approval notifications starts with On or Off, as your school intends.</GuideCallout>
      </GuideSection>
    </div>
  );
}
