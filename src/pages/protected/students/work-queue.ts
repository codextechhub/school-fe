import { daysBetween, todayIn } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import type {
  ClassSeats,
  StudentRow,
  StudentSummary,
} from "@/redux/services/students/students-types";

/**
 * What needs a person today, ranked.
 *
 * This replaced a Nearest-capacity panel that listed the four fullest classes.
 * Three of those four rows said "4 free", "9 free", "1 free" - non-events - and
 * the one row that mattered, a class over its limit, sat among them at equal
 * weight. The bars carried nothing the numbers did not, because at 26/30 and
 * 31/40 every bar looks nearly full and the reader ends up reading the digits.
 *
 * The rule this panel is built on: **a row is a named record and a verb.** Not
 * a statistic. "1 Needs a class" tells a registrar a number; "Emeka Obi is
 * enrolled with no class" tells her who, and the button takes her there.
 *
 * **It is composed here rather than served.** Every row is derived from calls
 * the directory already makes - the summary, the unplaced list, and the class
 * seat counts - so this needs no new endpoint and no new permission. If it is
 * ever wanted on the Dashboard too, that is the moment it should move to the
 * server: two screens ranking the same queue by different rules is exactly the
 * drift this file exists to avoid.
 */

export type QueueTone = "alert" | "count";

export interface QueueRow {
  id: string;
  tone: QueueTone;
  /** The badge: "!" for something wrong, a number for a backlog. */
  marker: string;
  title: string;
  detail: string;
  actionLabel: string;
  action: "place" | "review" | "move";
  /** Present when the row is about one student, so the verb can open them. */
  studentId?: number;
}

/**
 * Whole calendar days from an ISO date to `today` (also `YYYY-MM-DD`).
 * Future dates read as 0. Both are calendar dates, so no zone can shift them.
 */
function daysSince(iso: string | null, today: string): number | null {
  const days = iso ? daysBetween(iso, today) : null;
  return days === null ? null : Math.max(0, days);
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/**
 * Build the queue, most urgent first.
 *
 * Order is deliberate and not by count: a child sitting on the roll with no
 * class is a person blocked today, an application waiting is a decision owed,
 * and a class over its limit is the reason the first one is stuck. Ranking by
 * size would put twenty applications above one child with nowhere to sit.
 */
export function buildWorkQueue({
  summary,
  unplaced,
  applicants,
  seats,
  now = new Date(),
  timeZone = activeDisplayPrefs().timeZone,
  limit = 4,
}: {
  summary?: StudentSummary;
  unplaced: StudentRow[];
  applicants: StudentRow[];
  seats: ClassSeats[];
  /** The present moment; "today" is its date in `timeZone`, the school's. */
  now?: Date;
  timeZone?: string;
  limit?: number;
}): { rows: QueueRow[]; overflow: number } {
  const rows: QueueRow[] = [];
  const today = todayIn(timeZone, now);

  // ── Children on the roll with nowhere to sit ────────────────────────────
  // Longest-waiting first: the one who has been in limbo since term started is
  // more urgent than the one enrolled this morning.
  const waiting = [...unplaced].sort((a, b) => {
    const left = daysSince(a.enrolment_date, today) ?? 0;
    const right = daysSince(b.enrolment_date, today) ?? 0;
    return right - left;
  });

  for (const student of waiting) {
    const days = daysSince(student.enrolment_date, today);
    // Why they are stuck, when we can tell: every class at their level full is
    // a different problem from nobody having got round to it.
    const atLevel = seats.filter(
      (c) => c.level_name && c.level_name === student.level_name,
    );
    const withRoom = atLevel.filter(
      (c) => c.remaining === null || c.remaining > 0,
    );
    const blocked = atLevel.length > 0 && withRoom.length === 0;

    const parts: string[] = [];
    if (blocked) {
      parts.push(
        atLevel.length === 1
          ? `${atLevel[0].name} is full`
          : `every ${student.level_name} class is full`,
      );
    }
    if (days !== null) {
      parts.push(
        days === 0 ? "enrolled today" : `enrolled ${days} ${plural(days, "day", "days")} ago`,
      );
    }

    rows.push({
      id: `place-${student.id}`,
      tone: "alert",
      marker: "!",
      title: `${student.full_name} is on the roll with no class`,
      detail: parts.join(" · ") || "No class assigned",
      actionLabel: "Place",
      action: "place",
      studentId: student.id,
    });
  }

  // ── Applications owed a decision ────────────────────────────────────────
  const applicantCount = summary?.applicants ?? applicants.length;
  if (applicantCount > 0) {
    const longest = [...applicants]
      .filter((a) => a.applied_on)
      .sort((a, b) => (a.applied_on ?? "").localeCompare(b.applied_on ?? ""))[0];
    const days = longest ? daysSince(longest.applied_on ?? null, today) : null;

    rows.push({
      id: "applicants",
      tone: "count",
      marker: String(applicantCount),
      title: `${applicantCount} ${plural(applicantCount, "application", "applications")} awaiting enrolment`,
      detail:
        longest && days !== null
          ? `Longest waiting ${days} ${plural(days, "day", "days")} · ${longest.full_name}`
          : "Waiting on a decision",
      actionLabel: "Review",
      action: "review",
    });
  }

  // ── Classes over their limit ────────────────────────────────────────────
  // B's exception line, folded in as its own row. Only the classes that are
  // actually over: "4 free" was never a thing anybody had to act on.
  const over = seats
    .filter((c) => c.capacity !== null && c.used > c.capacity)
    .sort((a, b) => b.used - b.capacity! - (a.used - a.capacity!));

  for (const cls of over) {
    const by = cls.used - (cls.capacity ?? 0);
    // Where the overflow could go: the nearest class at the same level with a
    // place in it. Naming it turns a complaint into an instruction.
    const alternative = seats.find(
      (c) =>
        c.id !== cls.id &&
        c.level_name === cls.level_name &&
        c.remaining !== null &&
        c.remaining > 0,
    );
    rows.push({
      id: `over-${cls.id}`,
      tone: "alert",
      marker: "!",
      title: `${cls.name} is over by ${by}`,
      detail: [
        `${cls.used} of ${cls.capacity}`,
        alternative
          ? `${alternative.name} has ${alternative.remaining} ${plural(alternative.remaining as number, "place", "places")}`
          : "no class at this level has room",
      ].join(" · "),
      actionLabel: "Move",
      action: "move",
    });
  }

  return { rows: rows.slice(0, limit), overflow: Math.max(0, rows.length - limit) };
}
