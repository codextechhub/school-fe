import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ViewBranchesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Branches</strong> in the sidebar lists every branch your school runs. It is for reading: XVS opens and maintains branches, so this screen has no button to add or edit one.</p>
      </GuideSection>

      <GuideSection id="read-the-branch-list" title="Read the branch list">
        <p>Each branch is a card with its name and address. A <strong>Main branch</strong> label marks your main branch; the others read <strong>Branch</strong>. A branch that is not active also shows its status, such as <strong>Pending</strong>, <strong>Suspended</strong>, <strong>Inactive</strong> or <strong>Closed</strong>. An active branch shows no status label.</p>
        <p>The <strong>Students</strong>, <strong>Teachers</strong> and <strong>Classes</strong> counts show a dash when there is no figure to give, rather than a 0 that would be wrong.</p>
      </GuideSection>

      <GuideSection id="open-a-branch" title="Open a branch">
        <GuideSteps>
          <GuideStep title="Select the card">Select a branch card, or its <strong>View</strong> button. A panel opens on the right.</GuideStep>
          <GuideStep title="Read the details">The panel shows <strong>Branch code</strong>, <strong>Address</strong>, <strong>State</strong>, <strong>Country</strong>, <strong>Email</strong> and <strong>Opened</strong>. A detail with nothing recorded reads <strong>Not on file</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="add-or-change-a-branch" title="Add or change a branch">
        <p>XVS maintains your branches. To open another branch, or to correct a branch&apos;s address or other details, ask the XVS team through the headset in the header.</p>
        <GuideCallout tone="info" title="Branches cannot be uploaded either">The data import during setup does not create branches. Only XVS opens them.</GuideCallout>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every branch you expect is listed with the right name and address. Anything missing or wrong has been raised with XVS.</GuideCallout>
      </GuideSection>
    </div>
  );
}
