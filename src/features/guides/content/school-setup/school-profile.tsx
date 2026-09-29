import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["The fields are greyed out and there is no Save changes", "Your role can read the profile but not change it. The page says so at the bottom. A school administrator makes the changes."],
  ["Save changes stays disabled", "Nothing has changed yet, or a field has an error shown under it. Correct the field and try again."],
  ["Something is missing that only XVS can set", "The school name, sign-in address or school code is missing. Select Tell XVS to raise it."],
  ["The logo will not upload", "Use a PNG, JPG or WEBP image of 2MB or smaller."],
  ["You cannot open your school's profile", "Your account does not include the school profile. Ask whoever set up your account."],
] as const;

export default function SchoolProfileArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The school profile holds the details XVS uses across every module. Most of it was filled in when your school was created; the rest is yours to confirm. Open it from the profile card in the control room with <strong>Open profile</strong>.</p>
        <GuideChecklist items={[
          "You know how the school is owned.",
          "You know how your year is divided: into terms or into semesters.",
          "You know the currency your school charges in.",
          "You have your logo as an image file, if you want one.",
        ]} />
      </GuideSection>

      <GuideSection id="what-xvs-sets" title="What XVS sets">
        <p>The <strong>Set by XVS</strong> panel shows <strong>School name</strong>, <strong>Sign-in address</strong> and <strong>School code</strong>. You cannot type over them. Your sign-in address is the web address your staff use, so it stays fixed.</p>
        <GuideCallout tone="warning" title="Check these before you go live">If any of these is wrong, tell XVS before you go live. Use the headset in the header or the <strong>Tell XVS</strong> button when the page shows one.</GuideCallout>
      </GuideSection>

      <GuideSection id="fill-in-your-details" title="Fill in your details">
        <p>If anything required is empty, a <strong>Still to fill in</strong> note at the top names it, and the step stays open until all of it is set.</p>
        <GuideSteps>
          <GuideStep title="Choose the required values">Under <strong>Yours to confirm</strong>, choose <strong>Ownership type</strong>, <strong>Term structure</strong> and <strong>Currency</strong>. The options come from XVS.</GuideStep>
          <GuideStep title="Add the optional details">Fill in <strong>Registration number</strong>, <strong>Address</strong>, <strong>Website</strong> and <strong>Motto</strong> if you have them.</GuideStep>
          <GuideStep title="Save">Select <strong>Save changes</strong>. Only the fields you changed are sent, and every save is recorded against your school.</GuideStep>
          <GuideStep title="Go back to the checklist">Select <strong>Back to control room</strong> and mark the profile step done.</GuideStep>
        </GuideSteps>
        <p>All times in XVS are shown in West Africa Time (WAT). It is not a setting you can change.</p>
      </GuideSection>

      <GuideSection id="add-your-logo" title="Add your logo">
        <p>Your logo appears in the sidebar and on the browser tab. In the <strong>Logo</strong> panel, select <strong>Upload a logo</strong> (or <strong>Replace logo</strong>) and pick a PNG, JPG or WEBP image up to 2MB. A square PNG on a transparent background reads best. <strong>Remove</strong> takes the logo away.</p>
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
        <GuideCallout tone="tip" title="You are done when">There is no <strong>Still to fill in</strong> note, the three XVS details are correct, and the profile step in the control room shows <strong>Done</strong>.</GuideCallout>
      </GuideSection>
    </div>
  );
}
