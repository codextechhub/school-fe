import { routesPath } from "@/routes/routesPath";
import type { AlertCode, CalendarAlert } from "@/redux/services/calendar/calendar-types";
import type { OnboardingState } from "@/redux/services/onboarding/onboarding-types";
import type { StudentSummary } from "@/redux/services/students/students-types";
import type { StaffCounts } from "@/redux/services/staff/staff-types";

const R = routesPath.PROTECTED;

/**
 * What the school has to do something about.
 *
 * The console's overview opens with a worklist rather than with numbers, and
 * this is the school's version of it. The difference is where the items come
 * from: the console has a task table and an approvals queue, and a school has
 * neither. What a school has is a set of conditions the server already
 * detects and already writes sentences about across the operational screens.
 *
 * **Nothing here is computed from raw data.** Every sentence is the server's
 * own, rendered verbatim, for the reason the calendar module records: the
 * server knows which class has no timetable and which term overlaps which, and
 * a second implementation on the client is a second answer that will disagree
 * with the first one the day a rule changes.
 *
 * **Ordered by what it costs to be wrong, not by where it came from.** A school
 * that cannot go live is stuck; a timetable with a clash means two classes
 * expecting the same teacher on Monday; a class with no timetable at all means
 * nobody knows where to be. An event dated outside every term is untidy. They
 * are not the same size and the list must not present them as though they were.
 */

export type AttentionTone = "blocking" | "warning" | "info";

export interface AttentionItem {
  id: string;
  tone: AttentionTone;
  /** A short label for the KIND of condition. Ours, because a heading is not
   *  a finding: the server writes findings, and one of its sentences used as a
   *  title would wrap to three lines in a card. */
  title: string;
  /** Rendered as written. Never assembled from parts here. */
  detail: string;
  /** The size of it, shown as the card's figure. Absent where there is no
   *  count that means anything - a branch with no year is one branch, and "1"
   *  next to it is furniture. */
  stat?: number;
  /** Where to go and do something about it. */
  to: string;
  action: string;
  /** True for the half a school has to fix; false for the half it should know
   *  about. Drives the two groups the panel reads in. */
  mine: boolean;
}

/**
 * Rank per alert code, lower first.
 *
 * Written as a table rather than as an ordering function so that the judgement
 * is one readable list. A code this build has not heard of sorts last rather
 * than crashing: the server owns the list, and a school seeing a new warning at
 * the bottom is better than a screen that will not render.
 */
const ALERT_RANK: Record<AlertCode, number> = {
  SESSION_HAS_NO_TERMS: 1,
  TERM_DATES_OVERLAP: 2,
  TERM_OUTSIDE_SESSION: 3,
  TIMETABLE_HAS_CLASHES: 4,
  CLASS_HAS_NO_TIMETABLE: 5,
  EVENT_OUTSIDE_ANY_TERM: 6,
};

const ALERT_TONE: Record<AlertCode, AttentionTone> = {
  SESSION_HAS_NO_TERMS: "blocking",
  TERM_DATES_OVERLAP: "warning",
  TERM_OUTSIDE_SESSION: "warning",
  TIMETABLE_HAS_CLASHES: "warning",
  CLASS_HAS_NO_TIMETABLE: "warning",
  EVENT_OUTSIDE_ANY_TERM: "info",
};

const ALERT_TARGET: Record<
  AlertCode,
  { to: string; action: string; title: string }
> = {
  SESSION_HAS_NO_TERMS: {
    to: R.ACADEMIC_STRUCTURE.SESSIONS,
    action: "Add terms",
    title: "The year has no terms",
  },
  TERM_DATES_OVERLAP: {
    to: R.ACADEMIC_STRUCTURE.SESSIONS,
    action: "Fix the dates",
    title: "Terms overlap",
  },
  TERM_OUTSIDE_SESSION: {
    to: R.ACADEMIC_STRUCTURE.SESSIONS,
    action: "Fix the dates",
    title: "A term falls outside the year",
  },
  TIMETABLE_HAS_CLASHES: {
    to: R.TIMETABLES.CLASSES,
    action: "Open the grid",
    title: "Timetable clashes",
  },
  CLASS_HAS_NO_TIMETABLE: {
    to: R.TIMETABLES.CLASSES,
    action: "Build it",
    title: "Classes with no timetable",
  },
  EVENT_OUTSIDE_ANY_TERM: {
    to: R.ACADEMIC_CALENDAR.EVENTS,
    action: "Review it",
    title: "Dated outside every term",
  },
};

