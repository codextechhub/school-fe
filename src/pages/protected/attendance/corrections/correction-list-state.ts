import type { CorrectionRow } from "@/redux/services/attendance/attendance-types";

export function correctionMatchesSearch(
  row: CorrectionRow,
  query: string,
  includeRequester: boolean,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    row.student.name,
    row.student.student_number,
    row.class_name,
    row.branch?.name,
    includeRequester ? row.requested_by_name : null,
  ].some((value) => value?.toLowerCase().includes(needle));
}

export function correctionPageSummary(rows: CorrectionRow[]) {
  return rows.reduce((summary, row) => {
    if (row.is_mine) summary.mine += 1;
    if (row.status === "APPROVED") summary.approved += 1;
    if (row.status === "REJECTED") summary.rejected += 1;
    return summary;
  }, { mine: 0, approved: 0, rejected: 0 });
}
