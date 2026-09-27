import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ApprovalNotificationsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>One switch decides whether approvals tell people what is happening. It is one answer for the whole school, not a setting on each approval path, and changing it needs the same access as changing an approval path.</p>
        <GuideChecklist items={[
          "Open Workflow under Administration, then Notifications.",
          "Agree with the head teacher or proprietor before you switch it off.",
        ]} />
      </GuideSection>

      <GuideSection id="what-people-are-told" title="What people are told">
        <p>While <strong>Tell people what is happening</strong> is on, approvals write to people at four moments:</p>
        <GuideChecklist items={[
          "A step activates, and the people who can approve it are told it is waiting.",
          "A request is sent back for changes, and whoever raised it is told why.",
          "A request is rejected, and whoever raised it is told.",
          "A request is fully approved, and whoever raised it is told.",
        ]} />
      </GuideSection>

      <GuideSection id="switch-it" title="Switch it on or off">
        <GuideSteps>
          <GuideStep title="Use the switch">Turn <strong>Tell people what is happening</strong> on or off. It saves straight away.</GuideStep>
          <GuideStep title="Read the confirmation">On, the message reads <em>Approvals will tell people what is happening.</em> Off, it reads <em>Approvals will not notify anybody.</em></GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Off means nobody is written to">Approvals still run with the same approvers, but nobody is told. A bursar who raises a requisition hears nothing when it is approved, and the head teacher finds it only by opening Approvals.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The card under the switch reads On or Off as your school intends.</GuideCallout>
      </GuideSection>
    </div>
  );
}
