import type { SchoolRole } from "@/redux/services/roles/roles-types";

/**
 * Whether a reader may change what a role means, and why not when they may not.
 *
 * A role's branch set is its reach: every holder reaches those branches through
 * it, and an empty set is every branch. Renaming it, re-permissioning it,
 * changing its field access, retiring it or deleting it therefore changes what
 * people at every one of those branches may do. The server allows that only to
 * a reader covering the whole set, and keeps a school-wide role for a reader
 * covering the whole school. Mrs Bello, who works at Lekki only, reads the
 * school's Bursar role and changes nothing on it; her own Lekki Bursar role is
 * hers to shape.
 *
 * `can_edit`, where the server sends it, is its own answer and wins. Without
 * it the reader's reach decides, which is the same rule.
 *
 * `null` means the reader may change it. `"shared"` is a school-wide role and
 * `"other-branches"` a role reaching a branch the reader does not work in.
 */
export type RoleReadOnly = "shared" | "other-branches" | null;

/** The branches a role reaches; empty is school-wide. Older payloads name one `branch`. */
export function roleBranchIds(role: Pick<SchoolRole, "branch" | "branch_ids">): number[] {
  return role.branch_ids ?? (role.branch ? [role.branch] : []);
}

export function roleReadOnly(
  role: Pick<SchoolRole, "branch" | "branch_ids" | "can_edit">,
  reach: { wholeSchool: boolean; covers: (ids: number[]) => boolean },
): RoleReadOnly {
  const ids = roleBranchIds(role);
  const writable = role.can_edit ?? (reach.wholeSchool || (ids.length > 0 && reach.covers(ids)));
  if (writable) return null;
  return ids.length ? "other-branches" : "shared";
}

/**
 * The line telling a reader why a role is theirs to read and not to change.
 *
 * `verb` finishes "what this role can ...": "do" for its permissions, status
 * and name, "see" for its field access.
 */
export function roleReadOnlySentence(reason: Exclude<RoleReadOnly, null>, verb: "do" | "see" = "do"): string {
  return reason === "shared"
    ? `Only a school-wide administrator can change what this role can ${verb}. Ask one to change it, or create a role for your branch.`
    : `This role reaches branches you do not work in, so only an administrator who covers them can change what it can ${verb}.`;
}
