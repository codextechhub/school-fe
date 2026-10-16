export interface AttendanceReportFieldState {
  registerCountsHidden: boolean;
  registerStatusHidden: boolean;
  lessonMarkHidden: boolean;
  lessonCountsHidden: boolean;
}

/**
 * The report blocks controlled by the register and lesson Field Access rules.
 *
 * Report summaries follow the same canonical fields as the backend response.
 * This prevents an omitted count or status block from being reconstructed from
 * another visible part of the report.
 */
export function attendanceReportFieldPolicy(fields: AttendanceReportFieldState) {
  return {
    showCounts: !fields.registerCountsHidden,
    showStatus: !fields.registerStatusHidden,
    showLessons: !fields.lessonMarkHidden && !fields.lessonCountsHidden,
  };
}
