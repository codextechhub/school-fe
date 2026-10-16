/**
 * A money amount a person types in naira, checked and turned into kobo.
 *
 * Whole naira only, because the school's money settings are stored in whole
 * naira; commas are allowed, as a bursar types them. Returns the kobo to send,
 * or the sentence to show beside the box.
 */
export function readWholeNaira(typed: string): { kobo: number | null; problem: string } {
  const text = typed.replace(/,/g, "").trim();
  if (!text) return { kobo: null, problem: "Enter an amount in naira, such as 1,000." };
  const naira = Number(text);
  if (!Number.isInteger(naira) || naira < 0) {
    return { kobo: null, problem: "Enter a whole number of naira, such as 1,000." };
  }
  if (naira > 1_000_000) {
    return { kobo: null, problem: "The smallest part payment cannot be above ₦1,000,000." };
  }
  return { kobo: naira * 100, problem: "" };
}
