/**
 * Whether the viewer may change a row, not merely read it.
 *
 * The server sends `can_manage: false` on a row a branch administrator can see
 * but not change: a school-wide class, subject, event or bell schedule, or a
 * member of staff who works across the whole school. The server refuses those
 * writes whatever a screen draws; this only keeps the controls from being
 * offered. A row without the flag reads as changeable, which is how every row
 * read before the flag existed, and a missing row (nothing selected) is left to
 * the screen's other gates.
 */
export function canManageRow(row: { can_manage?: boolean } | null | undefined): boolean {
  return row?.can_manage !== false;
}
