import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ApprovalNotificationsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>One switch decides whether approvals email people about what is happening. It is one answer for the whole school and every branch, not a setting on each approval path, and changing it needs the same access as changing an approval path.</p>
        <GuideChecklist items={[
          "Open Settings, then Notifications. The Approvals panel is at the top.",
          "Agree with the head teacher or proprietor before you switch it off.",
        ]} />
      </GuideSection>

      <GuideSection id="what-people-are-told" title="What people are told">
        <p>While <strong>Approval emails</strong> is on, approvals email people at four moments:</p>
        <GuideChecklist items={[
          "A step activates, and the people who can approve it are told it is waiting.",
          "A request is sent back for changes, and whoever raised it is told why.",
          "A request is rejected, and whoever raised it is told.",
          "A request is fully approved, and whoever raised it is told.",
        ]} />
      </GuideSection>

      <GuideSection id="switch-it" title="Switch it on or off">
        <GuideSteps>
          <GuideStep title="Use the switch">Turn the <strong>Email</strong> switch beside <strong>Approval emails</strong> on or off. It saves straight away.</GuideStep>
          <GuideStep title="Read the confirmation">Turned on, the message reads <em>Approvals will email people again.</em> Turned off, it reads <em>Approvals will not email anybody.</em></GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Off means nobody is emailed about approvals">Off silences every approval email, whatever the event list below it says for each one. Approvals still run with the same approvers, but nobody is emailed. A bursar who raises a requisition hears nothing when it is approved, and the head teacher finds it only by opening Approvals.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The line under Approval emails starts with On or Off, as your school intends.</GuideCallout>
      </GuideSection>
    </div>
  );
}
