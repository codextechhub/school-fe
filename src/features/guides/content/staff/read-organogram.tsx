import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["There is no Organogram in the sidebar", "Your role does not include the organogram, or your school is not live yet. The organogram opens once the school is live."],
  ["Nobody has been appointed to a post yet", "The school has not built its chart. Somebody who can manage the organogram sets up units and posts, then appoints staff to them."],
  ["A post you know exists is missing", "The chart shows posts that somebody holds. A vacant post is left off, and the people under it move up to the nearest filled post above."],
  ["Nobody holds a post in this unit yet", "The unit filter is on a unit with no filled posts. Select Reset to see the whole school again."],
  ["There is no Open staff profile", "You can always open your own record. Opening a colleague's needs access to the staff directory."],
] as const;

export default function ReadOrganogramArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The <strong>Organogram</strong> shows who reports to whom across the whole school, every branch included. Every member of staff can read it. It carries names, posts, units and reporting lines; contact details, pay and leave stay on the staff record.</p>
        <p>Open it with <strong>Organogram</strong> in the sidebar. It opens on your own reporting line, with the rest of the chart closed. If you hold no post, it opens on the top two levels of the school instead.</p>
      </GuideSection>

      <GuideSection id="people-and-posts" title="People and Posts">
        <p>Two tabs show the same chart two ways:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">People</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">One card per person, with their name and post. Somebody who holds two posts appears twice, once under each manager. An <strong>Acting</strong> label marks cover for a post.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Posts</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">One card per post, with its title and code and the faces of the people who hold it. This tab can also show dotted lines.</p>
          </div>
        </div>
        <p>Both tabs show the school as it is staffed: a post nobody holds is left off, and the people under it move up to the nearest filled post above.</p>
        <p>If your role can edit staff records, a strip above the tabs counts <strong>Active staff</strong>, <strong>Departments</strong>, <strong>Acting</strong>, <strong>On leave</strong> and <strong>Suspended</strong>.</p>
      </GuideSection>

      <GuideSection id="find-someone" title="Find somebody or a post">
        <GuideSteps>
          <GuideStep title="Search">Type a name, post or unit into <strong>Search by name, post or unit…</strong>. Each result is marked person or post.</GuideStep>
          <GuideStep title="Jump to it">Select a result. The chart opens fully, switches to the right tab, and highlights the card.</GuideStep>
        </GuideSteps>
        <p>To look at one part of the school, pick a unit in the <strong>All units</strong> box. The chart narrows to that unit and the units under it, and a <strong>Showing</strong> line names it. Select <strong>Reset</strong> to see the whole school again.</p>
      </GuideSection>

      <GuideSection id="open-and-close" title="Open and close the chart">
        <p>A card with people or posts under it has a small count. Select it to open or close what sits beneath. On a People card the count reads direct reports, then everybody below them.</p>
        <p>On your own line, a manager&apos;s card first shows only the next person on the way down to you. Select its count again to show everybody who reports to them.</p>
        <p><strong>Expand all</strong> opens every card. <strong>Collapse all</strong> returns to your own reporting line.</p>
      </GuideSection>

      <GuideSection id="zoom-and-move" title="Zoom and move around">
        <p>Use the controls at the bottom right: <strong>Zoom out</strong>, <strong>Zoom in</strong> and <strong>Reset zoom</strong>, with the current size shown between them. You can also hold Ctrl (or Cmd on a Mac) and scroll, or pinch on a trackpad. With a mouse, drag the empty background to move the chart; on a touch screen, swipe.</p>
      </GuideSection>

      <GuideSection id="dotted-lines" title="See dotted lines">
        <p>A dotted line is a second reporting relationship beside the solid one, such as a branch head of sciences who also answers to a school-wide director of studies for the curriculum. On the <strong>Posts</strong> tab, select <strong>Dotted lines</strong> to show them. Each card then lists the posts it also reports to, with the reason when one was given, and the posts that also report to it.</p>
      </GuideSection>

      <GuideSection id="person-and-post-panels" title="Open a person or a post">
        <p>Select a card, or a face on a Posts card, to open a panel on the right.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Person</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Their <strong>Post</strong>, <strong>Unit</strong> and <strong>Branch</strong>, and their <strong>Reporting line</strong> up to the top of the school. Select any name in the line to open that person. With access to the staff directory you also see <strong>Open staff profile</strong>, and if your role can edit staff records, <strong>Post history</strong>.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">Post</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Its <strong>Status</strong>, who it <strong>Reports to</strong>, its <strong>Unit</strong>, who it is <strong>Held by</strong>, any <strong>Dotted lines</strong>, and the <strong>Posts reporting here</strong>.</p>
          </div>
        </div>
        <p>A post with no branch reads <strong>School-wide</strong>.</p>
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
        <GuideCallout tone="tip" title="You are done when">You can find your own place on the chart, see who you report to and who reports to you, and open anybody&apos;s card to read their post and reporting line.</GuideCallout>
      </GuideSection>
    </div>
  );
}
