import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const SECTIONS = [
  ["Contact card", "Name, photograph, post and unit, branch, sign-in email and phone number. Always shown to everyone who can open the profile, so it has a padlock instead of a tick box."],
  ["Employment", "Staff ID, job title, employment type and status, hire and exit dates, and length of service."],
  ["Personal details", "Middle name, date of birth and gender."],
  ["Qualifications and documents", "The qualifications, certificates and documents the school holds on them."],
  ["Leave", "Their leave requests and the days they have taken."],
  ["Teaching duties", "The classes and subjects they teach."],
  ["History", "Their employment and account timeline."],
  ["Roles and access", "The roles they hold and the branches those roles reach."],
] as const;

const AUDIENCES = [
  ["Themselves", "The member of staff reading their own profile."],
  ["Line managers", "Anyone above them on the organogram, at any level, including through an acting post or a dotted line."],
  ["Colleagues", "Any other member of staff at the school, at any branch."],
  ["Administrators", "People whose role reaches staff records at the branch the person works in. This column reads As their role allows and cannot be changed here."],
] as const;

const DEFAULTS = [
  ["Themselves", "Everything: contact card, employment, personal details, qualifications and documents, leave, teaching duties, history, and roles and access."],
  ["Line managers", "Contact card, Employment, Leave and Teaching duties."],
  ["Colleagues", "Contact card only."],
] as const;

const PROBLEMS = [
  ["The tick boxes are greyed out and there is no Save", "Your role can read these rules but cannot change field access. The screen says so at the bottom. Ask somebody who manages field access."],
  ["Use the defaults is missing", "Your school has not saved rules of its own yet, so it is already on the defaults. The panel says so under Who sees what."],
  ["A section is ticked but a colleague still cannot see a field", "Field access still applies. A field a role has switched off stays hidden whatever the grid says, for everybody except the person themselves."],
  ["A ticked section stays closed", "Your school's plan does not include that part of XVS, such as leave. A tick never opens a part the school has not bought."],
  ["A line manager sees too little", "Check the organogram. Line managers means people above the person on the chart. Somebody who manages them day to day but is not above them on the chart counts as a colleague."],
  ["A leaver's profile does not open for colleagues", "Colleagues covers people who work here now. The profile of somebody who has left, or who has not accepted their invitation, opens only for people whose role reaches staff records."],
] as const;

export default function SettingsStaffProfilesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Everyone at your school can open a colleague&apos;s profile from the organogram. <strong>Staff profiles</strong> in <strong>Settings</strong> decides how much of that profile each person sees, depending on how they stand to the person they opened.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to change field access as well.",
          "You know which parts of a profile your school wants line managers and colleagues to read.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-grid" title="Read the grid">
        <p>The panel <strong>Who sees what</strong> is a grid. Each row is a section of a staff profile:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SECTIONS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p>Each column is who is looking:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AUDIENCES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p>A tick in a box means that relationship sees that section. The line under the panel title says whether you are looking at <strong>Your school&apos;s own rules.</strong> or <strong>The defaults, until your school saves its own.</strong></p>
      </GuideSection>

      <GuideSection id="what-a-tick-does" title="What a tick does">
        <p>A tick gives the section by relationship, even where the reader&apos;s role holds no key for it, and never beyond that relationship. With <strong>Leave</strong> ticked for <strong>Line managers</strong>, a teacher who heads the sciences department at the Ikeja Branch reads the leave of the three teachers under her on the chart, and nobody else&apos;s.</p>
        <p>A reader who stands in more than one relationship sees everything any of them allows. A line manager is also a colleague, so a section ticked for colleagues is never hidden from a line manager.</p>
        <p>The relationship crosses branches inside your school. A teacher at the Lekki Branch who opens a colleague at the Ikeja Branch gets the contact card, and whatever else colleagues are given.</p>
        <GuideCallout tone="info" title="Field access still has the last word on fields">A tick opens a section, but a field a role has switched off in field access stays hidden inside it. The one exception is the person reading their own profile.</GuideCallout>
      </GuideSection>

      <GuideSection id="change-the-rules" title="Change the rules">
        <GuideSteps>
          <GuideStep title="Tick or untick">Tick a box to show that section to that relationship, or clear it to hide it. The contact card row cannot be changed, and neither can the <strong>Administrators</strong> column.</GuideStep>
          <GuideStep title="Save">Select <strong>Save</strong> at the top right. XVS confirms with <strong>Staff profiles now follow the new rules.</strong> and every profile opened from then on follows them.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Unticking a section for Themselves takes it off their own profile">A member of staff whose role holds no key for a section reads it on their own profile only because it is ticked for <strong>Themselves</strong>. Untick <strong>Leave</strong> there and a teacher loses the Leave tab on their own profile, which is where they apply for leave.</GuideCallout>
      </GuideSection>

      <GuideSection id="use-the-defaults" title="Go back to the defaults">
        <p>Until your school saves its own rules, XVS uses these:</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEFAULTS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
        <p>Once your school has saved rules of its own, <strong>Use the defaults</strong> appears beside <strong>Save</strong>. It fills the grid with the defaults; select <strong>Save</strong> to keep them.</p>
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
        <GuideCallout tone="tip" title="You are done when">Each relationship has the sections your school intends ticked, the panel reads <strong>Your school&apos;s own rules.</strong>, and a colleague opening a profile from the organogram sees what you expect.</GuideCallout>
      </GuideSection>
    </div>
  );
}
