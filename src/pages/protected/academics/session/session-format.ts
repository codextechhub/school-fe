import type {
  AcademicSession,
  SessionStatus,
  TermState,
} from "@/redux/services/academics/academics-types";

/**
 * The bits of a session both the list and the detail screen print, spelled once
 * so the two cannot disagree about what "archived" looks like.
 *
 * Plain functions only. The chip that renders them lives in session-chips.tsx,
 * because a module that exports both components and helpers breaks Fast Refresh
 * for everything that imports it.
 */

const STATUS: Record<SessionStatus, { label: string; variant: string }> = {
  ACTIVE: { label: "Active", variant: "active" },
  DRAFT: { label: "Draft", variant: "pending" },
  ARCHIVED: { label: "Archived", variant: "inactive" },
};

export function statusOf(status: SessionStatus | string) {
  return STATUS[status as SessionStatus] ?? { label: status, variant: "inactive" };
}

/**
 * Where a session applies.
 *
 * Naming no branch is a statement, not a gap: the year covers every branch the
 * school has, INCLUDING ones opened after it was written. So the label is
 * "The whole school", never "no branches set". The server sends that sentence
 * in `scope_label`; this is the fallback for a school with one branch, where
 * the field is dropped from the payload entirely.
 */
export function scopeOf(session: AcademicSession): string {
  return session.scope_label ?? "The whole school";
}

/**
 * Term state, from the dates.
 *
 * The list endpoint sends terms without a state - only the overview computes
 * one - so it is derived here from the same rule the server uses: ended is
 * completed, started is ongoing, neither is pending. Both read the same dates,
 * so they cannot disagree.
 */
export function termState(
  term: { start_date: string; end_date: string },
  today = new Date().toISOString().slice(0, 10),
): TermState {
  if (!term.start_date || !term.end_date) return "pending";
  if (term.end_date < today) return "completed";
  if (term.start_date <= today) return "ongoing";
  return "pending";
}

/** Whole teaching weeks represented by one date range. */
export function weeksBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  return Math.max(1, Math.round(days / 7));
}

/** Total teaching weeks across a session's terms. */
export function teachingWeeks(
  terms: { start_date: string; end_date: string }[],
) {
  return terms.reduce(
    (total, term) => total + weeksBetween(term.start_date, term.end_date),
    0,
  );
}

export const TERM_TONE: Record<TermState, string> = {
  completed: "bg-green-01/10 text-green-01-text",
  ongoing: "bg-yellow-01/10 text-yellow-01-text",
  pending: "border border-white-02 text-gray-05",
};

export const TERM_LABEL: Record<TermState, string> = {
  completed: "Completed",
  ongoing: "Ongoing",
  pending: "Not started",
};

/** "2026/2027" already reads as a range; the dates under it need not shout. */
export function rangeOf(start: string, end: string, fmt: (d: string) => string) {
  return `${fmt(start)} - ${fmt(end)}`;
}
