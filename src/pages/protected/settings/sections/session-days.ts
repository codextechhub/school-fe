/**
 * The student app's sign-in length as typed: a whole number of days, 1 to 90.
 * Returns the days to send, or the sentence to show beside the box.
 */
export function readSessionDays(typed: string): { days: number | null; problem: string } {
  const text = typed.trim();
  const days = Number(text);
  if (!text || !Number.isInteger(days) || days < 1 || days > 90) {
    return { days: null, problem: "Enter a whole number of days, from 1 to 90." };
  }
  return { days, problem: "" };
}
