import type {
  StaffLeaveBalance,
  StaffLeavePreview,
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

/** "1 day" or "5 days". */
export function dayCount(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** One person's standing on one leave type in one session. */
export interface LeaveStanding {
  allowance: number | null;
  taken: number;
  pending: number;
  remaining: number | null;
}

/**
 * The standing the balance box shows.
 *
 * The preview counts a pending request being edited out of its own standing, so
 * it wins whenever it carries all four figures (`taken` and `pending` as
 * numbers, since the server sends null for them when no session covers the
 * dates); otherwise (no preview yet, or Field Access removed one of its
 * figures) the Leave tab's balance row stands.
 */
export function leaveStanding(
  row: StaffLeaveBalance | undefined,
  preview: StaffLeavePreview | undefined,
): LeaveStanding | undefined {
  if (
    preview &&
    typeof preview.taken === "number" &&
    typeof preview.pending === "number" &&
    preview.allowance !== undefined &&
    preview.remaining !== undefined
  ) {
    const { allowance, taken, pending, remaining } = preview;
    return { allowance, taken, pending, remaining };
  }
  if (!row) return undefined;
  const { allowance, taken, pending, remaining } = row;
  return { allowance, taken, pending, remaining };
}

/** Whether the type has a limit to measure against. */
export function isLimited(standing: LeaveStanding): standing is LeaveStanding & { allowance: number; remaining: number } {
  return standing.allowance != null && standing.remaining != null;
}

/** What a type with no allowance shows beside "No limit": days taken, and pending ones when there are any. */
export function noLimitNote(standing: LeaveStanding, sessionName: string): string {
  const pending = standing.pending > 0 ? `, ${standing.pending} pending` : "";
  return `${dayCount(standing.taken)} taken in ${sessionName}${pending}.`;
}

/** Said plainly when the person is already past the allowance, or "" when they are not. */
export function pastAllowanceNote(standing: LeaveStanding): string {
  if (!isLimited(standing) || standing.remaining >= 0) return "";
  return `Already ${dayCount(-standing.remaining)} past the ${standing.allowance}-day allowance, counting pending requests.`;
}

/**
 * Where this request would leave the person, or null when the preview cannot say.
 *
 * A negative figure reads as days over and not as a minus sign. It is a fact
 * for the approver's attention and never a reason to stop the filing.
 */
export function leftAfterRequest(
  preview: Pick<StaffLeavePreview, "remaining_after" | "over_allowance_by">,
): { over: boolean; text: string } | null {
  const after = preview.remaining_after;
  if (typeof after === "number") {
    return after < 0
      ? { over: true, text: `${dayCount(-after)} over the allowance` }
      : { over: false, text: dayCount(after) };
  }
  if (after === undefined && (preview.over_allowance_by ?? 0) > 0) {
    return { over: true, text: `${dayCount(preview.over_allowance_by ?? 0)} over the allowance` };
  }
  return null;
}

/** The return line, from a date already written in the school's style. */
export function backOn(dateText: string): string {
  return `Back on ${dateText}`;
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
