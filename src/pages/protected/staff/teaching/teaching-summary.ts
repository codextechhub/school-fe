/** The four coverage facts the header can state from server aggregates. */
export function teachingSummary(
  total: number,
  noTeacher: number,
  noMainTeacher: number,
): {
  total: number;
  covered: number;
  noTeacher: number;
  noMainTeacher: number;
} {
  const safeTotal = Math.max(0, total);
  const safeNoTeacher = Math.max(0, noTeacher);
  const safeNoMainTeacher = Math.max(0, noMainTeacher);

  return {
    total: safeTotal,
    covered: Math.max(0, safeTotal - safeNoTeacher - safeNoMainTeacher),
    noTeacher: safeNoTeacher,
    noMainTeacher: safeNoMainTeacher,
  };
}
