import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function TeachingDutiesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A teaching duty says who teaches a subject to a class this year. Open <strong>Teaching duties</strong> under Staff in the sidebar. Its badge counts class subjects with no teacher and those with no main teacher. The screen covers the running school year, so it opens once the school is live.</p>
        <GuideChecklist items={[
          "Your role lets you view staff. Changing duties and class teachers also needs the teaching assignment permission.",
          "This year's classes and the subjects each one takes exist in Academic Structure.",
          "The teachers are on the staff list.",
        ]} />
      </GuideSection>

      <GuideSection id="read-coverage" title="Read the coverage">
        <p>The cards count <strong>Class subjects</strong> expected this year, those <strong>Fully covered</strong>, those with <strong>No teacher</strong>, and those with <strong>No main teacher</strong>.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">No teacher</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Nobody teaches that subject to that class.</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-black-01">No main teacher</p>
            <p className="mt-1 text-xs leading-5 text-gray-01">Someone teaches it, but nobody is set to enter its results.</p>
          </div>
        </div>
        <p>Under <strong>Subject coverage</strong>, choose <strong>By class</strong> to see every class subject, and tick <strong>Only gaps</strong> to list just the ones that need attention.</p>
      </GuideSection>

      <GuideSection id="staff-a-subject" title="Staff a class subject">
        <GuideSteps>
          <GuideStep title="Open the subject">Select a subject in the coverage grid. The drawer lists who is <strong>Teaching it now</strong>, each marked <strong>Main teacher</strong> or <strong>Assisting</strong>.</GuideStep>
          <GuideStep title="Add a teacher">Under <strong>Add a teacher</strong>, search in <strong>Teacher</strong>, choose <strong>Their part</strong>, and select <strong>Add them</strong>.</GuideStep>
          <GuideStep title="Change a part">Use <strong>Make main</strong> to make an assisting teacher the main teacher, or <strong>Move to assisting</strong> for the reverse. Use the remove button on a row to take somebody off the subject.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="One main teacher per class subject">The main teacher enters that subject&apos;s results for that class. Any number of people can assist. To give the main part to somebody else, move the current main teacher to assisting first.</GuideCallout>
      </GuideSection>

      <GuideSection id="by-teacher" title="Change what one teacher carries">
        <GuideSteps>
          <GuideStep title="Switch view">Choose <strong>By teacher</strong> and select a teacher.</GuideStep>
          <GuideStep title="Read their duties">The <strong>Teaching duties</strong> drawer lists every class subject they carry this year and their part in each.</GuideStep>
          <GuideStep title="Add or change">Pick a <strong>Class</strong>, a <strong>Subject</strong> and <strong>Their part</strong>, then select <strong>Add duty</strong>. Change a part or remove a duty from its row.</GuideStep>
        </GuideSteps>
        <p>Assignment counts are shown without a target, because the school records no maximum teaching load.</p>
      </GuideSection>

      <GuideSection id="class-teachers" title="Set class teachers">
        <p>Choose <strong>Class teachers</strong>. Each class shows its class teacher, or <strong>No class teacher yet</strong>. Select <strong>Set</strong> or <strong>Change</strong>, pick the <strong>Class teacher</strong>, and select <strong>Save</strong>. To leave a class without one, choose <strong>Nobody</strong> and select <strong>Leave it with nobody</strong>.</p>
        <p>The class teacher looks after the class, its register and its day. Teaching a subject to that class is a separate duty.</p>
      </GuideSection>

      <GuideSection id="timetable-clashes" title="Timetable clashes">
        <p>Choose <strong>Timetable clashes</strong> to see teachers the timetable has put in two places at once. A clash is found when a lesson is placed on the timetable, not when a subject is assigned. Select <strong>Open the timetable</strong> to resolve it. Reading clashes needs a timetable permission.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "The page says there is no year to show", body: "Teaching duties belong to a running school year. They open when the school goes live and a year is running." },
          { title: "No classes and subjects yet", body: "The year's classes and their subjects are built in Academic Structure. Add them there first." },
          { title: "Set or Change is missing", body: "Setting class teachers needs the teaching assignment permission." },
          { title: "A change was refused", body: "Your role can read duties but not change them, or the teacher already has that part. The message explains which." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">With Only gaps ticked, the page says every subject has a teacher and each one has a main teacher, and every class has a class teacher.</GuideCallout>
      </GuideSection>
    </div>
  );
}
