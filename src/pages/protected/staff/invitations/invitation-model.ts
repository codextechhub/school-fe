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
