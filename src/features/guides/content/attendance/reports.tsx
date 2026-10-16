import { GuideSection } from "../../article-components";
import { useGuideWords } from "../../guide-words";

export default function ReportsArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open <strong>Attendance</strong>, then <strong>Reports</strong>. The report covers one {w.term}, the current one first; choose another {w.term} from the control beside Download. The branch selector at the foot of the sidebar narrows it to one branch.</p>
      </GuideSection>

      <GuideSection id="read-the-term" title={`Read the ${w.term}`}>
        <p>Every figure is drawn only from registers that were taken. A day a class took no register is counted as not taken, never as absences, so a late register lowers no rate.</p>
        <p><strong>Overview</strong> puts the attendance rate, students at risk, register gaps and late arrivals above the weekly chart. <strong>Needs attention</strong> opens the relevant list directly. A grey dash in the chart is a week with no register taken.</p>
        <p><strong>Classes</strong> gives the rate, absences and lateness, and each class&apos;s days not taken. The other tabs separate students at risk, register gaps and missed lessons so each list stays focused.</p>
      </GuideSection>

      <GuideSection id="chronic" title="Students at risk">
        <p>The students whose rate for the {w.term} is below your school&apos;s line, lowest first. The line is set in Settings, under Attendance. An excused day lowers the rate as an absence does, so each row gives the days absent and the days excused separately. Select a name to open that student&apos;s attendance.</p>
      </GuideSection>

      <GuideSection id="not-taken" title="Registers not taken">
        <p>Every day a class owed a register and none was submitted. Select the date to open that register: a register never taken can still be taken late.</p>
      </GuideSection>

      <GuideSection id="download" title="Download a table">
        <p><strong>Download</strong> at the top saves Classes, Students at risk or Register gaps as CSV, Excel or PDF, for the same {w.term} and branch as the screen. Downloading needs its own permission; reading the report is not enough.</p>
      </GuideSection>
    </div>
  );
}
