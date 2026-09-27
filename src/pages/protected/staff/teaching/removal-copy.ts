import type { TeachingPart } from "@/redux/services/staff/staff-types";

/**
 * The confirmation shown before a teacher is taken off a class subject.
 *
 * Shared by both drawers that can remove a teaching duty, the class subject's
 * and the teacher's, so the two ask the same question in the same words.
 *
 * The body says what the removal does, as the server does it. A removal is
 * never refused for leaving a gap and nobody is promoted in the leaver's
 * place, so taking off the main teacher leaves the subject with nobody
 * entering its results until another teacher is made main. Taking off
 * somebody assisting changes nothing about results.
 */
export function teachingRemovalCopy({
  name,
  className,
  subjectName,
  part,
}: {
  name: string;
  className: string;
  subjectName: string;
  part: TeachingPart;
}): { title: string; body: string } {
  const again = "You can add them again at any time.";
  return {
    title: `Remove ${name} from ${className} ${subjectName}?`,
    body:
      part === "LEAD"
        ? `They stop teaching it. They are its main teacher, so nobody will enter its results until another teacher is made main. ${again}`
        : `They stop teaching it. Who enters its results does not change. ${again}`,
  };
}
