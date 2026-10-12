import type { SubmitPreview } from "@/redux/services/attendance/attendance-types";

/**
 * What submitting a register will do about guardian notices, in the three
 * places it is said: the line on the submit bar, the confirmation, and the
 * toast once it is done.
 *
 * All three read the server's own preview (`submit_preview`), which counts the
 * absent children whose primary guardian will be emailed and those with no
 * address, leaving out anyone another register already told today. Saying it
 * before the button is pressed matters because the email cannot be taken back.
 */
function students(count: number) {
  return `${count} absent student${count === 1 ? "" : "s"}`;
}

/** The line under the submit bar's headline. */
export function submitBarNote(preview: SubmitPreview | null | undefined): string {
  if (!preview) return "";
  if (!preview.notices_on) return "Guardian notices are off for this school.";
  if (preview.will_email === 0) {
    return preview.no_email > 0
      ? "No absent student has a guardian email on file, so nothing will be sent."
      : "Nobody is marked absent, so nothing will be sent.";
  }
  const n = preview.no_email;
  const missing = n > 0 ? ` ${n} more ${n === 1 ? "has" : "have"} no email on file.` : "";
  return `Guardians of ${students(preview.will_email)} will be emailed.${missing}`;
}

/** The confirmation's description. */
export function submitConfirmText(preview: SubmitPreview | null | undefined): string {
  if (!preview) return "Submit this register?";
  if (!preview.notices_on) return "Guardian notices are off for this school, so submitting sends nothing.";
  if (preview.will_email === 0) {
    return preview.no_email > 0
      ? "Nothing will be sent: no absent student has a guardian email on file."
      : "Nobody is marked absent, so no guardian will be emailed.";
  }
  return `Guardians of ${students(preview.will_email)} will be emailed as soon as you submit. This cannot be taken back.`;
}

/** The toast once the register is in. */
export function submittedText(preview: SubmitPreview | null | undefined): string {
  if (!preview) return "";
  if (!preview.notices_on) return "Guardian notices are off for this school.";
  if (preview.will_email === 0) {
    return preview.no_email > 0
      ? "No guardian could be emailed: no email on file."
      : "Nobody was absent, so nothing was sent.";
  }
  const sent = `${preview.will_email} guardian${preview.will_email === 1 ? "" : "s"} emailed`;
  return preview.no_email > 0 ? `${sent}, ${preview.no_email} with no email on file.` : `${sent}.`;
}
