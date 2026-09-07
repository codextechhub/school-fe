import type { EmploymentStatus } from "@/redux/services/staff/staff-types";

import { formatDate } from "../students/format";

/**
 * Why a row reads On Leave, and until when.
 *
 * Its own module rather than sitting beside the badge it feeds: a file that
 * exports components must export only components, or fast refresh stops
 * working for every component in it.
 *
 * Undefined for everybody who is not currently away, and undefined too for
 * anybody reading On Leave with no end date behind them - a note that guessed a
 * date would be worse than none, and the badge is correct without it.
 */
export function leaveNote(person: {
  display_employment_status: EmploymentStatus;
  on_leave_until: string | null;
}): string | undefined {
  if (person.display_employment_status !== "ON_LEAVE") return undefined;
  if (!person.on_leave_until) return undefined;
  return (
    `Approved leave to ${formatDate(person.on_leave_until)}. ` +
    "Nobody set this status: it follows the leave, and clears itself the day " +
    "after."
  );
}
