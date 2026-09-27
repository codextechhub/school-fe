import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["The fields are greyed out and there is no Save changes", "Your role can read the profile but not change it. The note under the form says so. A school administrator makes the changes."],
  ["Currency or Term structure is locked", "Both are fixed once the school is live. Select Contact XVS under the field to ask for a change."],
  ["Save changes stays disabled", "Nothing has changed yet, or a field has an error shown under it. Correct the field and try again."],
  ["The logo will not upload", "Use a PNG, JPG or WEBP image of 2MB or smaller."],
  ["The school name, sign-in address or school code is wrong", "Only XVS can change these. Raise it with the XVS team through the headset in the header."],
] as const;

export default function SettingsSchoolProfileArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Your school profile holds your crest and the details XVS prints on letters, receipts and report cards across every module. Open it from <strong>Settings</strong>, then <strong>School profile</strong>.</p>
        <p>It is the same form you filled in during setup. What differs after go-live is what can still change: the details that other records already depend on are locked.</p>
        <GuideChecklist items={[
          "Your role can change the school profile. Without that, you can read it but not save.",
          "You have your logo as an image file, if you are replacing it.",
        ]} />
      </GuideSection>

      <GuideSection id="what-xvs-sets" title="What XVS sets">
        <p>The <strong>Set by XVS</strong> panel shows <strong>School name</strong>, <strong>Sign-in address</strong> and <strong>School code</strong>. You cannot type over them. Your sign-in address is the web address your staff use, so it stays fixed. If any of these is wrong, tell XVS through the headset in the header.</p>
      </GuideSection>

      <GuideSection id="update-your-details" title="Update your details">
        <GuideSteps>
          <GuideStep title="Change what has moved">Under <strong>Yours to confirm</strong>, update <strong>Ownership type</strong>, <strong>Registration number</strong>, <strong>Address</strong>, <strong>Website</strong> or <strong>Motto</strong>.</GuideStep>
          <GuideStep title="Save">Select <strong>Save changes</strong>. Only the fields you changed are sent, and every save is recorded against your school.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Currency and term structure are fixed once you are live">
          Accounts already kept in one currency cannot be read again in another, and a term structure already carrying fees cannot be re-cut. Once your school is live, both fields read <strong>Fixed once the school is live</strong>. Select <strong>Contact XVS</strong> under the field if one of them has to change.
        </GuideCallout>
        <p>All times in XVS are shown in West Africa Time (WAT). It is not a setting you can change.</p>
      </GuideSection>

      <GuideSection id="change-your-logo" title="Change your logo">
        <p>Your logo appears in the sidebar and on the browser tab. In the <strong>Logo</strong> panel, select <strong>Replace logo</strong> (or <strong>Upload a logo</strong> if there is none) and pick a PNG, JPG or WEBP image up to 2MB. A square PNG on a transparent background reads best. <strong>Remove</strong> takes the logo away.</p>
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
        <GuideCallout tone="tip" title="You are done when">Your address, website and motto are current, the logo is the one you want, and anything only XVS can change has been raised with them.</GuideCallout>
      </GuideSection>
    </div>
  );
}
