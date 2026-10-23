import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import type { BranchReach, FieldAccessPayload } from "@/redux/features/auth/auth-types";
import { isIdentitySwapInProgress } from "@/utils/identity-swap";

/**
 * Reloading the app when the signed-in person's own access changes.
 *
 * The menus, the guarded routes and every Field Access check are worked out
 * from the permissions the session holds, so a change made on the server is
 * only half applied until the whole app is built again from the new set. A
 * reload is the one way to rebuild all of it: cached lists fetched under the
 * old access go, a screen the person may no longer open sends them away, and
 * a field that has just been hidden is not left on screen.
 *
 * Only the person whose access changed reloads. `/me` is re-read every
 * minute, on returning to the tab, and after any save that grants, withdraws
 * or edits a role or its fields (so an administrator who changes their own
 * access is caught at once). When it answers with access different from what
 * the session holds (`accessDiffers`), the change is only marked.
 *
 * The reload waits for their next move to another page (`useReloadOnNextMove`),
 * never the moment the change is noticed: somebody halfway through a form
 * keeps what they have typed, and the page they asked for is the one that
 * loads. Until then the screen in front of them keeps the access it opened
 * with, and the server refuses anything that access no longer allows.
 *
 * The message saying why it reloaded survives the reload in session storage
 * and is shown by `takeAccessReloadNotice` once the app is back.
 */

const NOTICE_KEY = "xvs.access-reload-notice";

export interface AccessReloadNotice {
  kind: "success" | "info";
  message: string;
}

/** What a session may do, as the login response and `/me` send it. */
export interface AccessSnapshot {
  permissions: string[];
  field_access: FieldAccessPayload;
  branch_reach: BranchReach | null;
}

/** Whether this page has noticed an access change it has not reloaded for. */
let changePending = false;

/** Note that the person's access changed; the app reloads at their next move. */
export function markAccessChanged() {
  changePending = true;
}

export function accessChangePending() {
  return changePending;
}

/** Keep the message for after the reload, then reload the current address. */
export function reloadAfterAccessChange(notice: AccessReloadNotice) {
  try {
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
  } catch {
    // Storage blocked: the reload still happens, without the message.
  }
  window.location.reload();
}

/**
 * Reload once the person moves to another page, if their access changed.
 *
 * Mounted once, in the workspace layout. The address has already changed when
 * this runs, so the reload lands on the page they were going to. An identity
 * swap (a proxy starting or ending) moves the address on purpose and rebuilds
 * the session itself, so it is left alone.
 */
export function useReloadOnNextMove() {
  const { key } = useLocation();
  const first = useRef(key);

  useEffect(() => {
    if (key === first.current) return;
    if (!changePending || isIdentitySwapInProgress()) return;
    reloadAfterAccessChange({
      kind: "info",
      message: "Your access was changed, so XVS reloaded to match it.",
    });
  }, [key]);
}

/** The notice left by the reload that brought this page up, read once. */
export function takeAccessReloadNotice(): AccessReloadNotice | null {
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(NOTICE_KEY);
    const parsed = JSON.parse(raw) as Partial<AccessReloadNotice>;
    if (typeof parsed.message !== "string" || !parsed.message) return null;
    return { kind: parsed.kind === "info" ? "info" : "success", message: parsed.message };
  } catch {
    return null;
  }
}

const sameSet = (a: readonly (string | number)[] = [], b: readonly (string | number)[] = []) => {
  if (a.length !== b.length) return false;
  const left = new Set(a);
  return b.every((entry) => left.has(entry));
};

/**
 * Whether two snapshots grant different access.
 *
 * Order never counts: the same permissions listed in another order are the
 * same access, and treating them as a change would reload somebody on every
 * check for no reason.
 */
export function accessDiffers(before: AccessSnapshot, after: AccessSnapshot): boolean {
  if (!sameSet(before.permissions, after.permissions)) return true;

  const resources = new Set([...Object.keys(before.field_access), ...Object.keys(after.field_access)]);
  for (const resource of resources) {
    const left = before.field_access[resource] ?? {};
    const right = after.field_access[resource] ?? {};
    if (!sameSet(left.hidden, right.hidden)) return true;
    if (!sameSet(left.read_only, right.read_only)) return true;
    if (!sameSet(left.open_on_create, right.open_on_create)) return true;
  }

  const reachBefore = before.branch_reach;
  const reachAfter = after.branch_reach;
  if (!reachBefore || !reachAfter) return Boolean(reachBefore) !== Boolean(reachAfter);
  return reachBefore.whole_tenant !== reachAfter.whole_tenant
    || !sameSet(reachBefore.branch_ids, reachAfter.branch_ids);
}
