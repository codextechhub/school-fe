import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function SchoolBasicsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Everything you see depends on your role and on what your school&apos;s plan includes. Two colleagues can open the same school and see different menus, buttons, and guides, because each one is shown only to people allowed to use it.</p>
        <GuideChecklist items={[
          "You have activated your account and can sign in.",
          "You know which branch you normally work in.",
          "You know who in your school manages roles, in case something you need is missing.",
        ]} />
      </GuideSection>

      <GuideSection id="find-your-way-around" title="Find your way around">
        <GuideSteps>
          <GuideStep title="Use the sidebar">The sidebar on the left groups the school by area: <strong>Overview</strong>, <strong>People</strong>, <strong>Enrolment &amp; duties</strong>, <strong>Academics</strong>, <strong>Administration</strong>, <strong>Operations</strong>, <strong>Data</strong>, and <strong>Communication</strong>. A group or item you may not use is left out, and while your school is still being set up the sidebar shows only the <strong>Onboarding</strong> group. On a phone, open the sidebar with the menu button at the top left of the header.</GuideStep>
          <GuideStep title="Open Finance or Procurement">Finance and Procurement sit under <strong>Operations</strong> and each open with a sidebar of their own. To return to the school menu, select your school&apos;s logo at the top of that sidebar, which opens the <strong>Dashboard</strong>.</GuideStep>
          <GuideStep title="Read the page title">The header always names the screen you are on. Where a screen has a <strong>Back</strong> button beside the title, it returns you to the list the screen belongs to.</GuideStep>
          <GuideStep title="Use the account menu">The circle with your initials at the right of the header shows your name and email, and holds <strong>Logout</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="search-and-quick-actions" title="Search and quick actions">
        <p><strong>Search your workspace</strong> in the header starts work by name. Type what you want to do, such as <em>enrol student</em> or <em>view timetables</em>, and press Enter. Press Ctrl E (or Command E on a Mac) to jump into the box from anywhere. On a phone, select the magnifying glass in the header first.</p>
        <p>Type two or more letters of a name to find a student, and, where your role allows it, a member of staff or a guardian. Matching people appear above the actions, and the how-to guides that match what you typed appear under <strong>Guides</strong>, after the actions.</p>
        <GuideCallout tone="tip" title="Only what you may do is offered">An action you cannot perform never appears, so if an action you expect is missing, the likely cause is your role rather than the search.</GuideCallout>
      </GuideSection>

      <GuideSection id="branch-and-year" title="Choose your branch and session">
        <p>On screens that depend on them, two selectors sit at the foot of the sidebar: the <strong>branch</strong> you are looking at and the <strong>session</strong> (the academic year). Lists, counts, and classes follow them. A selector appears only when there is a real choice, so you will not see a branch selector if you work in one branch, or a session selector if the school has only one session.</p>
        <GuideCallout tone="warning" title="An archived session is read-only">When you choose a session marked <strong>archived</strong>, the page shows a <strong>Read-only</strong> notice and the buttons that change records are hidden. Choose the session marked <strong>active</strong> to make changes.</GuideCallout>
      </GuideSection>

      <GuideSection id="notifications" title="Notifications">
        <p>The bell in the header shows how many notifications you have not read. Select it to see the latest ones, select a notification to open the record it is about, or select <strong>View all notifications</strong> for the full list. <strong>Notifications</strong> under Communication in the sidebar opens the same list.</p>
      </GuideSection>

      <GuideSection id="get-help" title="Get help">
        <p>The headset beside the bell opens a <strong>How can we help?</strong> panel over the page you are on, so you can describe the problem while it is still in front of you. The link at the foot of that panel opens <strong>Guides for this page</strong>: the guides written for the screen you are on, and what to do if something goes wrong there.</p>
        <p><strong>Support</strong> under Communication in the sidebar lists the tickets you have raised and their replies. <strong>How-to Guides</strong>, beside it, holds every guide your role covers.</p>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are ready when">You can open your usual screens from the sidebar, start a task from the search box, switch branch and session where you have a choice, and open the help panel from any page.</GuideCallout>
      </GuideSection>
    </div>
  );
}
