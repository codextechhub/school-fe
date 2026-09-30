import type {
  StaffLeaveBalance,
  StaffLeaveWarning,
  StaffLeaveRequest,
  StaffLeaveWrite,
  StaffRules,
} from "@/redux/services/staff/staff-types";

const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** A correction sends only changed fields so saved days keep their original count when dates stay put. */
export function leaveChanges(request: StaffLeaveRequest, next: StaffLeaveWrite): Partial<StaffLeaveWrite> {
  return {
    ...(next.leave_type !== request.leave_type && { leave_type: next.leave_type }),
    ...(next.start_date !== request.start_date && { start_date: next.start_date }),
    ...(next.end_date !== request.end_date && { end_date: next.end_date }),
    ...(next.note !== request.note && { note: next.note }),
  };
}

/**
 * How the school counts a request's days, in one sentence.
 *
 * The server counts the school's working weekdays in the range, less the days
 * its calendar closes the school. Without the rules the sentence stays true
 * without naming the days.
 */
export function countingNote(leave: StaffRules["leave"] | undefined): string {
  if (!leave) {
    return "Days are counted on the school's working days only, not every calendar day.";
  }
  const days = [...leave.working_days].sort((a, b) => a - b);
  const weekdays =
    days.join() === "1,2,3,4,5"
      ? "Monday to Friday"
      : days.map((day) => WEEKDAY[day] ?? String(day)).join(", ");
  return leave.exclude_closures
    ? `Days are counted ${weekdays}, leaving out days the school is closed on its calendar.`
    : `Days are counted ${weekdays}, including days the school is closed.`;
}

/** Where this person stands on one leave type this session, or "" when there is nothing to say. */
export function balanceHint(row: StaffLeaveBalance | undefined, sessionName: string): string {
  if (!row) return "";
  if (row.allowance == null || row.remaining == null) {
    return `No limit on ${row.label.toLowerCase()} leave. ${row.taken} ${row.taken === 1 ? "day" : "days"} taken in ${sessionName}.`;
  }
  if (row.remaining < 0) {
    return `Already ${-row.remaining} ${row.remaining === -1 ? "day" : "days"} past the ${row.allowance}-day allowance for ${sessionName}, counting pending requests.`;
  }
  return `${row.remaining} of ${row.allowance} ${row.allowance === 1 ? "day" : "days"} left in ${sessionName}, counting pending requests.`;
}

/**
 * The over-allowance warning in the reader's own terms.
 *
 * The server's sentence is written for an approver; the person filing wants to
 * know it went past the allowance, by how much, and that it was filed anyway.
 */
export function overAllowanceMessage(
  warning: Extract<StaffLeaveWarning, { code: "OVER_ALLOWANCE" }>,
  { isSelf, personName, typeLabel }: { isSelf: boolean; personName: string; typeLabel: string },
): string {
  const days = `${warning.over_allowance_by} ${warning.over_allowance_by === 1 ? "day" : "days"}`;
  const kind = typeLabel ? `${typeLabel.toLowerCase()} leave allowance` : "leave allowance";
  return isSelf
    ? `This takes you ${days} past your ${kind}. It still goes to the approver, who decides.`
    : `This takes ${personName} ${days} past the ${kind}. It still goes to the approver, who decides.`;
}
