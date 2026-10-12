import type { AttendanceMark, NoticeState } from "@/redux/services/attendance/attendance-types";

/**
 * How a mark reads and looks on every attendance screen.
 *
 * One table, because a mark is shown in a register row, a hub table, a
 * correction's "from → to" and a student's day grid, and four hand-written
 * colour choices drift. The tones follow the design: Present green, Late
 * amber, Absent red, Excused blue.
 */
export const MARKS: Record<AttendanceMark, { label: string; badge: "green" | "amber" | "red" | "blue" }> = {
  P: { label: "Present", badge: "green" },
  L: { label: "Late", badge: "amber" },
  A: { label: "Absent", badge: "red" },
  E: { label: "Excused", badge: "blue" },
};

export function markLabel(mark: AttendanceMark | null | undefined): string {
  return mark ? MARKS[mark].label : "Not taken";
}

/**
 * What the guardian-notice column says about one absent or excused child.
 *
 * Excused never sends anything, so its state is always NONE and the sentence
 * says why nothing went. `sentAt` is the time the email left, already in the
 * school's clock.
 */
export function noticeText(
  mark: AttendanceMark | undefined,
  state: NoticeState | undefined,
  sentAt: string | null,
): { text: string; warn: boolean } {
  if (state === "SENT") return { text: sentAt ? `Emailed ${sentAt}` : "Emailed", warn: false };
  if (state === "NO_EMAIL") return { text: "No email on file", warn: true };
  if (state === "NOTICES_OFF") return { text: "Notices off", warn: false };
  if (mark === "E") return { text: "Nothing sent · Excused", warn: false };
  return { text: "Nothing sent", warn: false };
}
