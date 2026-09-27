import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["A step waits for ever", "Its approvers resolve to nobody: an empty group, a switched-off Dynamic Role, or a role nobody holds. Fix the source on Approvers, or point the step at someone else."],
  ["A step was skipped", "Skip this step when nobody can approve was on and nobody could approve, or its Only run this step when condition did not fit the document."],
  ["A request already waiting did not change", "Requests keep the path they started on. Only new requests use your adjustment."],
  ["Save for this school is greyed out", "Nothing has changed yet. Make a change to a step first."],
] as const;

export default function AdjustAnApprovalPathArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>An approval path, called a template, is the list of steps a kind of document goes through before it is approved, such as a purchase requisition going to the head teacher and then the proprietor. Every school starts on the paths XVS publishes. You adjust the steps to fit how your school signs things off; you do not write new paths from nothing.</p>
        <GuideChecklist items={[
          "Open Workflow under Administration, then Templates.",
          "Set up any approver group or Dynamic Role you need first, on Approvers.",
          "Agree the change with whoever owns spending rules in your school, such as the proprietor.",
        ]} />
        <GuideCallout tone="warning" title="A change reaches every new request">From the moment you save, every new request of that kind follows your version. Requests already waiting keep the path they started on.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-a-path" title="Read an approval path">
        <GuideSteps>
          <GuideStep title="Find the path">On <strong>Workflow Templates</strong>, each row is one path. <strong>Running</strong> says which version your school uses: <strong>XVS version</strong>, or <strong>Yours</strong> once you have adjusted it.</GuideStep>
          <GuideStep title="Open it">Select a row. <strong>Stages</strong> lists each step in order with who approves it, where approvers are looked for, the advance rule, what happens on rejection, and whether it is skipped when nobody can approve.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="adjust-the-steps" title="Adjust the steps">
        <p>Select <strong>Adjust</strong> on an XVS version, or <strong>Edit</strong> on your own. The name, document and code stay as they are; what you change is the steps.</p>
        <GuideSteps>
          <GuideStep title="Order the steps">Steps run top to bottom, as <strong>How this path runs</strong> shows. Move a step with the arrows beside it, remove one with the bin, or select <strong>Add stage</strong>.</GuideStep>
          <GuideStep title="Name the step">Under <strong>What this step is</strong>, set the <strong>Step code</strong> and <strong>Step name</strong>, and whether <strong>This step</strong> <em>Waits for approval</em> or is <em>Routing only, nobody approves</em>.</GuideStep>
          <GuideStep title="Choose who approves">Under <strong>Who approves it</strong>, pick <strong>Decided by</strong>: <strong>Role holders</strong>, an <strong>Approver group</strong>, a <strong>Dynamic Role</strong>, or, where your school has an organogram, <strong>Organogram (relative to requester)</strong> such as the requester&apos;s direct manager.</GuideStep>
          <GuideStep title="Choose how it advances">Under <strong>How it advances</strong>, set <strong>How many must approve</strong> (<em>Any one of them</em>, <em>All of them</em>, or <em>A set number of them</em>) and <strong>If someone rejects</strong> (<em>The request ends there</em>, or <em>It goes back to the requester</em>).</GuideStep>
          <GuideStep title="Check More settings">Open <strong>More settings</strong> to choose where approvers are looked for, such as the whole school or this branch only. <strong>Skip this step when nobody can approve</strong> is on for a new step; switch it off when the step must never be passed over. <strong>Only run this step when</strong> limits the step to some documents, for example only amounts above a limit.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="preview-approvers" title="Preview who would approve">
        <p>Each approval step has a <strong>Who would approve?</strong> box, or <strong>Try a request</strong> for a Dynamic Role. Choose who raises it and, where asked, an <strong>Amount to try</strong>, then select <strong>Preview</strong>. Try the people who raise this kind of request most, and an amount on each side of every limit.</p>
      </GuideSection>

      <GuideSection id="save-or-go-back" title="Save, or go back to the XVS version">
        <GuideSteps>
          <GuideStep title="Save">Select <strong>Save for this school</strong> when adjusting an XVS version, or <strong>Update template</strong> on your own. The path then shows <strong>This school&apos;s version</strong>.</GuideStep>
          <GuideStep title="Go back if you need to">On your version, <strong>Use XVS&apos;s version</strong> puts the school back on the XVS path as it stands today. Your adjustments stop being used, and you can adjust again at any time. <strong>Keep ours</strong> cancels.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="When XVS updates its version">If XVS changes a path after you adjusted yours, the list says so. Nothing changes on its own; open the path and choose Use XVS&apos;s version if you want theirs.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-2 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The path shows This school&apos;s version with the steps you intended, and a preview of a typical request reaches the right people at each step.</GuideCallout>
      </GuideSection>
    </div>
  );
}
