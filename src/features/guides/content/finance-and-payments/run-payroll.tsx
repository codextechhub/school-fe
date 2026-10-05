import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "No payroll access", body: "Payroll carries what each named person is paid, so it needs its own restricted grant. Ask whoever manages roles." },
  { title: "Some figures are missing", body: "Your role hides some pay figures. A hidden figure has no column and no field, and payslips and tax summaries are not offered without all of them." },
  { title: "Your pay change was refused", body: "Your role may read that figure but not change it. You can still correct the details it may change, such as a name. Ask whoever manages Field Access." },
  { title: "Adding someone was refused", body: "They are already on the payroll at a branch. Each person has one salary record: to move them, edit that record and change its branch." },
  { title: "The run covers nobody", body: "No active employees exist for the branch or school you chose, or another run already pays them for the month. Add them under Employee salaries first." },
  { title: "This run covers is asked for", body: "The school runs payroll per branch. Choose the whole school or one branch. After a whole-school run, no branch run can be raised for the same period." },
  { title: "The run was refused for earlier pay", body: "The school requires earlier pay before a joiner is paid. Record it on each person named, zeros if they had no previous employer, then generate the run again." },
  { title: "Earlier pay could not be changed", body: "A draft run still holds the person. Cancel the draft, make the change, and generate the run again." },
  { title: "Void run is missing", body: "A run cannot be voided once its net pay, or any branch's share of it, has been paid." },
] as const;

