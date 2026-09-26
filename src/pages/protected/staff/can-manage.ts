import { canManageRow } from "@/lib/can-manage";
import type { StaffListRow } from "@/redux/services/staff/staff-types";

/**
 * Whether the viewer may change this person, not merely read them.
 *
 * False for a branch administrator looking at somebody school-wide or also
 * posted to a branch they do not cover: those people appear in their directory
 * because they work there too, and their record is relied on by every other
 * branch that sees it. The rule is the app-wide one in `canManageRow`; this
 * wrapper exists because `StaffListRow` does not yet declare `can_manage`.
 */
export function canManage(person: StaffListRow): boolean {
  return canManageRow(person as StaffListRow & { can_manage?: boolean });
}
