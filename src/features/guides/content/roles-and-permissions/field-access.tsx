import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["The switches cannot be moved", "Your role can read field access but not change it. A school administrator makes the change."],
  ["The field search is greyed out", "Choose a module and then a resource first. Until both are chosen, the page asks you to."],
  ["A field has no Write switch", "The field is not editable, so only Read applies."],
  ["Your unsaved switches disappeared", "Choosing another role discards unsaved changes. Moving between modules and resources keeps them."],
  ["A module says not on the current plan", "Its fields are outside your plan. The reason shows once you choose it."],
] as const;

export default function FieldAccessArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A role decides which screens and actions someone can use. <strong>Field Access</strong> goes one level finer: for each role, it decides which individual fields on a record they can see and which they can change. Open <strong>Field Access</strong> in the sidebar under Administration.</p>
        <GuideChecklist items={[
          "You know which role you want to change.",
          "You know which record and which fields, such as a phone number on a staff record.",
          "You have agreed with the people in that role what they should still see.",
        ]} />
      </GuideSection>

      <GuideSection id="how-read-and-write-work" title="How Read and Write work">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-sm font-semibold text-black-01">Read off</p><p className="mt-1 text-xs leading-5 text-gray-01">The field is hidden from people in that role.</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-sm font-semibold text-black-01">Read on, Write off</p><p className="mt-1 text-xs leading-5 text-gray-01">The field is shown but greyed out, so it can be seen and not changed.</p></div>
        </div>
        <p>Write always includes Read: turning Write on turns Read on, and turning Read off turns Write off. Fields marked <strong>Sensitive</strong> deserve the most care.</p>
      </GuideSection>

      <GuideSection id="find-the-fields" title="Find the fields">
        <GuideSteps>
          <GuideStep title="Choose the role">Pick it in <strong>Role</strong>. The page opens on the first role listed, so check the name before changing anything.</GuideStep>
          <GuideStep title="Choose the module and resource">Pick a <strong>Module</strong>, then a <strong>Resource</strong>. Only resources that have fields are offered.</GuideStep>
          <GuideStep title="Narrow the list">Use <strong>Search field labels</strong>. Fields are grouped under headings, and each shows <strong>Default</strong> or <strong>Set for role</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="change-and-save" title="Change and save">
        <GuideSteps>
          <GuideStep title="Flip the switches">Change <strong>Read</strong> and <strong>Write</strong> on each field. A changed field shows <strong>Unsaved</strong>.</GuideStep>
          <GuideStep title="Undo a role setting">Select <strong>Reset to default</strong> on a field to put this role's setting back to the default.</GuideStep>
          <GuideStep title="Save">The save button counts your changes, for example <strong>Save 3 changes</strong>. Select it to apply them all at once.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="It applies to everyone in the role">The change reaches every person who holds the role, including you if you hold it.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">The message says <strong>Field access saved.</strong>, the fields you changed show <strong>Set for role</strong> (or <strong>Default</strong> after a reset), and someone in the role sees the record as you intended.</GuideCallout>
      </GuideSection>
    </div>
  );
}
