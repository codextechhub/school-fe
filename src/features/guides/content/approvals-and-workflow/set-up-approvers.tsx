import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function SetUpApproversArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Approvers</strong> decides who can approve, in two ways. A <strong>group</strong> is a named pool of people, such as the proprietor and the head teacher. A <strong>Dynamic Role</strong> is a short list of rules that picks the approver from the document itself, such as sending big purchases to the proprietor and the rest to the bursar. An approval path then points each of its steps at a role, a group or a Dynamic Role.</p>
        <GuideChecklist items={[
          "Open Workflow under Administration, then Approvers.",
          "Write down who should approve what, and above which amounts, before you build anything.",
          "Prefer roles over named people, so the right person approves after staff change.",
        ]} />
      </GuideSection>

      <GuideSection id="build-a-group" title="Build an approver group">
        <GuideSteps>
          <GuideStep title="Select New group">On the <strong>Groups</strong> tab, select <strong>New group</strong>. Give it a <strong>Name</strong>, such as &quot;Purchase approvers&quot;, and a <strong>Description</strong> of what it signs off. The <strong>Code</strong> fills in from the name and cannot be changed once the group exists. Select <strong>Create group</strong>.</GuideStep>
          <GuideStep title="Add members">Select <strong>Add member</strong>. Choose from <strong>People</strong> or <strong>Roles</strong>, and <strong>Positions</strong> when your school has an organogram. Tick everyone who belongs, then select <strong>Add</strong>.</GuideStep>
          <GuideStep title="Check who can approve today">Select the <strong>effective approvers</strong> count under the group&apos;s name to see <strong>Who can approve right now</strong>, and how each person got there.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Roles and positions keep themselves current">Adding the Bursar role rather than Mrs Adeyemi means the group still works when a new bursar is appointed.</GuideCallout>
      </GuideSection>

      <GuideSection id="build-a-dynamic-role" title="Build a Dynamic Role">
        <GuideSteps>
          <GuideStep title="Select New Dynamic Role">Open the <strong>Dynamic Role</strong> tab and select <strong>New Dynamic Role</strong>. Give it a <strong>Name</strong>, such as &quot;Spend approver&quot;, and a <strong>Description</strong>.</GuideStep>
          <GuideStep title="Add rules">Select <strong>Add rule</strong>. Under <strong>When</strong>, choose what the rule looks at in <strong>About</strong> and <strong>What</strong>, such as the amount, then the value. Under <strong>Then send it to</strong>, choose <strong>A role</strong>, <strong>A named person</strong> or <strong>An approver group</strong>.</GuideStep>
          <GuideStep title="Put the rules in order">Rules are read top to bottom and the first one that fits decides. Use the arrows to move a rule. Put the narrowest rule first, for example &quot;over five hundred thousand naira goes to the proprietor&quot; above &quot;over fifty thousand goes to the head teacher&quot;.</GuideStep>
          <GuideStep title="Fill in Otherwise">Every Dynamic Role ends with <strong>Otherwise, send it to</strong>. It catches every document no rule does, so a request always reaches somebody.</GuideStep>
          <GuideStep title="Save">Select <strong>Create Dynamic Role</strong>, or <strong>Save</strong> when editing. A change applies to the next request, not to ones already waiting.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="test-before-relying" title="Test before a step relies on it">
        <p>Select a Dynamic Role to see its rules in words and the stages that use it. Under <strong>Try it</strong>, choose who raises the request in <strong>Raised by</strong>, enter an <strong>Amount</strong> where the rules test one, and select <strong>Try it</strong>. The page says which rule decides and who would be asked.</p>
        <GuideCallout tone="warning" title="Nobody can approve their own request">If a rule sends a request to the same person who raised it, the result warns that nobody can approve it. Try the people who raise requests most often, not only yourself.</GuideCallout>
        <p>For a group, a red notice saying <strong>This group cannot approve anything.</strong> means it resolves to nobody while a live step still points at it. Requests reaching that step wait until someone is added.</p>
      </GuideSection>

      <GuideSection id="switch-off-or-delete" title="Switch off or delete">
        <p><strong>Deactivate</strong> switches a group or a Dynamic Role off without losing it, and <strong>Reactivate</strong> brings it back. While it is off, any step that uses it finds nobody and waits.</p>
        <p><strong>Delete</strong> removes it for good. While a step still uses it you are told it is in use, and for a group you can choose <strong>Deactivate instead</strong>. Point that step somewhere else first on the approval path.</p>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every group shows at least one effective approver, each Dynamic Role has a sensible Otherwise, and Try it sends a typical request to the person you expect.</GuideCallout>
      </GuideSection>
    </div>
  );
}
