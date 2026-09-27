import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function HowToGuidesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The how-to guides describe the screens as they work today. You see only the guides for work your role covers, so a colleague may see more or fewer than you.</p>
        <GuideChecklist items={[
          "You are signed in.",
          "You know roughly what you are trying to do, or which screen you are stuck on.",
        ]} />
      </GuideSection>

      <GuideSection id="open-the-guides" title="Open the guides">
        <GuideSteps>
          <GuideStep title="From the sidebar">Select <strong>How-to Guides</strong> under Communication (shown once your school is live). The page opens on <strong>What do you want to do today?</strong>.</GuideStep>
          <GuideStep title="From the screen you are on">Select the headset in the header, then the link at the foot of the panel. <strong>Guides for this page</strong> lists the guides <strong>For this screen</strong> and, under <strong>If something goes wrong</strong>, the troubleshooting guides for it. <strong>Browse all guides</strong> opens the full list, and <strong>Back to your ticket</strong> returns to the form with your typing kept.</GuideStep>
          <GuideStep title="From the search box">Type two or more letters into <strong>Search your workspace</strong>. Matching guides appear under <strong>Guides</strong>, after the actions. Typing <em>manual</em> or <em>how do i</em> offers <strong>View how-to guides</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Show me on this screen">Some guides come with a short tour of the screen. Where one exists, the help panel lists it under <strong>Show me on this screen</strong>.</GuideCallout>
      </GuideSection>

      <GuideSection id="find-a-guide" title="Find a guide">
        <GuideSteps>
          <GuideStep title="Search">Type a task in the search box on the page, such as <em>enrol a student</em>, or the words of an error, such as <em>permission denied</em>. Suggestions appear as you type; use the arrow keys and Enter, or select one.</GuideStep>
          <GuideStep title="Pick your role">Under <strong>Guides for your role</strong>, select the card closest to your work. Select it again to see every role.</GuideStep>
          <GuideStep title="Browse by area">Under <strong>Browse by area</strong>, select an area to list its guides. <strong>Back to all areas</strong> returns you to the full list.</GuideStep>
          <GuideStep title="Start with the common tasks">With no search or filter, <strong>Popular tasks</strong> and <strong>Recently reviewed</strong> list good places to begin.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="tip" title="Share a filtered view">The area and role you pick are kept in the page address, so you can bookmark or share the view. <strong>Clear filters</strong> starts again.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-a-guide" title="Read a guide">
        <GuideSteps>
          <GuideStep title="Jump to a section">Use <strong>On this page</strong> to go straight to the part you need.</GuideStep>
          <GuideStep title="Open the screen">Where a guide has one main screen, <strong>Open this screen</strong> takes you there.</GuideStep>
          <GuideStep title="Tell us how it went">Select <strong>Mark complete</strong> when you finish the task, and answer <strong>Was this guide helpful?</strong> with <strong>Yes</strong> or <strong>Not yet</strong>. Your answers decide which guides are improved first.</GuideStep>
          <GuideStep title="Report an outdated guide">If a guide does not match the screen, select <strong>Report an outdated guide</strong>. The help panel opens with the guide already named; add what the screen does instead.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>No guide matches yet</strong>: try fewer words, a different order, or clear the role and area filters.</li>
          <li><strong>Access Denied</strong> on a guide: the guide covers work your role does not include, so it is not offered to you.</li>
          <li><strong>Guide is being prepared</strong>: the guide is planned but not published. Use <strong>Return to all guides</strong> and look for a related one.</li>
          <li>No guide answers your question: select <strong>Raise a support ticket</strong> under <strong>Still need help?</strong> at the foot of the guides page.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "You can open the guides from the sidebar, the help panel or the search box.",
          "You can find a guide by task or by error words.",
          "You know how to report a guide that no longer matches the screen.",
        ]} />
      </GuideSection>
    </div>
  );
}
