import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "No payroll access", body: "Payroll carries what each named person is paid, so it needs its own restricted grant. Ask whoever manages roles." },
  { title: "Some figures are missing", body: "Your role hides some pay figures. A hidden figure has no column and no field, and payslips cannot be printed without all of them." },
  { title: "The run covers nobody", body: "No active employees exist for the branch or school you chose. Add them under Employee salaries first." },
  { title: "This run covers is asked for", body: "The school runs payroll per branch. Choose the whole school or one branch. After a whole-school run, no branch run can be raised for the same period." },
  { title: "Void run is missing", body: "A run cannot be voided once its net pay has been paid." },
] as const;

export default function RunPayrollArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Payroll works from a <strong>roster</strong>: each member of staff&apos;s standard monthly pay. A <strong>payroll run</strong> copies the roster for a month, works out gross, PAYE, pension and net pay, and posts it. Paying the run then records the salaries leaving the bank.</p>
        <GuideChecklist items={[
          "Joiners, leavers and pay changes for the month are agreed.",
          "The pay date falls in an open fiscal period.",
          "You know which branch each member of staff is paid from, where the school pays per branch.",
        ]} />
        <GuideCallout tone="danger" title="Pay is personal">
          Everyone who can open Payroll sees what each named person earns. Keep payroll access to the people who run it.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="salary-structures" title="Set up salary structures">
        <p>A structure splits gross pay into parts, such as Basic and Housing, and works out deductions from it. Open the <strong>Salary structures</strong> tab and select <strong>New structure</strong>. Add each <strong>Earning</strong> and <strong>Deduction</strong>, choose its <strong>Method</strong> (<strong>% of gross</strong>, <strong>% of basic</strong> or <strong>Fixed ₦ amount</strong>), and set which deductions remit to <strong>PAYE</strong> or <strong>Pension</strong>. The preview shows the take-home on a sample gross. Select <strong>Create structure</strong>.</p>
      </GuideSection>

      <GuideSection id="build-the-roster" title="Build the roster">
        <GuideSteps>
          <GuideStep title="Open Employee salaries and select Add employee">Type the <strong>Employee name</strong> and choose their <strong>Branch</strong>.</GuideStep>
          <GuideStep title="Enter their pay">Enter <strong>Gross (monthly)</strong>. Pick a <strong>Salary structure</strong> to have PAYE, pension and net worked out, or <strong>Flat (manual PAYE / pension)</strong> to type them yourself.</GuideStep>
          <GuideStep title="Check the take-home">The drawer shows <strong>Net (take-home)</strong>. Select <strong>Add employee</strong>.</GuideStep>
        </GuideSteps>
        <p>When someone leaves, edit them and untick <strong>Active (included in generated runs)</strong>. Staff without a branch are flagged <strong>Unassigned</strong>, and the school cannot pay per branch until everyone has one.</p>
      </GuideSection>

      <GuideSection id="generate-and-post" title="Generate and post the run">
        <GuideSteps>
          <GuideStep title="Select New payroll run">Keep <strong>From roster</strong>. Enter the <strong>Period</strong>, such as <em>June 2026</em>, and the <strong>Payment date</strong>. Where the school pays per branch, choose what <strong>This run covers</strong>.</GuideStep>
          <GuideStep title="Check who it pays">The drawer says how many active employees the run will cover. Select <strong>Generate run</strong>: a draft run appears.</GuideStep>
          <GuideStep title="Review the draft">Open it and check each person&apos;s figures and the totals for Gross, PAYE, Pension and Net.</GuideStep>
          <GuideStep title="Select Calculate &amp; post">The salary cost and what is owed to staff, the tax office and the pension fund are posted. The run reads <strong>Calculated</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="pay-net-wages" title="Pay the staff">
        <p>Once the transfers have been made, open the run and select <strong>Pay net</strong>, choose the <strong>Payment date</strong>, and confirm. The run reads <strong>Paid</strong>.</p>
        <GuideCallout tone="warning" title="Record the payment once">
          Pay net records the salaries leaving the bank. Make the bank transfers exactly once, and match them in bank reconciliation.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="payslips-and-returns" title="Payslips and statutory returns">
        <p>The <strong>Payslips</strong> tab lists every payslip; open one for its breakdown and select <strong>Print payslip</strong>. The <strong>Statutory returns</strong> tab shows the PAYE and pension owed from each posted run, with <strong>PAYE schedule</strong> and <strong>Pension schedule</strong> to print. Paying that money over is done in Tax Remittance.</p>
      </GuideSection>

      <GuideSection id="correct-a-run" title="Correct a run">
        <p>A draft run can be discarded with <strong>Cancel run</strong>; nothing was posted. A calculated run can be undone with <strong>Void run</strong>, which reverses its entry, but only before net pay is paid. Then generate the run again.</p>
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

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="The month's payroll is done when">
          The run covers exactly the staff due pay, it reads Paid, the bank shows each salary once, payslips are available, and the PAYE and pension owed are on their way to Tax Remittance.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
