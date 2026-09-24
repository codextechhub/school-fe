export interface SidebarWorkCountSources {
  applicants?: number;
  unassignedStudents?: number;
  pendingApprovals?: number;
  invitations?: number;
  uncoveredDuties?: number;
  dutiesWithoutLead?: number;
}

export interface SidebarWorkCounts {
  applicants?: number;
  unassignedStudents?: number;
  pendingApprovals?: number;
  invitations?: number;
  teachingGaps?: number;
}

const visibleCount = (count: number | undefined) =>
  count != null && Number.isFinite(count) && count > 0 ? count : undefined;

/**
 * Turns each destination's actionable total into its sidebar badge.
 *
 * Zero is omitted because these badges represent work waiting behind a door.
 * Teaching duties combines uncovered subjects with subjects that have helpers
 * but no main teacher, since both groups appear as unresolved gaps on that
 * destination screen.
 */
export function deriveSidebarWorkCounts(
  sources: SidebarWorkCountSources,
): SidebarWorkCounts {
  const teachingGaps =
    (sources.uncoveredDuties ?? 0) + (sources.dutiesWithoutLead ?? 0);

  return {
    applicants: visibleCount(sources.applicants),
    unassignedStudents: visibleCount(sources.unassignedStudents),
    pendingApprovals: visibleCount(sources.pendingApprovals),
    invitations: visibleCount(sources.invitations),
    teachingGaps: visibleCount(teachingGaps),
  };
}
