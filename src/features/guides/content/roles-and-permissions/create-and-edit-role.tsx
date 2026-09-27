import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["There is no Edit role button", "The role is locked (it says This role is locked.), or your role cannot change roles. Create a role of your own instead of changing a locked one."],
  ["A permission cannot be ticked", "Its module or resource is not on your current plan. The reason shows under the permission."],
  ["Save changes stays disabled", "Nothing has changed yet. Change a detail, a permission or the branch reach first."],
  ["Say why this access is needed or changing", "A reason is required whenever you create a role or change its permissions or branch reach."],
  ["Delete role is greyed out", "The role has been held by someone before. Take it out of use instead, which keeps that record."],
  ["Someone is missing from the Give list", "Only staff still on the roll are offered. Someone who has left keeps their history but takes no further roles."],
] as const;

export default function CreateAndEditRoleArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A role is a named job with a set of permissions and a branch reach. Everyone who holds the role gets exactly that access. Open <strong>Roles &amp; Permissions</strong> in the sidebar under Administration.</p>
        <GuideChecklist items={[
          "You know the job the role is for and what it must be able to do.",
          "You know whether it covers the whole school or only some branches.",
          "You have checked no existing role already fits.",
          "You can say in a sentence why the access is needed.",
        ]} />
        <GuideCallout tone="warning" title="Give the least access the job needs">A change to a role reaches everyone who holds it. Add only what the job needs, and remove what it does not.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-the-directory" title="Read the role directory">
        <p>The top of the page counts <strong>Total roles</strong>, <strong>Custom roles</strong> and <strong>Active role assignments</strong>. Under <strong>Role directory</strong>, <strong>School roles</strong> lists the roles XVS set up and <strong>Custom roles</strong> lists your own. Each row shows how many people hold it, how many permissions it has, its <strong>Reach</strong> (named branches, or <strong>School-wide</strong>) and whether it is <strong>Active</strong> or <strong>Out of use</strong>. Use <strong>Search roles</strong> to find one by name.</p>
      </GuideSection>

      <GuideSection id="open-a-role" title="Open a role">
        <p>Select a row to open the role. It has three tabs:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Permissions</strong>: every permission the role holds, grouped by area, with <strong>Search granted permissions</strong>. Anything still waiting for approval is listed at the top.</li>
          <li><strong>People</strong>: who holds the role and which branches it reaches for each of them.</li>
          <li><strong>Overview</strong>: name, branch reach, description, and whether it is a school role or a custom role.</li>
        </ul>
      </GuideSection>

      <GuideSection id="create-a-role" title="Create a role">
        <GuideSteps>
          <GuideStep title="Start the form">Select <strong>Create role</strong>.</GuideStep>
          <GuideStep title="Name and describe it">Enter a <strong>Role name</strong>, such as Assistant Bursar, and a <strong>Description</strong> so colleagues know what it is for.</GuideStep>
          <GuideStep title="Choose its branch reach">Under <strong>Branch reach</strong>, choose <strong>School-wide</strong> (all branches, including future ones) or <strong>Selected branches</strong> and tick the branches. Everyone given the role gets its full reach.</GuideStep>
          <GuideStep title="Tick its permissions">Under <strong>Permissions to grant</strong>, choose a <strong>Module</strong>, then a <strong>Resource</strong>, and tick the actions the role may take. <strong>Search permission labels</strong> narrows the list. Ticks stay when you move to another resource, and the count shows how many are selected.</GuideStep>
          <GuideStep title="Say why">Fill in <strong>Why is this role needed or changing?</strong>. It is required, and it goes with any approval request the save raises.</GuideStep>
          <GuideStep title="Create it">Select <strong>Create role</strong>. The role opens once it is saved.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Approval required">A permission marked <strong>Approval required</strong> is restricted. The form warns you before saving: the role saves, and the restricted permissions wait for approval before they take effect.</GuideCallout>
      </GuideSection>

      <GuideSection id="edit-a-role" title="Edit a role">
        <p>Open the role and select <strong>Edit role</strong>. Change what you need and select <strong>Save changes</strong>. A reason is required if you change its permissions or branch reach. The permissions you leave ticked are exactly what the role holds after saving, so untick anything it should lose.</p>
      </GuideSection>

      <GuideSection id="give-the-role-to-people" title="Give the role to people">
        <GuideSteps>
          <GuideStep title="Open the People tab">On the role, select <strong>People</strong>, then <strong>Give this role to somebody</strong>.</GuideStep>
          <GuideStep title="Find the person">Use <strong>Search staff by name, email or job</strong>. Anyone who already has the role shows <strong>Holds it</strong>.</GuideStep>
          <GuideStep title="Give it">Select <strong>Give</strong>. A role given here covers the role&apos;s full reach. Some grants wait for approval first; the message says so when they do.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="take-a-role-out-of-use" title="Take a role out of use or delete it">
        <p><strong>Take out of use</strong> stops the role being used while keeping its record; <strong>Put back in use</strong> reverses it. On a custom role that nobody has ever held, <strong>Delete role</strong> removes it for good after you confirm.</p>
        <GuideCallout tone="danger" title="Deleting cannot be undone">If the role has ever been held, <strong>Delete role</strong> is greyed out. Take it out of use instead. School roles cannot be deleted.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The role shows the right reach and permission count, its People tab lists the right people, and nothing you expected to take effect is still waiting for approval.</GuideCallout>
      </GuideSection>
    </div>
  );
}