export default function RunPayrollArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Payroll works from a <strong>roster</strong>: one salary record for each member of staff, holding their standard monthly pay and the details PAYE and pension need. A <strong>payroll run</strong> works out each person&apos;s gross, PAYE, pension, NHF and other deductions and their net pay for a month, and the school&apos;s own pension, NSITF and ITF on top. Posting it records what is owed; paying it records the salaries leaving the bank.</p>
        <GuideChecklist items={[
          "Joiners, leavers and pay changes for the month are agreed.",
          "The pay date falls in an open fiscal period.",
          "Each joiner's pay from earlier in the year, from their P45 or tax deduction card, is to hand.",
          "You know which branch each member of staff is paid from.",
        ]} />
        <GuideCallout tone="danger" title="Pay is personal">
          Everyone who can open Payroll sees what each named person earns, unless their role hides a figure. Keep payroll access to the people who run it.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="payroll-settings" title="Choose the payroll settings">
        <p>Someone who covers the whole school sets these once, in <strong>Finance Settings</strong> under <strong>Payroll</strong>. Anyone else can read them.</p>
        <GuideSteps>
          <GuideStep title="Where PAYE comes from"><strong>Computed from the tax table</strong> works PAYE out over the whole tax year, so the year&apos;s tax comes out right when pay changes. <strong>Supplied by the school</strong> takes it from each person&apos;s salary structure or roster figures.</GuideStep>
          <GuideStep title="Deductions and contributions">Switch employee pension, employer pension, NHF, NSITF and ITF on or off, and change their rates.</GuideStep>
          <GuideStep title="Payslips">Choose whether staff see their payslips in the app, are emailed them, or both.</GuideStep>
          <GuideStep title="Earlier pay">Switch on <strong>Earlier pay required</strong> to refuse a run that pays a joiner with nothing recorded. If the school&apos;s payroll ran elsewhere earlier in the year, set <strong>Payroll moved here on</strong> to the day it moved.</GuideStep>
          <GuideStep title="Voluntary deductions">Under <strong>Voluntary deductions</strong>, add each kind the school takes from pay, such as a staff loan or cooperative savings, with the account it is owed to.</GuideStep>
        </GuideSteps>
        <p>A change applies from the next run generated. Runs already raised keep their figures.</p>
      </GuideSection>

      <GuideSection id="salary-structures" title="Set up salary structures">
        <p>A structure splits gross pay into parts, such as Basic and Housing. Open the <strong>Salary structures</strong> tab and select <strong>New structure</strong>. Add each <strong>Earning</strong> and <strong>Deduction</strong> and choose its <strong>Method</strong> (<strong>% of gross</strong>, <strong>% of basic</strong> or <strong>Fixed ₦ amount</strong>). Tick <strong>Counts as basic</strong> on the basic pay: NHF is worked out on it. The preview shows the take-home on a sample gross. Select <strong>Create structure</strong>.</p>
      </GuideSection>

      <GuideSection id="build-the-roster" title="Build the roster">
        <GuideSteps>
          <GuideStep title="Open Employee salaries and select Add employee">Choose the <strong>Staff member</strong>, so the record is linked to their account and they can read their own payslips. Check the <strong>Employee name</strong> and choose their <strong>Branch</strong>.</GuideStep>
          <GuideStep title="Enter their pay">Enter <strong>Gross (monthly)</strong> and pick a <strong>Salary structure</strong>, or keep <strong>Flat</strong>.</GuideStep>
          <GuideStep title="Enter the tax and pension details">Choose their <strong>State of residence</strong> (left as their branch&apos;s state if not chosen) and <strong>Pension administrator</strong>, and enter their <strong>Tax ID</strong>, <strong>Pension PIN</strong> and <strong>Annual rent</strong> for rent relief. PAYE is paid to the state they live in, and pension to their administrator.</GuideStep>
          <GuideStep title="Save">Select <strong>Add employee</strong>.</GuideStep>
        </GuideSteps>
        <p>Each person has <strong>one active salary record</strong>, whichever branch pays them. Adding someone already paid at a branch is refused, so nobody is paid twice.</p>
        <p>To move a person to another branch, edit their record, change the <strong>Branch</strong>, and set <strong>Takes effect on</strong> with a <strong>Reason for the change</strong>. Say Aisha moves from Ikeja to Lekki from 1 March: Ikeja keeps paying them and holding their record until that day, and Lekki pays them from then on. Pay, structure, cost centre and state changes are dated the same way. Left empty, a change applies from the first month not yet paid; a date ahead changes nothing until that day.</p>
        <p>Select a person to open their record: <strong>Pay history</strong> lists every version of their pay with the day it took effect and who changed it, and a change entered ahead is marked as still to come. To take someone off the payroll, select <strong>Remove</strong>: they stay listed as Inactive, with their history.</p>
        <p>To set a person&apos;s PAYE by hand, edit their record, tick <strong>Set their PAYE by hand</strong>, and give the amount and a reason. It is used on every run until it is cleared, and the reason is kept in the audit trail.</p>
        <GuideCallout tone="info" title="Some roles may read pay but not change it">
          A role whose pay figures are read-only sees them greyed. Saving a change to one of them is refused and nothing is saved, and the form says which figure was refused. Correcting a name on the same record is not refused.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="earlier-pay" title="Record earlier pay">
        <p>PAYE counts the whole tax year, so somebody who joined after January brings their earlier pay with them. People with nothing recorded are listed above the roster under <strong>Earlier pay still to record</strong>, and named again when a run is generated.</p>
        <GuideSteps>
          <GuideStep title="Open their record">Select the person, then <strong>Earlier pay</strong>, then <strong>Record earlier pay</strong>.</GuideStep>
          <GuideStep title="Enter the previous employer's figures">Choose <strong>A previous employer</strong>, the <strong>Tax year</strong>, and enter the <strong>Previous employer</strong>, <strong>Gross pay</strong>, <strong>Taxable pay</strong>, <strong>PAYE deducted</strong>, <strong>Pension</strong> and <strong>NHF</strong> from their P45 or tax deduction card, with its reference. Select <strong>Record</strong>.</GuideStep>
          <GuideStep title="Or record none">For someone with no previous employer, such as a new graduate, select <strong>No previous employer</strong>. They drop off the list.</GuideStep>
        </GuideSteps>
        <p>If the previous employer deducted more than was due, nothing is deducted here until the extra is used up; payroll never refunds tax. A school whose payroll moved here during the year records each person&apos;s earlier months as <strong>Earlier months at this school</strong> instead.</p>
        <GuideCallout tone="warning" title="Corrections reach the next run">
          A correction is used from the next run raised. Posted runs keep their figures, and while a draft run holds the person the correction is refused: cancel the draft, correct, and generate it again.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="deductions" title="Voluntary deductions">
        <p>Open the person&apos;s record, then <strong>Deductions</strong>, then <strong>Add deduction</strong>. Choose the kind, the amount <strong>Each month</strong>, and, for a loan, <strong>Stop at a total</strong>. It comes off every run until its end date or its total, to its own account. Select the stop button to end it early.</p>
      </GuideSection>

      <GuideSection id="generate-and-post" title="Generate and post the run">
        <GuideSteps>
          <GuideStep title="Select New payroll run">Keep <strong>From roster</strong>. Enter the <strong>Period</strong>, such as <em>June 2026</em>, and the <strong>Payment date</strong>. Where the school pays per branch, choose what <strong>This run covers</strong>.</GuideStep>
          <GuideStep title="Check who it pays">The drawer says how many active employees the run will cover. Nobody already paid for the month is put on it. Select <strong>Generate run</strong>: a draft run appears.</GuideStep>
          <GuideStep title="Review the draft">Open it and check each person&apos;s figures and the totals, including NHF and the school&apos;s pension, NSITF and ITF. Select <strong>Details</strong> on a person for their deductions and how their PAYE was worked out.</GuideStep>
          <GuideStep title="Select Calculate &amp; post">The salary cost and what is owed to staff, to each state&apos;s revenue service and to each pension administrator are posted, branch by branch. The run reads <strong>Calculated</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A run for the whole school, seen from one branch">
          A bursar who covers one branch opens a whole-school run through their branch&apos;s part: they see only their branch&apos;s staff and totals, and posting, paying and voiding are left to someone who covers the whole school.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="pay-net-wages" title="Pay the staff">
        <p>Once the transfers have been made, open the run and select <strong>Pay net</strong>, choose the <strong>Payment date</strong>, and confirm. A run for several branches is paid branch by branch, each from its own bank account. The run reads <strong>Paid</strong> once every branch is paid, and each person is sent their payslip as the school has chosen.</p>
        <GuideCallout tone="warning" title="Record the payment once">
          Pay net records the salaries leaving the bank. Make the bank transfers exactly once, and match them in bank reconciliation.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="payslips-and-returns" title="Payslips and statutory returns">
        <p>The <strong>Payslips</strong> tab lists every payslip; open one to read it, or select <strong>PDF</strong> for the printable payslip. It shows this school&apos;s year to date, and keeps pay brought forward apart: a previous employer&apos;s figures under <strong>Earlier this tax year with</strong> that employer, and the school&apos;s own months before its payroll ran here under <strong>Before this payroll</strong>. A person&apos;s yearly tax summary is under <strong>Tax year</strong> on their record. Staff read their own payslips and tax summary under <strong>My payslips</strong>, from their picture at the top right.</p>
        <p>PAYE is owed to the state each person lives in, so there is one PAYE return per state. Pension is owed to each person&apos;s pension administrator, so there is one pension return per administrator. NHF, NSITF and ITF have returns of their own. In <strong>Tax Remittance</strong>, open a return to see <strong>People on this return</strong>; it lists only what payroll deducted here, never pay brought forward.</p>
        <p><strong>Annual PAYE return</strong>, on Tax Remittance, lists each person&apos;s year at this school: months here, gross, taxable pay, PAYE and pension. It includes the school&apos;s own months before its payroll ran here, and never a previous employer&apos;s pay, which that employer files. A bursar who covers one branch is shown their branch&apos;s part. Both lists need a role that sees every pay figure.</p>
      </GuideSection>

      <GuideSection id="correct-a-run" title="Correct a run">
        <p>A draft run can be discarded with <strong>Cancel run</strong>; nothing was posted. A calculated run can be undone with <strong>Void run</strong>, which reverses its entries, but only before any net pay is paid. Then generate the run again.</p>
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
          Every joiner&apos;s earlier pay is recorded, the run covers exactly the staff due pay, it reads Paid, the bank shows each salary once, payslips have reached staff, and the PAYE, pension and other returns are on their way in Tax Remittance.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
