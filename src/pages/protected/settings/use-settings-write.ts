import { usePermissions } from "@/hooks/use-permissions";
import type { PermissionCode } from "@/permissions";
import { useSettingsBranches } from "./use-settings-branches";

/** Why a reader may read a setting but not change it. */
export type ReadOnlyReason = "permission" | "reach";

/**
 * Whether this reader may change a setting, and why not when they may not.
 *
 * Two things must both hold. The reader's role carries the permission the
 * setting's endpoint checks, and the reader covers everything the setting
 * applies to. A school-wide setting binds every branch, so it needs a reader
 * who acts for the whole school: a branch administrator whose role carries
 * `school.settings.update` still only reads the school's guardian rules,
 * because raising the minimum for Ikeja would raise it for Lekki too. A
 * branch's own setting needs that branch in the reader's reach.
 *
 * The server refuses the same writes. This keeps a form from offering what
 * its save would be refused.
 *
 * `branch` is the branch whose own setting is open; empty or absent means the
 * school's.
 */
export function useSettingsWrite(
  permission: PermissionCode,
  branch?: string | number | null,
): { canSave: boolean; reason: ReadOnlyReason | null } {
  const { hasPermission } = usePermissions();
  const branches = useSettingsBranches();

  if (!hasPermission(permission)) return { canSave: false, reason: "permission" };
  const id = branch ? Number(branch) : null;
  const reaches =
    branches.wholeSchool || (id != null && branches.choices.some((b) => b.id === id));
  return reaches ? { canSave: true, reason: null } : { canSave: false, reason: "reach" };
}

export interface ReadOnlyWording {
  /** What the reader is looking at, read after "You can read". */
  subject?: string;
  /** `subject` names one thing ("this rule") rather than several. */
  one?: boolean;
  /** The section offers a branch picker, so a branch-bound reader can pick their own. */
  branchPicker?: boolean;
}

/**
 * The sentence telling a reader why they may read a setting but not change it.
 *
 * It says which of the two things is missing, because the fix differs: a
 * missing permission is for the school administrator to grant, while a
 * branch-bound reader holding the permission is looking at rules that bind
 * every branch, and no grant at their own branch changes that.
 */
export function readOnlySentence(
  reason: ReadOnlyReason,
  { subject = "these rules", one = false, branchPicker = false }: ReadOnlyWording = {},
): string {
  const them = one ? "it" : "them";
  const apply = one ? "It applies" : "They apply";
  if (reason === "permission") {
    return `You can read ${subject}. Changing ${them} is the school administrator's to do.`;
  }
  return branchPicker
    ? `You can read ${subject} for the whole school. To change ${them} for your branch, pick it above.`
    : `You can read ${subject}. ${apply} to every branch, so changing ${them} is for an administrator who covers the whole school.`;
}
