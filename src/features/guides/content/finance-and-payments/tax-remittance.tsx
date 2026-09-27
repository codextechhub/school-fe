import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "The accrued amount is zero", body: "Nothing was posted to the obligation's payable account in that period. Check payroll was posted, and that the obligation points at the right account." },
  { title: "Un-file is missing", body: "Something has already been paid on the return, so it can no longer go back to draft." },
  { title: "The payment date is refused", body: "A payment cannot be dated before the return was filed, and must fall in an open period." },
] as const;

export default function TaxRemittanceArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Tax Remittance tracks what the school owes the tax office and other authorities, most often PAYE and pension deducted from staff pay. Each return moves from <strong>Open</strong> to <strong>Filed</strong> to <strong>Paid</strong>.</p>
        <GuideChecklist items={[
          "Payroll for the period is posted.",
          "You know the authority's filing deadline.",
          "You have the filing reference once the return is submitted.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-obligation" title="Set up an obligation">
        <p>Do this once per tax. Select <strong>New obligation</strong>, enter the <strong>Code</strong> and <strong>Name</strong>, choose the <strong>Type</strong> (VAT, WHT, PAYE, Pension or Other levy), the <strong>Liability (payable) account</strong> it builds up in, the <strong>Authority</strong>, the <strong>Frequency</strong> and the <strong>Filing day</strong>. Select <strong>Create obligation</strong>.</p>
      </GuideSection>

      <GuideSection id="prepare-and-file" title="Prepare and file a return">
        <GuideSteps>
          <GuideStep title="Select New filing">Pick the <strong>Tax obligation</strong>, the <strong>Period start</strong> and <strong>Period end</strong>, and the <strong>Due date</strong>. <strong>Prepare filing</strong> reads the amount owed for the period from the ledger.</GuideStep>
          <GuideStep title="Submit it to the authority">File the return with the tax office or pension administrator as you normally do.</GuideStep>
          <GuideStep title="Select Mark as filed">Enter the <strong>Filed date</strong> and <strong>Filing reference</strong>, and any <strong>Adjustment / penalty</strong> with its account.</GuideStep>
        </GuideSteps>
        <p>A return filed in error can be taken back with <strong>Un-file</strong>, as long as nothing has been paid on it.</p>
      </GuideSection>

      <GuideSection id="pay" title="Pay what is owed">
        <p>Open the filed return and select <strong>Pay</strong>. Choose <strong>Pay from (bank account)</strong>, the <strong>Payment date</strong> and the <strong>Amount</strong>. Part payments are allowed; the return reads Paid once the balance is cleared.</p>
        <GuideCallout tone="warning" title="Record the payment once">
          Each payment here records money leaving the bank. Enter it once, and match it in bank reconciliation.
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

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="The return is done when">
          It reads Paid, the filing reference is recorded, and <strong>Total outstanding</strong> shows nothing overdue. <strong>Filing pack</strong> prints the set for your records.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
