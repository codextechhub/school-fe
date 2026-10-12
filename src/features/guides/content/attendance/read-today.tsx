import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ReadTodayArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open <strong>Attendance</strong> in the sidebar, under Academics. What you see depends on your role: somebody who takes any class&apos;s register or decides corrections sees every class in their branches, and a teacher sees their own registers.</p>
        <GuideChecklist items={[
          "Your school has gone live. Attendance opens at go-live, because before it nobody is placed in a class.",
          "Classes have students placed in them, and each class has a class teacher.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-day" title="Read the day">
        <p>The figures across the top count the registers submitted so far. <strong>In school today</strong> is everyone present or late, out of everyone marked. A class whose register is not in yet is left out of that figure, not counted as absent, so the rate is never lower because a teacher is slow.</p>
        <p><strong>Late</strong> counts as present and is shown on its own as well. <strong>Excused</strong> is an absence with a reason the school accepted.</p>
        <p>At a school with several branches, the tables show each class&apos;s branch, and the branch selector at the foot of the sidebar narrows the whole page to one branch. At a school with one branch the same column shows the class&apos;s level.</p>
      </GuideSection>

      <GuideSection id="chase-a-register" title="Chase a register that is not taken">
        <GuideSteps>
          <GuideStep title="Find the class">Look at <strong>Not yet taken</strong>. Each row is a class with no submitted register for the day, with its class teacher.</GuideStep>
          <GuideStep title="Take it yourself">If you can take any class&apos;s register, <strong>Take register</strong> opens the class&apos;s register so you can take it on the teacher&apos;s behalf. The register then says who took it and for whom.</GuideStep>
          <GuideStep title="Remind the teacher">Select <strong>Remind</strong>. The class teacher gets a reminder in the app and by email, and the row then reads <strong>Reminded</strong>. A class can be reminded once a day, so two administrators working the same list never nag one teacher twice.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Nobody to remind">A class with no class teacher shows &quot;Nobody to remind&quot;. Give the class a teacher in Classes first.</GuideCallout>
      </GuideSection>

      <GuideSection id="absent-and-notices" title="Absences and guardian notices">
        <p><strong>Absent today</strong> lists every child marked Absent or Excused on a submitted register, with the reason and what happened to the guardian notice.</p>
        <GuideSteps>
          <GuideStep title="Emailed">The primary guardian was emailed when the register was submitted. One email per child per day.</GuideStep>
          <GuideStep title="No email on file">Nobody could be told, because the primary guardian has no email address. Add one on the student&apos;s Guardians tab.</GuideStep>
          <GuideStep title="Nothing sent">Excused and Late send nothing to anyone.</GuideStep>
        </GuideSteps>
        <p>Where your school marks lessons, <strong>In school this morning, missed a lesson</strong> lists children marked present in the morning and absent from a lesson. Both marks stand, and neither counts as an absence for the day.</p>
      </GuideSection>

      <GuideSection id="another-day" title="Look at another day">
        <p>Use the date at the top right to open an earlier day. Any day up to today can be chosen; a day that has not come yet has no register. Select <strong>Today</strong> to come back.</p>
        <p>A day the school was closed says so and why, and nothing is reported missing for it.</p>
      </GuideSection>

      <GuideSection id="your-own-registers" title="If you teach">
        <p>A teacher sees <strong>My registers</strong>: the morning register of the class they lead, and each lesson they teach that day where the school marks lessons. Each one says whether it is submitted, and when. Select your class to open its register.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="A class never appears">At a school with several branches a class with no branch cannot take a register. The page names such classes at the top. Give each a branch in Classes.</GuideStep>
          <GuideStep title="A figure or a column is missing">Your role&apos;s field access hides it. Ask your school administrator if you need it.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
