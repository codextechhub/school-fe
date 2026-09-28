import { canManageRow } from "@/lib/can-manage";
import type { StaffListRow } from "@/redux/services/staff/staff-types";

/**
 * Whether the viewer may change this person, not merely read them.
 *
 * False for a branch administrator looking at somebody school-wide or also
 * posted to a branch they do not cover: those people appear in their directory
 * because they work there too, and their record is relied on by every other
 * branch that sees it. The rule is the app-wide one in `canManageRow`.
 */
export function canManage(person: Pick<StaffListRow, "can_manage">): boolean {
  return canManageRow(person);
}
