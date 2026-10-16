/**
 * The pass mark as typed, checked: a whole percentage from 1 to 100, or blank
 * for none. Returns the value to send and the sentence to show when it is not
 * one, the same sentence the server refuses with.
 */
export function readPassMark(typed: string): { value: number | null; problem: string } {
  const text = typed.trim();
  if (!text) return { value: null, problem: "" };
  const mark = Number(text);
  if (!Number.isInteger(mark)) {
    return { value: null, problem: "Give the pass mark as a whole percentage, such as 50." };
  }
  if (mark < 1 || mark > 100) {
    return { value: null, problem: "A pass mark is between 1% and 100%." };
  }
  return { value: mark, problem: "" };
}
