import type { LessonListRow } from "@/redux/services/attendance/attendance-types";

export type LessonDirectoryFilter = "all" | "action" | "submitted";

export function lessonMatchesFilter(row: LessonListRow, filter: LessonDirectoryFilter) {
  if (filter === "all") return true;
  if (filter === "submitted") return row.status === "SUBMITTED";
  return row.status !== "SUBMITTED";
}

export function lessonMatchesSearch(row: LessonListRow, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    row.period_label,
    row.school_class.name,
    row.subject,
    row.teacher_name,
    row.branch?.name,
  ].some((value) => value?.toLowerCase().includes(needle));
}

export function summarizeLessons(rows: LessonListRow[]) {
  return rows.reduce((summary, row) => {
    if (row.status === "SUBMITTED") summary.submitted += 1;
    else {
      summary.needsAction += 1;
      if (row.status === "IN_PROGRESS" || row.status === "READY") summary.inProgress += 1;
      else summary.notStarted += 1;
    }
    return summary;
  }, { submitted: 0, inProgress: 0, notStarted: 0, needsAction: 0 });
}