export function buildAttention({
  alerts,
  onboarding,
  branchesWithoutSession,
  students,
  staff,
  pendingApprovals,
}: {
  alerts?: CalendarAlert[];
  onboarding?: OnboardingState | null;
  branchesWithoutSession?: { id: number; name: string }[];
  students?: StudentSummary;
  staff?: StaffCounts;
  pendingApprovals?: number;
}): AttentionItem[] {
  const out: AttentionItem[] = [];

  // Going live comes first and is never merely a warning. A school that is
  // still PENDING is a school whose parents cannot be invited yet, and the
  // count is the server's own - `blocking_tasks` is what the gate reads.
  const blocking = onboarding?.blocking_tasks?.length ?? 0;
  if (onboarding && onboarding.go_live_blocked && blocking > 0) {
    out.push({
      id: "go-live",
      tone: "blocking",
      mine: true,
      title: "Going live is blocked",
      stat: blocking,
      detail:
        blocking === 1
          ? "One required setup step is still outstanding, so this school cannot go live yet."
          : `${blocking} required setup steps are still outstanding, so this school cannot go live yet.`,
      to: R.ONBOARDING.INDEX,
      action: "Finish setup",
    });
  }

  // A branch in no live year at all. The academics module reports this rather
  // than defaulting it, because there is no correct year to guess for a branch
  // opened mid-session, and a guess would put a term on a branch that never ran
  // it.
  for (const branch of branchesWithoutSession ?? []) {
    out.push({
      id: `branch-${branch.id}`,
      tone: "blocking",
      mine: true,
      title: "A branch has no year",
      detail: `${branch.name} is not in any academic year, so nothing can be scheduled for it.`,
      to: R.ACADEMIC_STRUCTURE.SESSIONS,
      action: "Give it a year",
    });
  }

  const sorted = [...(alerts ?? [])].sort(
    (a, b) => (ALERT_RANK[a.code] ?? 99) - (ALERT_RANK[b.code] ?? 99),
  );
  const notices: AttentionItem[] = [];
  for (const alert of sorted) {
    const target = ALERT_TARGET[alert.code];
    const tone = ALERT_TONE[alert.code] ?? "info";
    const item: AttentionItem = {
      id: `${alert.code}-${alert.ids.join("-") || "all"}`,
      tone,
      // Everything a school is told about is a school's to fix, except the
      // things it may reasonably have meant - a December break dated between
      // terms is the standing example. Those are for watching.
      mine: tone !== "info",
      title: target?.title ?? "Something needs a look",
      // The rows the server named. It sends them so a screen can link to
      // them; the count of them is also the honest size of the problem.
      stat: alert.ids.length || undefined,
      detail: alert.detail,
      to: target?.to ?? R.ACADEMIC_CALENDAR.INDEX,
      action: target?.action ?? "Take a look",
    };
    if (tone === "info") notices.push(item);
    else out.push(item);
  }

  // Personal workflow work belongs after structural blockers. It is urgent to
  // the reader, but it does not stop the school from running while it waits.
  const approvalCount = pendingApprovals ?? 0;
  if (approvalCount > 0) {
    const count = approvalCount;
    out.push({
      id: "pending-approvals",
      tone: "warning",
      mine: true,
      title: "Approvals are waiting",
      stat: count,
      detail:
        count === 1
          ? "One document is waiting for your decision."
          : `${count} documents are waiting for your decision.`,
      to: R.WORKFLOW.APPROVALS,
      action: "Review approvals",
    });
  }

  // These figures are the server's summary of the same branch and year the
  // student directory reads. The dashboard does not recalculate status from
  // rows, so its queue cannot disagree with the directory beneath it.
  const unassignedCount = students?.unassigned ?? 0;
  if (unassignedCount > 0) {
    const count = unassignedCount;
    out.push({
      id: "students-unassigned",
      tone: "warning",
      mine: true,
      title: "Students need a class",
      stat: count,
      detail:
        count === 1
          ? "One student is on the roll without a class."
          : `${count} students are on the roll without a class.`,
      to: R.STUDENTS.ASSIGN,
      action: "Place students",
    });
  }

  const applicantCount = students?.applicants ?? 0;
  if (applicantCount > 0) {
    const count = applicantCount;
    out.push({
      id: "student-applicants",
      tone: "info",
      mine: true,
      title: "Applications need review",
      stat: count,
      detail:
        count === 1
          ? "One application is waiting for a decision."
          : `${count} applications are waiting for a decision.`,
      to: R.STUDENTS.APPLICANTS,
      action: "Review applicants",
    });
  }

  // A locked account is an identity issue, not an employment status. The
  // staff endpoint keeps those separate and this wording preserves that fact.
  const lockedAccountCount = staff?.locked_accounts ?? 0;
  if (lockedAccountCount > 0) {
    const count = lockedAccountCount;
    out.push({
      id: "staff-locked-accounts",
      tone: "warning",
      mine: true,
      title: "Staff accounts are locked",
      stat: count,
      detail:
        count === 1
          ? "One staff account is locked and cannot sign in."
          : `${count} staff accounts are locked and cannot sign in.`,
      to: R.STAFF.INDEX,
      action: "Open staff",
    });
  }

  out.push(...notices);

  return out;
}
