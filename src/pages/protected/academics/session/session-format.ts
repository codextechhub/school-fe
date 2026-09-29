import type {
  AcademicSession,
  SessionStatus,
  TermState,
  TermWrite,
} from "@/redux/services/academics/academics-types";
import { todayIso } from "@/lib/as-at";
import { formatDay, type DisplayPrefs } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import { TERM_WORDS } from "@/lib/school-words";

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
  today = todayIso(),
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

/** The calendar day after an ISO date, still as an ISO date. */
export function dayAfter(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * The rows a new year starts with: one per name in the school's term names,
 * in that order, undated.
 *
 * The names come from the school's academic rules (three terms, two semesters,
 * or whatever it has set), so a school is handed its own shape rather than
 * made to rename and delete its way to it. Only the starting point: the server
 * accepts any number of terms with any names.
 */
export function blankTerms(names: readonly string[]): TermWrite[] {
  return names.map((name, i) => ({
    name,
    order_index: i + 1,
    start_date: "",
    end_date: "",
  }));
}

interface TermDraft {
  name: string;
  start_date: string;
  end_date: string;
}

export interface TermWindow {
  /** The term that has to be given an end date before this one opens. */
  waitingOn: string | null;
  /** The term this one follows, with the day it ends, once that is known. */
  follows: { name: string; end: string } | null;
  startMin?: string;
  endMin?: string;
  max?: string;
}

/** The row's name, or "Term 2" / "Semester 2" for a row not yet named. */
const termLabel = (term: TermDraft, index: number, Term: string) =>
  term.name.trim() || `${Term} ${index + 1}`;

/**
 * The days each term's calendar may offer, in the order the terms are listed.
 *
 * Terms run one after another. A term's dates stay shut until the term before
 * it has an end date, and then open from the day after that end, so the
 * calendar cannot offer a day the server refuses as an overlap. Its end opens
 * from the day after its own start, because the server also refuses a term
 * that ends on the day it starts. Every day stays inside the session.
 *
 * The same rule serves three terms and two semesters: it reads the rows it is
 * given and never assumes a count. `Term` is the school's word, for naming a
 * row that has no name yet.
 */
export function termWindows(
  terms: TermDraft[],
  session: { start: string; end: string },
  Term: string = TERM_WORDS.Term,
): TermWindow[] {
  return terms.map((term, i) => {
    const previous = i > 0 ? terms[i - 1] : null;
    if (previous && !previous.end_date) {
      return { waitingOn: termLabel(previous, i - 1, Term), follows: null };
    }
    const afterPrevious = previous ? dayAfter(previous.end_date) : "";
    const startMin =
      [afterPrevious, session.start].filter(Boolean).sort().pop() || undefined;
    return {
      waitingOn: null,
      follows: previous
        ? { name: termLabel(previous, i - 1, Term), end: previous.end_date }
        : null,
      startMin,
      endMin: term.start_date ? dayAfter(term.start_date) : startMin,
      max: session.end || undefined,
    };
  });
}

/**
 * What is wrong with one term's dates, as the sentence shown under it.
 *
 * Mirrors the server's rules so a refusal is seen before Save. The overlap
 * check still earns its place with the calendar bounded: shortening the term
 * before, after this one is filled in, leaves this one starting too early.
 * `Term` is the school's word, for naming a row that has no name yet.
 */
export function termProblem(
  terms: TermDraft[],
  index: number,
  session: { start: string; end: string },
  Term: string = TERM_WORDS.Term,
): string {
  const term = terms[index];
  const label = termLabel(term, index, Term);
  const previous = index > 0 ? terms[index - 1] : null;
  if (term.start_date && term.end_date && term.end_date <= term.start_date) {
    return `${label} ends on or before it starts.`;
  }
  if (
    session.start &&
    session.end &&
    ((term.start_date && term.start_date < session.start) ||
      (term.end_date && term.end_date > session.end))
  ) {
    return `${label} falls outside the session dates.`;
  }
  if (previous?.end_date && term.start_date && term.start_date <= previous.end_date) {
    return `${label} starts before ${termLabel(previous, index - 1, Term)} ends.`;
  }
  return "";
}

/** "12 Dec 2026" in the school's style, read as a calendar day rather than a UTC instant. */
export function dayLabel(iso: string, prefs: DisplayPrefs = activeDisplayPrefs()): string {
  return formatDay(iso, prefs);
}
