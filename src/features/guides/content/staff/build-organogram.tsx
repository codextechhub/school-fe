import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const KEYS = [
  ["New unit, New post, New dotted line", "Your role can create organogram structure."],
  ["Edit a unit or a post", "Your role can update organogram structure."],
  ["Delete a unit or a post, remove a dotted line", "Your role can delete organogram structure."],
  ["Appoint somebody, or end an appointment", "Your role can appoint to posts."],
] as const;

const PROBLEMS = [
  ["There are no divisions yet", "A department or team needs a division above it. Create the division first, then come back."],
  ["A unit will not delete", "Units under it, or posts still in it, block the delete. Delete or move them first."],
  ["A post will not delete", "A post anybody has ever held keeps its history and cannot be deleted. Edit it and turn Active off instead."],
  ["The edit, delete or appoint buttons are missing on a row", "That unit or post is not yours to change, usually because it belongs to another branch or to the whole school. On a wide screen, the buttons also appear only when you point at the row."],
  ["A save is refused with a message about branches", "The message explains the branch rule that stopped it, such as creating something for the whole school when you work in one branch. Follow what it says."],
  ["Every seat on this post is filled", "The post already has as many holders as its headcount. End the old appointment first when you are replacing somebody."],
] as const;

export default function BuildOrganogramArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Manage organogram</strong> holds the school&apos;s units, the posts in them and who holds each, and the dotted lines between posts. Open it with <strong>Manage</strong> at the top of the organogram. It has three tabs: <strong>Units</strong>, <strong>Posts</strong> and <strong>Dotted lines</strong>.</p>
        <p>Each button appears only when your role holds its key:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {KEYS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <GuideChecklist items={[
          "You know the school's divisions, departments and teams.",
          "You know the posts in each, who each post reports to, and how many people fill it.",
        ]} />
      </GuideSection>

      <GuideSection id="build-the-units" title="Build the units">
        <p>Units come in three tiers: a <strong>Division</strong> at the top, a <strong>Department</strong> inside a division, and a <strong>Team</strong> inside a department. Select a row to open or close the units under it.</p>
        <GuideSteps>
          <GuideStep title="Start a unit">On the <strong>Units</strong> tab, select <strong>New unit</strong>.</GuideStep>
          <GuideStep title="Name it">Fill in <strong>Name</strong>. XVS suggests a <strong>Code</strong> from the name; change it if you prefer your own.</GuideStep>
          <GuideStep title="Place it">Choose the <strong>Tier</strong>. For a department, pick its <strong>Division</strong>; for a team, pick the <strong>Division</strong> and then the <strong>Department</strong>. The <strong>Sits under</strong> line shows where it will go.</GuideStep>
          <GuideStep title="Say which branch it belongs to">If your school has more than one branch, <strong>Applies to</strong> asks for <strong>The whole school</strong> or <strong>One branch</strong>. A unit under a branch unit takes that branch automatically.</GuideStep>
          <GuideStep title="Finish">Optionally pick a <strong>Head post</strong> and add a <strong>Description</strong>. Leave <strong>Active</strong> on, then select <strong>Create</strong>.</GuideStep>
        </GuideSteps>
        <p>The head of a unit is whoever holds its head post, so the unit updates when somebody new is appointed to that post.</p>
      </GuideSection>

      <GuideSection id="add-the-posts" title="Add the posts">
        <p>The <strong>Posts</strong> tab lists every post in order of who reports to whom, including the ones nobody holds. Each row shows how many of its seats are filled, such as <strong>1/2 filled</strong>.</p>
        <GuideSteps>
          <GuideStep title="Start a post">Select <strong>New post</strong>. Start with the head of the school, since the posts below report up to it.</GuideStep>
          <GuideStep title="Title and code">Fill in <strong>Title</strong> and <strong>Code</strong>, such as Head of Primary and HOP.</GuideStep>
          <GuideStep title="Choose its unit">Pick the <strong>Division</strong>, then a <strong>Department</strong> and <strong>Team</strong> if it sits deeper. A post can sit in any tier; the deepest one you pick is its unit, and the post takes that unit&apos;s branch. The <strong>Sits in</strong> line confirms it.</GuideStep>
          <GuideStep title="Reporting line and size">Pick who it <strong>Reports to</strong>, and set <strong>Headcount</strong> to the number of people the post is for. Then select <strong>Create</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Reporting stays within a branch">A post can report to a school-wide post or to one in its own branch, never to a post in a different branch.</GuideCallout>
      </GuideSection>

      <GuideSection id="appoint-people" title="Appoint people to posts">
        <GuideSteps>
          <GuideStep title="Open the post">On the <strong>Posts</strong> tab, select the appoint button on the post&apos;s row. The dialog lists who it is <strong>Held by</strong>, each with the date they started.</GuideStep>
          <GuideStep title="Pick the person">In <strong>Member of staff</strong>, type at least two letters of a name and pick them.</GuideStep>
          <GuideStep title="Primary or not">Leave <strong>Primary post</strong> on when this becomes their main post: their current primary post, if they have one, ends the day this one starts. Turn it off to give them this post alongside their primary post, which stays unchanged.</GuideStep>
          <GuideStep title="Acting cover">Turn on <strong>Acting</strong> when the person is covering for a holder who is away or not yet hired. They show with an <strong>Acting</strong> label on the chart.</GuideStep>
          <GuideStep title="Start date and save">Set <strong>Starts</strong>, or leave it empty for today. Select <strong>Appoint</strong>, then <strong>Done</strong>.</GuideStep>
        </GuideSteps>
        <p>To end somebody&apos;s appointment, open the same dialog and select <strong>End</strong> beside their name. <strong>End</strong> appears only on appointments you manage: both the post and the person have to be within your reach.</p>
        <GuideCallout tone="info" title="Who can be appointed">XVS appoints somebody based at the post&apos;s branch, or staff who work across the whole school. If the person does not fit, the dialog says why.</GuideCallout>
      </GuideSection>

      <GuideSection id="add-dotted-lines" title="Add dotted lines">
        <p>A dotted line is a second line of reporting beside the solid one. There is one per pair of posts.</p>
        <GuideSteps>
          <GuideStep title="Start a line">On the <strong>Dotted lines</strong> tab, select <strong>New dotted line</strong>.</GuideStep>
          <GuideStep title="Pick the two posts">Choose the <strong>Post</strong>, then the post it <strong>Also reports to</strong>. Like a solid line, a dotted line never joins two different branches.</GuideStep>
          <GuideStep title="Say why">Optionally fill in <strong>Why</strong>, such as curriculum oversight, then select <strong>Add</strong>.</GuideStep>
        </GuideSteps>
        <p>To take a line away, select the remove button on its row and confirm with <strong>Remove</strong>.</p>
      </GuideSection>

      <GuideSection id="branch-administrators" title="If you manage one branch">
        <p>A branch administrator changes only their own branch&apos;s units and posts. The edit, delete and appoint buttons appear only on the rows that are yours to change. If you work in one branch, anything you create is filed in it. If you work in several, <strong>Applies to</strong> offers those branches but not <strong>The whole school</strong>.</p>
        <p>To add a post under a division that applies to the whole school, pick one of your branch&apos;s departments in it. The form tells you when that is needed.</p>
      </GuideSection>

      <GuideSection id="change-or-remove" title="Change or remove a unit or post">
        <p>Use the edit button on a row to rename, move or change a unit or post, then select <strong>Save</strong>. Turn <strong>Active</strong> off to retire one without losing its history.</p>
        <GuideCallout tone="warning" title="Deleting is permanent">
          The delete button removes a unit or post for good after you confirm. A unit with units or posts still in it cannot be deleted, and a post anybody has ever held cannot be deleted either. Turn <strong>Active</strong> off for those instead.
        </GuideCallout>
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
        <GuideCallout tone="tip" title="You are done when">Every unit and post your school runs is listed, each post reports to the right post, the people who hold them are appointed, and the organogram shows the reporting lines you expect.</GuideCallout>
      </GuideSection>
    </div>
  );
}
