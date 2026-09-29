import { useMemo, useState } from "react";

import { useGetPeriodsQuery } from "@/redux/services/calendar/calendar-api";
import type { Period } from "@/redux/services/calendar/calendar-types";
import type { AcademicSession } from "@/redux/services/academics/academics-types";

/**
 * Starting a year's bell schedule from an earlier year's.
 *
 * A school's day rarely changes between years, so a year with no periods is
 * offered the most recent earlier year that has some.
 *
 * **What the copy covers is the reader's reach, not the branch picker.** A
 * school-wide administrator's copy fills every branch at once, and is refused
 * if any branch of the target year already has periods. A branch-bound
 * reader's copy fills only their own branches, never the school's shared
 * periods, and is refused if their branches already have some. So the period
 * count, the wording and the "is the target empty" test are all taken over
 * that reach, and the offer is made only in a view that shows all of it: a
 * school-wide reader looking at Ikeja is told to switch to All branches rather
 * than shown Ikeja's count for a copy that would touch Lekki too.
 */

/** How many earlier years are asked about before the offer gives up. */
const MAX_PROBES = 5;

/**
 * Whose periods a copy moves.
 *
 *   single    a one-branch school: every period.
 *   school    a school-wide reader at a multi-branch school: every branch's.
 *   branches  a branch-bound reader: their own branches' only.
 */
export type CopyScope = "single" | "school" | "branches";

export function copyScopeFor({
  applies,
  wholeSchool,
}: {
  applies: boolean;
  wholeSchool: boolean;
}): CopyScope {
  if (!applies) return "single";
  return wholeSchool ? "school" : "branches";
}

/**
 * The periods a copy of this scope would move, or would find in its way.
 * A branch-bound copy leaves the school's shared periods (branch null) alone.
 */
export function periodsInScope(periods: readonly Period[], scope: CopyScope): Period[] {
  return scope === "branches"
    ? periods.filter((period) => typeof period.branch === "number")
    : [...periods];
}

/**
 * Whether the page's view shows the whole of the copy's reach. A pinned
 * reader's one branch is their whole reach; anyone else has to be looking at
 * "All branches" or "All my branches".
 */
export function viewCoversScope({
  scope,
  branch,
  pinned,
}: {
  scope: CopyScope;
  branch: number | "all";
  pinned: boolean;
}): boolean {
  return scope === "single" || branch === "all" || pinned;
}

/** Sessions that started before `current`, most recent first. */
export function earlierSessions(
  sessions: readonly AcademicSession[],
  current: Pick<AcademicSession, "id" | "start_date"> | null | undefined,
): AcademicSession[] {
  if (!current) return [];
  return sessions
    .filter((s) => s.id !== current.id && s.start_date < current.start_date)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export interface CopySource {
  session: Pick<AcademicSession, "id" | "name">;
  /** Periods the copy would move, counted over the reader's reach. */
  periodCount: number;
}

export type CopyOffer =
  | { kind: "offer"; source: CopySource }
  | { kind: "switch-view"; source: CopySource }
  | null;

/**
 * What to show about copying.
 *
 * The offer itself only in a view covering the copy's reach, while that reach
 * holds no periods in this year. In a narrower view whose own rows are empty,
 * a pointer to the wider view instead, because the copy's real target cannot
 * be judged from here. Nothing for a reader who may not add periods, while
 * loading, or without an earlier year that has periods.
 */
export function copyOfferFor({
  canCreate,
  loading,
  coversScope,
  targetInScope,
  viewEmpty,
  source,
}: {
  canCreate: boolean;
  loading: boolean;
  coversScope: boolean;
  /** This year's periods inside the copy's reach, as far as the view shows. */
  targetInScope: number;
  /** True when the page's own view of this year has no periods. */
  viewEmpty: boolean;
  source: CopySource | null;
}): CopyOffer {
  if (!canCreate || loading || !source || source.periodCount === 0) return null;
  if (coversScope) return targetInScope === 0 ? { kind: "offer", source } : null;
  return viewEmpty ? { kind: "switch-view", source } : null;
}

/**
 * The most recent earlier session with periods inside the reader's reach,
 * asked one year at a time over the whole of that reach.
 *
 * Usually the first year asked answers, so this is one request. A year with
 * nothing in reach moves the question to the one before it, up to
 * {@link MAX_PROBES} years back.
 */
export function usePreviousSchedule({
  sessions,
  current,
  scope,
  enabled,
}: {
  sessions: readonly AcademicSession[];
  current: AcademicSession | null;
  scope: CopyScope;
  enabled: boolean;
}): CopySource | null {
  const candidates = useMemo(
    () => earlierSessions(sessions, current).slice(0, MAX_PROBES),
    [sessions, current],
  );
  const currentId = current?.id ?? null;
  const [probe, setProbe] = useState({ forId: currentId, index: 0 });
  if (probe.forId !== currentId) setProbe({ forId: currentId, index: 0 });
  const index = probe.forId === currentId ? probe.index : 0;

  const candidate = enabled ? candidates[index] : undefined;
  // "all" is the whole of the reader's reach: the server narrows it.
  const { currentData, isFetching } = useGetPeriodsQuery(
    { branch: "all", session: candidate?.id, day: "all" },
    { skip: !candidate },
  );
  const count = periodsInScope(currentData?.data?.periods ?? [], scope).length;
  const answered = !!candidate && !isFetching && !!currentData;

  // Nothing to copy from this year, so ask about the one before it.
  if (answered && count === 0 && probe.forId === currentId) {
    setProbe({ forId: currentId, index: index + 1 });
  }

  if (!candidate || !answered || count === 0) return null;
  return { session: { id: candidate.id, name: candidate.name }, periodCount: count };
}
