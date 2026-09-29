import { canManageRow } from "@/lib/can-manage";
import { P, type PermissionCode } from "@/permissions";
import type { StaffListRow } from "@/redux/services/staff/staff-types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The invitation age displayed by the list and its detail drawer.
 *
 * Invitations are discussed in calendar days, not elapsed 24-hour periods. A
 * link sent late on 6 September reads as 9 days old throughout 15 September,
 * which agrees with the date printed beside it. Invalid and future dates do
 * not become alarming negative ages.
 */
export function invitationAgeDays(
  invitedAt: string | null | undefined,
  today = new Date(),
): number | null {
  if (!invitedAt) return null;

  const [year, month, day] = invitedAt.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  const sentDay = Date.UTC(year, month - 1, day);
  const parsed = new Date(sentDay);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  const currentDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(0, Math.floor((currentDay - sentDay) / DAY_MS));
}

export function waitingLabel(days: number | null): string {
  if (days == null) return "Age unavailable";
  if (days === 0) return "Sent today";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Summary values for the invitation records loaded on the current page. */
export function invitationPageMetrics(
  rows: StaffListRow[],
  today = new Date(),
): { followUp: number; oldestDays: number | null } {
  const ages = rows
    .map((row) => invitationAgeDays(row.invited_at, today))
    .filter((age): age is number => age != null);

  return {
    followUp: ages.filter((age) => age >= 7).length,
    oldestDays: ages.length ? Math.max(...ages) : null,
  };
}

/**
 * Which of the two invitation writes this reader may offer on one row.
 *
 * Each follows the key its endpoint enforces, not the key that opens the list:
 * resending is the same act as inviting and needs `school.teachers.create`,
 * and withdrawing ends an employment and needs `school.teachers.transition`.
 * Both also need the row to be one the reader may change, since the server
 * refuses a branch administrator's write to somebody posted school-wide.
 * Whether the link is still unused (`can_resend`) is a separate question: a
 * reader who may resend sees the button disabled on a used link.
 */
export function invitationActions(
  person: StaffListRow,
  hasPermission: (code: PermissionCode) => boolean,
): { resend: boolean; withdraw: boolean } {
  const manageable = canManageRow(person);
  return {
    resend: manageable && hasPermission(P.INVITE_TEACHER),
    withdraw: manageable && hasPermission(P.TRANSITION_TEACHER),
  };
}

/**
 * What kind of unaccepted person a row is, which decides every control on it.
 *
 * - `invitation`: sent, waiting for the person to open the link. Resend and
 *   withdraw as usual.
 * - `hire`: a hire the school approves first (`PENDING_APPROVAL`). Nothing
 *   has been sent and the school's approvers are the ones being waited on, so
 *   there is no resend, and withdrawing calls the hire off.
 * - `held`: imported while the school was being set up (`AWAITING_GO_LIVE`).
 *   Nothing has been sent; every such invitation goes out when the school goes
 *   live. The server refuses a resend until then, and afterwards a resend
 *   sends one the go-live release left behind. `can_resend` is false for
 *   these throughout, because their account never reached the invited state.
 */
export type InvitationKind = "invitation" | "hire" | "held";

export function invitationKind(person: Pick<StaffListRow, "employment_status">): InvitationKind {
  if (person.employment_status === "PENDING_APPROVAL") return "hire";
  if (person.employment_status === "AWAITING_GO_LIVE") return "held";
  return "invitation";
}

/**
 * Whether this row's send control can be pressed, once the reader may resend.
 *
 * A held invitation can be sent only after the school is live; an ordinary one
 * only while its link is unused; a hire awaiting approval never.
 */
export function sendable(person: StaffListRow, schoolLive: boolean): boolean {
  const kind = invitationKind(person);
  if (kind === "held") return schoolLive;
  if (kind === "hire") return false;
  return person.can_resend;
}
