import { GuideCallout, GuideChecklist, GuideSection } from "../../article-components";

const CHOICES = {
  suspended: [
    ["Hold them where they are", "The default. A suspended student stays in last year's class and is listed for someone to move by hand."],
    ["Move them up, still suspended", "They go up with their year group and keep a Suspended tag. Lifting the suspension later needs no move."],
  ],
  notAttending: [
    ["Hold them where they are", "The default. A student confirmed and placed but not yet marked as attending waits for a person to decide."],
    ["Move them up too", "They go up with the class they were placed in and are marked as attending, as when a class is given by hand."],
  ],
  arms: [
    ["Keep each arm", "The default. JSS1 B moves into JSS2 B. Where next year has no class with that arm, the class is shared across the next level's classes instead, and the promotion screen says so."],
    ["Spread across the arms", "A year group is shared out evenly across the next level's classes, emptiest first. Move anyone who belongs elsewhere afterwards."],
  ],
  capacity: [
    ["Same as enrolment", "The default. A full class does at promotion whatever it does when a child is enrolled."],
    ["Warn, then allow", "The run names the full classes, and the person running it can go ahead anyway."],
    ["Never over capacity", "A run that would overfill any class is refused until a class is added or students are moved."],
    ["Don't check", "The run never checks capacity."],
  ],
} as const;

const PROBLEMS = [
  ["Promotion is not in Settings", "It opens for a role that can view school settings, and only when your school's plan includes the students module."],
  ["The choices are greyed out and there is no Save", "Your role reads these rules without changing them, or you work in one branch. The rules are the whole school's, and the screen says why at the bottom."],
  ["Suspended students were left behind", "Your school holds them where they are. Move each one with Classes & Transfers, or choose Move them up, still suspended before the next run."],
  ["A child landed in the wrong arm", "Your school spreads year groups across the arms, or next year has no class with their arm, so their class was shared out. Move them with Classes & Transfers after the run."],
] as const;

function Cards({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(([title, body]) => (
        <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-black-01">{title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPromotionArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p><strong>Promotion</strong> in <strong>Settings</strong> decides who moves up at the end of the year, which class they land in, and what a full class does during the run. The rules are the whole school&apos;s: somebody who works in one branch reads them without changing them.</p>
        <GuideChecklist items={[
          "Your role can view school settings. Saving a change needs the key to update them as well.",
          "Your school's plan includes the students module.",
          "You have agreed the rules before the year's promotion is run.",
        ]} />
      </GuideSection>

      <GuideSection id="suspended-students" title="Suspended students">
        <p>For a student who is suspended when the year ends, choose:</p>
        <Cards items={CHOICES.suspended} />
      </GuideSection>

      <GuideSection id="not-yet-attending" title="Students not yet attending">
        <p>For a student who is confirmed and placed in a class but not yet marked as attending, choose:</p>
        <Cards items={CHOICES.notAttending} />
      </GuideSection>

      <GuideSection id="arms" title="Arms">
        <p>Choose which class a promoted student lands in at the next level:</p>
        <Cards items={CHOICES.arms} />
        <p>With <strong>Spread across the arms</strong>, the promotion screen shows each class&apos;s destination as, for example, <strong>Spread: JSS2 A, JSS2 B, JSS2 C</strong>.</p>
        <p>With <strong>Keep each arm</strong>, a class whose arm has no match next year carries a note on the promotion screen, for example <strong>No class at the next level has JSS1 A&apos;s arm, so these students are shared across JSS2 B, JSS2 C.</strong> Add the missing arm to next year before the run if the class should stay together.</p>
      </GuideSection>

      <GuideSection id="full-classes" title="Full classes during promotion">
        <p>Promotion has its own capacity rule, so a school can refuse full classes for new admissions and still let a year group move up together. The panel says what enrolment is set to. Choose:</p>
        <Cards items={CHOICES.capacity} />
      </GuideSection>

      <GuideSection id="save-the-rules" title="Save the rules">
        <p>Select <strong>Save promotion rules</strong>. XVS confirms with <strong>Promotion rules saved.</strong> and the next promotion run follows them.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <Cards items={PROBLEMS} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Suspended students, students not yet attending, arms and full classes each have the choice your school agreed, and the promotion screen shows the destinations you expect.</GuideCallout>
      </GuideSection>
    </div>
  );
}
