import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";
import { useGuideWords, type TermWords } from "../../guide-words";

const problems = (w: TermWords) => [
  { title: `The rules show no ${w.term} or session dates`, body: `The school has no active academic session yet. Set up the academic calendar; the ${w.term} and session rules start resolving once it exists.` },
  { title: "Save stays disabled", body: "Nothing has changed, or the number of days is not a whole number between 0 and 365." },
  { title: "The rule could not be loaded", body: "Reading it needs the fees view permission, and saving it needs the fees update permission. Ask whoever manages roles." },
] as const;

export default function FeeDueDatesArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Fee due dates</strong>, in Finance Settings, is the school&apos;s rule for when a fee bill falls due once it is raised. There is one rule for the whole school, so a pupil at one branch and a sibling at another fall due on the same day.</p>
        <GuideChecklist items={[
          "The head or bursar has agreed when fees are due.",
          `The academic calendar has an active session and its ${w.terms}.`,
        ]} />
      </GuideSection>

      <GuideSection id="choose-the-rule" title="Choose the rule">
        <GuideSteps>
          <GuideStep title="Open Finance Settings, then Fee due dates">Four rules are offered: <strong>End of the term billed</strong>, <strong>End of the session billed</strong>, <strong>End of the month the bill is raised</strong>, and <strong>A set number of days after the bill</strong>.</GuideStep>
          <GuideStep title="Read the dates">Under each rule the screen shows the date a bill raised today would be due, worked out against the current {w.term} and session named above the rules. Pick the one whose date matches what you tell parents. A fee run works the date out against the {w.term} its fee structure is linked to, which can be a different {w.term}.</GuideStep>
          <GuideStep title="Set the days, if you chose days after">Enter <strong>Days after the bill</strong>. Zero means due the day it is raised.</GuideStep>
          <GuideStep title="Select Save">The rule applies to fee bills raised from then on.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A school that never sets it">
          Bills are due at the end of the term billed until the rule is changed.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="how-dates-work" title="How the dates are worked out">
        <p>A bill is never due before the day it is raised. If the fees for First Term are billed late, after the {w.term}&apos;s end date, they are due the day they are billed, so parents are not chased for lateness that was the school&apos;s.</p>
        <p>Changing the rule does not move the due dates on bills already raised.</p>
        <GuideCallout tone="info" title="Where the rule is used">
          Every fee run from a fee structure uses it: Generate invoices and Batch generate on Receivables work the date out from this rule and show it in the preview before anything is billed. A single invoice raised with New invoice does not: it takes the Due date typed on its form, or Default invoice due days from the Documents section when that is left empty.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {problems(w).map(({ title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="It is set when">
          The chosen rule shows the date you expect for this {w.term}, and the preview of the next fee run shows that date.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
