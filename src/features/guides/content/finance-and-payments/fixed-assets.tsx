import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "No schedule yet", body: "The asset is still a draft. Select Acquire to capitalise it; the depreciation schedule is built then." },
  { title: "Run depreciation is refused", body: "A closed period falls in the range. Re-open it first, or run up to an earlier date." },
  { title: "Dispose warns about depreciation", body: "Depreciation is still due before the disposal date. Select Depreciate to date first so the gain or loss is worked out on an up-to-date value." },
] as const;

export default function FixedAssetsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The fixed-asset register holds what the school owns for years: buses, buildings, generators, computers, furniture. Each asset&apos;s cost is spread over its useful life as <strong>depreciation</strong>.</p>
        <GuideChecklist items={[
          "You have the invoice or evidence of the cost.",
          "Your accountant has agreed the useful life and method for this kind of asset.",
          "You know which bank account paid for it.",
        ]} />
      </GuideSection>

      <GuideSection id="add-the-asset" title="Add the asset">
        <GuideSteps>
          <GuideStep title="Open Fixed Assets and select Add asset">Enter the <strong>Asset name</strong>, for example <em>Toyota Coaster 30-seat bus</em>, its <strong>Tag / serial</strong> and <strong>Category</strong>.</GuideStep>
          <GuideStep title="Enter cost and life">Fill in the <strong>Acquisition date</strong>, <strong>Useful life (months)</strong>, <strong>Cost</strong> and any <strong>Salvage value</strong>. Choose the <strong>Depreciation method</strong>: <strong>Straight line</strong> for an equal charge each month, or <strong>Declining balance</strong> for more early on.</GuideStep>
          <GuideStep title="Select Add asset">It is saved as a draft.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="acquire" title="Capitalise it">
        <p>Open the asset and select <strong>Acquire</strong>. Choose the bank account under <strong>Funded from (bank account)</strong> and select <strong>Capitalise</strong>. The cost is posted to the asset register, and the <strong>Depreciation schedule</strong> appears, year by year. The asset reads <strong>In use</strong>.</p>
      </GuideSection>

      <GuideSection id="depreciate" title="Post depreciation">
        <p>At month end, select <strong>Run depreciation</strong> on the register, choose <strong>Post all charges due up to</strong>, check the preview, and select <strong>Post depreciation</strong>. One asset can be brought up to date on its own with <strong>Depreciate to date</strong>. Running it again does not double-charge: only charges not yet posted are due.</p>
      </GuideSection>

      <GuideSection id="dispose" title="Sell or scrap an asset">
        <p>Open the asset and select <strong>Dispose</strong>. Enter the <strong>Disposal date</strong> and any <strong>Proceeds</strong>, with the bank they went into. The screen shows the <strong>Gain on disposal</strong> or <strong>Loss on disposal</strong> and asks for the account to post it to. Select <strong>Dispose</strong>.</p>
        <GuideCallout tone="warning" title="Disposal is final">
          A disposed asset leaves the register. Check the date and proceeds against the sale receipt before confirming.
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
        <GuideCallout tone="tip" title="The register is in order when">
          Every asset the school owns is In use with a schedule, depreciation is posted up to the last month end, and anything sold or scrapped reads Disposed.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
