import type { Report } from "@/redux/services/attendance/attendance-types";

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/**
 * Totals used by the report overview.
 *
 * Each value stays absent when its canonical response block is absent. In
 * particular, chronic absence and register gaps are never inferred from class
 * names or other readable rows when Field Access removes their source fields.
 */
export function summarizeAttendanceReport(report: Report) {
  const classCounts = report.by_class.flatMap((row) => row.counts ? [row.counts] : []);
  const present = classCounts.reduce((total, counts) => total + counts.present, 0);
  const absent = classCounts.reduce((total, counts) => total + counts.absent, 0);
  const excused = classCounts.reduce((total, counts) => total + counts.excused, 0);
  const denominator = present + absent + excused;

  return {
    attendanceRate: classCounts.length && denominator ? oneDecimal((present * 100) / denominator) : null,
    late: classCounts.length
      ? classCounts.reduce((total, counts) => total + counts.late, 0)
      : null,
    atRisk: report.chronic === undefined ? null : report.chronic.length,
    registerGaps: report.not_taken === undefined ? null : report.not_taken.length,
    lessonsMissed: report.lessons_missed === undefined
      ? null
      : report.lessons_missed.reduce((total, row) => total + row.missed, 0),
  };
}
