import { todayIso } from "@/lib/as-at";

/**
 * Whether a birth date is one a pupil could have, and the sentence if not.
 *
 * Outside the school's age range is a mistyped year, not a pupil: 1998 for
 * 2008 puts a 28-year-old on a school roll. The bounds are the school's own
 * enrolment rules (2 and 25 until it sets others), the same ones the server
 * refuses on, so the enrolment form and the edit drawer say what the server
 * would. Age is counted in calendar years, as the server counts it.
 */
export function dobProblem(value: string, minAge = 2, maxAge = 25): string {
  if (!value) return "A date of birth is required.";
  const today = todayIso();
  if (value > today) return "That date is in the future.";
  const years = Number(today.slice(0, 4)) - Number(value.slice(0, 4));
  if (years < minAge) return `That would make the student under ${minAge} years old. Check the year.`;
  if (years > maxAge) return `That would make the student over ${maxAge}. Check the year.`;
  return "";
}
