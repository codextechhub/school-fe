import {
  GuideCallout,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";
import { useGuideWords } from "../../guide-words";

const PROBLEMS = [
  { title: "Nothing to show here yet", body: "None of the figures are in your access. Your finance screens are still in the sidebar." },
  { title: "A card is missing", body: "Each card appears only for people who can see the figures behind it, so two colleagues may see different dashboards." },
  { title: "A red banner says nothing can post", body: "The fiscal calendar has run out or is about to. Select Manage fiscal periods and create the next fiscal year." },
] as const;

export default function FinanceDashboardArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Dashboard</strong>, at the top of the Finance sidebar, opens <strong>Finance overview</strong>: the state of the school&apos;s money on one page. Each card appears only when you can see the figures behind it.</p>
      </GuideSection>

      <GuideSection id="set-the-view" title="Set the view">
        <GuideSteps>
          <GuideStep title="Choose the window">Where offered, the switch at the top changes the collection figures between windows such as <strong>This {w.term}</strong> and <strong>This month</strong>.</GuideStep>
          <GuideStep title="Choose the date">The date list shows figures as of <strong>Today</strong> or the end of a fiscal period, such as <strong>End of September 2026</strong>.</GuideStep>
          <GuideStep title="Choose the tab">
            <strong>Overview</strong> is the summary. <strong>Receivables &amp; collections</strong> is about fees and parents. <strong>Cash, spend &amp; compliance</strong> covers the bank, spending, payroll and tax. You see the tabs your role allows. On the <strong>Payroll</strong> card, the last line says where the latest run stands: <em>draft, not yet posted</em>, <em>posted, not yet paid</em> (the pay is in the books but has not left the bank), or <em>paid</em>.
          </GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="read-the-overview" title="Read the overview">
        <p>The tiles give <strong>Cash &amp; bank</strong>, <strong>Receivables</strong>, what was collected in the window, and <strong>Net income, year to date</strong>. Below them, <strong>Billed vs collected</strong> compares fees raised with money received by month, and <strong>Needs your attention</strong> lists what is waiting for you, such as approvals, unmatched bank lines or payment plans behind. Select an item to go to it.</p>
        <p><strong>Receivables aging</strong> shows how long fees have been owed, <strong>Most overdue payers</strong> names the families furthest behind, and the branches card compares billing and collection across branches.</p>
      </GuideSection>

      <GuideSection id="collections" title="Follow fee collection">
        <p>On <strong>Receivables &amp; collections</strong>, the <strong>Term collection curve</strong> shows the share of the {w.term}&apos;s fees collected week by week against the target set in Finance Settings, Documents. Cards for payment plans, reminders, concessions and <strong>Credit held</strong> show where money is waiting.</p>
      </GuideSection>

      <GuideSection id="quick-actions" title="Start work from the dashboard">
        <p><strong>Record receipt</strong> and <strong>New invoice</strong> at the top open those forms directly, for people allowed to use them.</p>
        <GuideCallout tone="warning" title="Watch the fiscal year banner">
          When the fiscal calendar is about to run out, a banner warns you. If the last period passes with no next year created, every invoice, receipt and payroll posting is refused.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(({ title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>
    </div>
  );
}
