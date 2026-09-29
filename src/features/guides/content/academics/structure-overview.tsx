import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords } from "../../guide-words";

export default function StructureOverviewArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The academic structure is everything a school year is built from: the year and its {w.terms}, departments, programmes and their levels, classes and subjects. <strong>Overview</strong>, the first item under <strong>Academic Structure</strong> in the sidebar, shows all of it on one page and tells you what is still missing.</p>
        <GuideChecklist items={[
          "You can see Academic Structure in the sidebar.",
          "You know which branch and which school year you want to look at.",
          "You know who in your school sets up the structure, if you only read it.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-year" title="Read the year at the top">
        <p>The top panel names the year you are looking at, such as <em>2026/2027 Academic Session</em>, with a badge reading <strong>Active</strong>, <strong>Draft</strong> or <strong>Archived</strong>. Under the name you see the year&apos;s dates and where it stands: which {w.term} is underway, which {w.term} is next, or <strong>Session complete</strong>.</p>
        <p>Each {w.term} appears as a pill on the right, and the bar underneath shows how much of the year has passed. The foot of the panel counts departments and links to <strong>Sessions &amp; {w.Terms}</strong>.</p>
        <GuideCallout tone="info" title="No year yet">If the panel reads <strong>No active academic session</strong>, the school has not set one up. Use <strong>Go to sessions</strong> to create a year and make it active. Everything else on this page counts against a year.</GuideCallout>
      </GuideSection>

      <GuideSection id="browse-the-structure" title="Browse the structure">
        <p>Four cards count the <strong>Programmes</strong>, <strong>Levels</strong>, <strong>Classes</strong> and <strong>Subjects</strong> in the year you are looking at. Below them, <strong>The structure</strong> has two views.</p>
        <GuideSteps>
          <GuideStep title="List">One row each for Sessions &amp; {w.Terms}, Departments, Programmes &amp; Levels, Classes &amp; Arms, and Subjects. Select a row to open that screen. On a wider screen each row also shows its count.</GuideStep>
          <GuideStep title="Tree">Shows how the pieces connect, from the year down through programmes and levels. Open a level to see its classes and subjects, or use <strong>Expand all</strong> to open everything at once.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="readiness" title="Check structure readiness">
        <p><strong>Structure readiness</strong>, at the foot of the page, scores five setup steps and shows a percentage:</p>
        <GuideChecklist items={[
          "Session configured",
          "Departments created",
          "Programmes and levels set",
          "Classes and arms set",
          "Subjects added",
        ]} />
        <p>A step with a tick is done. A step marked with <strong>!</strong> still needs attention. When all five are done the panel reads <em>The core academic structure is configured.</em></p>
        <GuideCallout tone="tip" title="What readiness does not check">It counts what exists. It does not check that every subject is offered at a level, or that every level has a promotion rule. Check those on the Subjects and Programmes &amp; Levels screens.</GuideCallout>
      </GuideSection>

      <GuideSection id="setup-order" title="Build it in order">
        <p>Each piece depends on the one before it, so set the structure up in this order:</p>
        <GuideSteps>
          <GuideStep title={`Sessions & ${w.Terms}`}>Create the school year, add its {w.terms}, and make it active.</GuideStep>
          <GuideStep title="Departments">Optional, but programmes and subjects can be grouped under them.</GuideStep>
          <GuideStep title="Programmes & Levels">Add each programme and the levels pupils move through inside it.</GuideStep>
          <GuideStep title="Classes & Arms">A class sits at a level, so levels must exist first.</GuideStep>
          <GuideStep title="Subjects">Add subjects and choose the levels each is offered at.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="branch-and-year" title="Branch and year">
        <p>The branch and year selectors at the foot of the sidebar change every count on this page. When your school runs more than one branch and you choose one, the list rows say <em>in this branch</em> beside their counts.</p>
        <GuideCallout tone="warning" title="A past year is read-only">When you choose an archived year, a notice at the top of the page reads <em>Read-only</em> and names the active year to switch to. The overview still shows that year&apos;s numbers, but its screens will not let you change anything.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="A branch is in no academic session">This notice appears when every running year names the branches it applies to and one branch is left out. Select <strong>Open sessions</strong> and add that branch to a year.</GuideStep>
          <GuideStep title="The counts look too low">Check the branch and year selectors. A count for one branch, or for a year that has not been started, is smaller than the school-wide figure for the current year.</GuideStep>
          <GuideStep title="A sidebar item is missing">Each screen under Academic Structure is shown only to people allowed to open it. Ask whoever manages roles in your school if you need one you cannot see.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The top panel names the active year, the four counts match what your school runs, and Structure readiness reaches 100%.</GuideCallout>
      </GuideSection>
    </div>
  );
}
