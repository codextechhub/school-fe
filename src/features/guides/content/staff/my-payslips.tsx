import { GuideCallout, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function MyPayslipsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="open-your-payslips" title="Open your payslips">
        <p>Everybody the school pays through XVS can read their own payslips and yearly tax summary. Nobody else&apos;s are ever shown to you, and yours are shown to nobody through this page.</p>
        <GuideSteps>
          <GuideStep title="From your picture">Select your picture at the top right, then <strong>My payslips</strong>.</GuideStep>
          <GuideStep title="Read a payslip">Select a month to read it on screen, or <strong>PDF</strong> to open the printable payslip, the same one the school prints and emails.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="what-a-payslip-shows" title="What a payslip shows">
        <p>Your earnings, each deduction (PAYE, pension, NHF and any loan or savings deduction), your net pay, and what the school pays on top. <strong>This employer, year to date</strong> is your pay and tax at this school so far this year.</p>
        <GuideCallout tone="info" title="Pay from before you joined">
          If you joined during the year, your pay and tax at your previous employer count in your PAYE, so the year&apos;s tax comes out right. Your payslip shows them apart, under <strong>Earlier this tax year with</strong> that employer, and never adds them to this school&apos;s year to date.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="your-tax-summary" title="Your tax summary">
        <p>Select <strong>Tax summary</strong> and choose the year. It lists each month paid here and totals this school&apos;s year. Select <strong>PDF</strong> to keep or print it.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "No payslips yet", body: "A payslip appears once a payroll run that pays you is paid. If your school sends payslips by email only, they are not shown here." },
          { title: "A figure looks wrong", body: "Ask your school's payroll officer. They can see how your PAYE was worked out." },
          { title: "Earlier pay is missing", body: "If you joined during the year, give your payroll officer your P45 or tax deduction card so your earlier pay can be recorded." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">You can open My payslips from your picture, read each payslip and open its PDF, and read your tax summary for the year.</GuideCallout>
      </GuideSection>
    </div>
  );
}
