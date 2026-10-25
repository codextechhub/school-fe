import type {
  ClassTeacherTerm,
  NamedUser,
} from "@/redux/services/academics/academics-types";

/**
 * A class's class teachers over the year, as rows a reader can follow.
 *
 * The server sends terms, newest first: one per stretch somebody held the
 * class. A class can also go without one between two terms, or since the last
 * one ended, and that stretch has no term of its own. It is read from the
 * dates: a term that ended where no newer term began at the same moment left
 * the class with nobody.
 *
 * What the class is in now (the open term, or the stretch of nobody since the
 * last term ended) is {@link currentState}. Everything before it is
 * {@link pastEntries}, which is what a history list shows below the current
 * class teacher.
 */

/** One row of a class's history. `name` is null for a stretch with nobody. */
export interface HistoryEntry {
  key: string;
  name: string | null;
  from: string | null;
  to: string | null;
  /** Who set the person, or who cleared the class for a stretch of nobody. */
  by?: NamedUser | null;
}

/** Since when the class has been as it is now, and who made it so. */
export interface CurrentState {
  since: string | null;
  by?: NamedUser | null;
}

/** The current state, or null for a class with no history at all. */
export function currentState(terms: ClassTeacherTerm[]): CurrentState | null {
  const latest = terms[0];
  if (!latest) return null;
  if (latest.ended_at === null) {
    return { since: latest.started_at, by: latest.set_by };
  }
  return { since: latest.ended_at, by: latest.ended_by };
}

/** Every stretch before the current one, newest first. */
export function pastEntries(terms: ClassTeacherTerm[]): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  terms.forEach((term, index) => {
    if (term.ended_at === null) return;
    const newer = terms[index - 1];
    if (newer && newer.started_at !== term.ended_at) {
      entries.push({
        key: `gap-${term.id}`,
        name: null,
        from: term.ended_at,
        to: newer.started_at,
        by: term.ended_by,
      });
    }
    entries.push({
      key: `term-${term.id}`,
      name: term.name,
      from: term.started_at,
      to: term.ended_at,
      by: term.set_by,
    });
  });
  return entries;
}
