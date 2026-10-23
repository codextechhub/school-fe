/**
 * How a register names somebody's approved leave.
 *
 * The leave type and its end date are separate Field Access fields, so either
 * may be missing from what the server sends. Each helper then says only what is
 * known: "On leave" with neither, never a blank type or an invented date.
 */

type FormatDay = (iso: string) => string;

/** The clause naming a class teacher's leave on a register taken on their behalf, or "". */
export function onLeaveClause(
  onLeave: { leave_type_label?: string; ends_on?: string } | null | undefined,
  formatDay: FormatDay,
): string {
  if (!onLeave) return "";
  const kind = onLeave.leave_type_label ? `${onLeave.leave_type_label.toLowerCase()} leave` : "leave";
  const until = onLeave.ends_on ? ` until ${formatDay(onLeave.ends_on)}` : "";
  return `, who is on ${kind}${until}`;
}

/** The link text beside an "On leave" badge on the staff register. */
export function leaveLinkText(
  leave: { type_label?: string; end_date?: string },
  formatDay: FormatDay,
): string {
  if (!leave.type_label && !leave.end_date) return "View leave";
  const kind = leave.type_label ? `${leave.type_label} leave` : "Leave";
  return leave.end_date ? `${kind} to ${formatDay(leave.end_date)}` : kind;
}
