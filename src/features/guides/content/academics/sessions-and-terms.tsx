import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function SessionsAndTermsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A session is one school year, such as 2026/2027, and the terms or semesters inside it. Levels, classes, subjects, calendar events and timetables all belong to a session, so the year comes first. Open <strong>Academic Structure</strong>, then <strong>Sessions &amp; Terms</strong>.</p>
        <GuideChecklist items={[
          "You know the first and last day of the school year.",
          "You know the start and end date of every term.",
          "If your school runs several branches, you know which branches follow this year.",
          "You can see the New session button. If not, your role cannot create sessions.",
        ]} />
        <p>The three cards at the top show the <strong>Active session</strong>, how many <strong>Terms running</strong>, and the year&apos;s <strong>Teaching weeks</strong>.</p>
      </GuideSection>

      <GuideSection id="create-a-session" title="Create a session and its terms">
        <GuideSteps>
          <GuideStep title="Open the form">Select <strong>New session</strong>. The <strong>Create session</strong> panel opens on the right.</GuideStep>
          <GuideStep title="Name the year">Type a <strong>Session name</strong>, for example <em>2026/2027</em>. Each session needs its own name.</GuideStep>
          <GuideStep title="Set the dates">Choose when the session <strong>Starts</strong> and <strong>Ends</strong>. The end must come after the start.</GuideStep>
          <GuideStep title="Fill in the terms">The form opens with the rows your school chose during setup: three terms (First Term, Second Term, Third Term) or two semesters. Rename them if you like and give each a start and end date. Use <strong>Add term</strong> (or <strong>Add semester</strong>) for another row, and the cross beside a row to remove it.</GuideStep>
          <GuideStep title="Save">Select <strong>Create</strong>. The session appears as a card on the list. Make it active when the school is ready to run it.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Term dates follow each other">Each term&apos;s dates must fall inside the session and after the term before it, so the date picker only offers days that fit. If a term&apos;s dates are greyed out, the line under it says which earlier term needs its end date first.</GuideCallout>
      </GuideSection>

      <GuideSection id="choose-branches" title="Choose where the session applies">
        <p>When your school runs more than one branch, the form asks where the session <strong>Applies to</strong>:</p>
        <GuideSteps>
          <GuideStep title="The whole school">Covers every branch, including any branch opened while the year is running. Most schools choose this.</GuideStep>
          <GuideStep title="Selected branches">Type into the box to pick the branches that follow this year. Pick at least one.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="One set of dates">A session runs on the same dates everywhere it applies. A branch cannot keep its own term dates. A branch on a different calendar needs a session of its own.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-a-session" title="Read a session">
        <p>Each card shows the session&apos;s dates, its status, a marker per term (a tick once a term has ended), and the number of teaching weeks. Switch to <strong>Table</strong> for a compact list, or search and filter by status. Select a card, or <strong>View details</strong>, to open the session.</p>
        <p>The session page shows <strong>Teaching weeks</strong>, the number of <strong>Terms</strong>, a <strong>Session progress</strong> timeline, and a card per term marked <strong>Completed</strong>, <strong>Ongoing</strong> or <strong>Not started</strong>. Use <strong>Edit session</strong> to change its name, dates, terms or branches.</p>
      </GuideSection>

      <GuideSection id="set-active" title="Make a session the active one">
        <p>Only one session can be active at a time, and everything built on a session follows the active one.</p>
        <GuideSteps>
          <GuideStep title="Open the card menu">Select the three dots on the session&apos;s card.</GuideStep>
          <GuideStep title="Choose Set as active">Read the confirmation. If another year is active, it names that year, which stops being active.</GuideStep>
          <GuideStep title="Confirm">Select <strong>Set as active</strong>. The card gains a green edge and the Active session card at the top changes.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="copy-structure" title="Start a year from another year">
        <p>Levels, classes and subjects belong to a year, so a fresh year starts empty. Rather than typing them all again, copy them from a year you have already built and then edit the differences.</p>
        <GuideSteps>
          <GuideStep title="Open the copy">On the fresh year&apos;s card, open the menu and choose <strong>Copy structure in</strong>. The same copy is offered as <strong>Copy from another year</strong> on Programmes &amp; Levels and Classes &amp; Arms when the year you are looking at has nothing on it yet.</GuideStep>
          <GuideStep title="Pick the source">Under <strong>Copy from</strong>, choose the year to copy. The year the school is running is marked <em>running now</em>.</GuideStep>
          <GuideStep title="Copy">Select <strong>Copy structure</strong>. A message confirms how many levels, classes and subjects came across.</GuideStep>
        </GuideSteps>
        <p>What comes across: levels and which level each one promotes into; classes with their branch, arm and capacity; subjects and the levels they are taught at. Pupils do not come across, and nothing archived does.</p>
        <GuideCallout tone="info" title="Who can copy">The copy creates structure for the whole school, so it is offered only to people who can create structure and who work across the whole school rather than one branch. It is not offered on an archived year.</GuideCallout>
      </GuideSection>

      <GuideSection id="archive-a-session" title="Archive a session">
        <p>Archive a year when it is over. Open the card menu, choose <strong>Archive</strong>, then <strong>Archive session</strong>.</p>
        <GuideCallout tone="danger" title="Archiving the active year">If you archive the active session, the school has no active session until you set another one. Make the next year active first.</GuideCallout>
        <p>An archived session is read-only history. You can still open it, but nothing in it can be changed, and choosing it in the year selector at the foot of the sidebar shows a <em>Read-only</em> notice on every screen that follows the year. To change an archived year, use <strong>Set as active</strong> on it first.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="Create or Save changes stays grey">Every field marked with an asterisk needs a value, the session must end after it starts, every term needs a name and both dates, and there must be at least one term. When editing, the button wakes up only once you change something.</GuideStep>
          <GuideStep title="The name is refused">Another session already uses that name. The message appears under the field. Choose a different name.</GuideStep>
          <GuideStep title="Edit session is missing or greyed out">The session is archived, your role cannot edit sessions, or the session also covers branches outside your own.</GuideStep>
          <GuideStep title="Copy structure in is refused">A year that already has levels, classes or subjects cannot be copied into. The message says what the year already holds.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The year you run is marked Active, each term card shows the right dates and teaching weeks, and the Academic Structure overview names this year at the top.</GuideCallout>
      </GuideSection>
    </div>
  );
}
