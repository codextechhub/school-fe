import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ManageApprovalsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Manage Approvals</strong> under <strong>Workflow</strong> lists every approval request in the school, not only yours. Use it to find a request that is stuck, see who it is waiting on, and, if your role allows it, change who approves it.</p>
        <GuideChecklist items={[
          "Reading the list needs permission to view every request.",
          "Changing who approves needs a separate permission. Without it you see the list and the requests, and no controls to change them.",
          "Every change needs a reason. Nothing is deleted: each change is kept in the request's history.",
        ]} />
      </GuideSection>

      <GuideSection id="find-a-request" title="Find a request">
        <GuideSteps>
          <GuideStep title="Narrow the list">Filter by <strong>Document type</strong>, <strong>Status</strong> (pick several if you like), <strong>Waiting on</strong>, <strong>Raised by</strong>, <strong>Request for</strong>, <strong>Waiting longer than</strong> and the days it was submitted. Once a document type is chosen you can also pick a <strong>Stage</strong>. Where your school has more than one branch, <strong>Branch</strong> narrows it to one.</GuideStep>
          <GuideStep title="Search">Type a title or document number in the search box.</GuideStep>
          <GuideStep title="Read the row">Each row shows the document, who it is for, who raised it, which stage it is on (such as &quot;2 of 3&quot;), who it is waiting on and for how long.</GuideStep>
        </GuideSteps>
        <p>The filters stay in the page address, so you can bookmark a view or send it to a colleague.</p>
      </GuideSection>

      <GuideSection id="change-who-approves" title="Change who approves one request">
        <GuideSteps>
          <GuideStep title="Open the request">Select its row. The <strong>Approvers</strong> section shows every stage in order: finished stages with the votes cast, the stage waiting now with each person&apos;s vote so far, and upcoming stages with who would approve if they opened now.</GuideStep>
          <GuideStep title="Select Change approvers">On a stage that has not finished, add a person or remove one. Someone who has already voted cannot be removed; reverse their vote first if it must go.</GuideStep>
          <GuideStep title="Give a reason and save">The reason is required. People added to the stage waiting now are told the request is waiting on them; people removed are told it no longer needs them.</GuideStep>
        </GuideSteps>
        <p>Changing an upcoming stage sets who approves it when the request gets there. <strong>Use normal approvers</strong> drops that choice again.</p>
      </GuideSection>

      <GuideSection id="replace-across-requests" title="Replace one approver across many requests">
        <GuideSteps>
          <GuideStep title="Filter to the person">Set <strong>Waiting on</strong> to the person who is away.</GuideStep>
          <GuideStep title="Select the requests">Tick the rows, or the box in the header to take the whole page.</GuideStep>
          <GuideStep title="Select Replace approver">Choose who takes their place, give a reason, and select <strong>Replace</strong>. The result says how many requests changed, and why any were skipped.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="delegate-for-someone" title="Set up a delegation for someone else">
        <p>On <strong>Delegations</strong>, a role that may change approvers also gets <strong>On behalf of</strong> in <strong>New Delegation</strong>, and an <strong>Everyone</strong> tab listing every delegation in the school, where any of them can be revoked. A delegation that starts today also joins requests already waiting on that person, and the screen says how many.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideChecklist items={[
          "The remove button is greyed out: that person has already voted on the stage.",
          "A request was skipped: the reason is listed beside it, such as the person having already approved.",
          "The Approvers section is missing: your role can view requests but not change who approves them.",
          "A finished request shows no controls: approved, rejected, withdrawn and cancelled requests cannot be changed.",
        ]} />
        <GuideCallout tone="warning" title="Change the person, not the rule">If the same stage keeps needing a change, adjust the approval path or the approver group instead, so new requests start with the right people.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The request lists the people you expect on the stage, and the change appears under Changes with your reason.</GuideCallout>
      </GuideSection>
    </div>
  );
}
