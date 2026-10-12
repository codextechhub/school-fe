import { GuideSection } from "../../article-components";
import { useGuideWords } from "../../guide-words";

export default function StudentRecordArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Open the student from <strong>Students</strong>, then the <strong>Attendance</strong> tab. It shows one {w.term} at a time, the current one first; choose another {w.term} from the buttons under the heading.</p>
      </GuideSection>

      <GuideSection id="the-term" title={`The ${w.term} at a glance`}>
        <p>The heading gives the {w.term}&apos;s rate and how many days no register was taken. The figures count the days present (late included), absent, excused and not taken, and the days the school was open to this student. A day with no register is never counted as an absence.</p>
        <p>The primary guardian is shown with their email, or &quot;no email on file&quot; when absence notices cannot reach them.</p>
      </GuideSection>

      <GuideSection id="day-by-day" title="Day by day">
        <p>Each month is a calendar. A coloured day shows the mark; a grey day is one no register was taken; a faint day was closed or the student was not yet on the roll. Every day is judged against the class the student was in that day, so a student who moved class mid-{w.term} shows each half against its own class. Select a day to open that day&apos;s register.</p>
      </GuideSection>

      <GuideSection id="absences" title="Absences and changes">
        <p><strong>Absences and their reasons</strong> lists each absent or excused day, newest first, with what the guardian was told. Where the school marks lessons, lessons missed are listed apart and never counted as absences.</p>
        <p><strong>Every mark that changed</strong> lists each change made on the day and each correction decided later, with who made it and any note. Nothing there is ever deleted.</p>
      </GuideSection>
    </div>
  );
}
