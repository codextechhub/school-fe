import type { StaffGroup } from "@/redux/services/attendance/attendance-types";

export interface StaffAttendanceSummary {
  expected: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  needsMarking: number;
}

/** Totals across the branch registers whose counts are readable. */
export function summarizeStaffAttendance(groups: StaffGroup[]): StaffAttendanceSummary {
  return groups.reduce<StaffAttendanceSummary>((summary, group) => {
    if (!group.counts) return summary;
    summary.expected += group.counts.total;
    summary.present += group.counts.present;
    summary.late += group.counts.late;
    summary.absent += group.counts.absent;
    summary.onLeave += group.counts.on_leave;
    summary.needsMarking += group.counts.unmarked;
    return summary;
  }, {
    expected: 0,
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    needsMarking: 0,
  });
}

/** The backend's total already contains only unlocked, markable staff. */
export function staffGroupProgress(group: StaffGroup) {
  if (!group.counts) return null;
  const markable = group.counts.total;
  const marked = group.counts.present + group.counts.late + group.counts.absent;
  return {
    markable,
    marked,
    percent: markable > 0 ? Math.round((marked / markable) * 100) : 0,
  };
}
