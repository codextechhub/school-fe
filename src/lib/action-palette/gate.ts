/**
 * Permission gating for palette actions.
 *
 * This takes the user's raw permission keys as a plain array rather than
 * calling usePermissions(): the engine must stay framework-free so it can be
 * unit tested without a Redux store, and the caller already has the keys.
 * The four gate kinds line up one-for-one with the four methods on
 * src/hooks/use-permissions.ts (hasPermission / hasAnyPermission /
 * hasAllPermissions / hasModuleAccess), so a screen and a palette action gated
 * the same way agree by construction.
 */

import { resolvePermissionKey, type PermissionCode } from "@/permissions";
import type { ActionDef, ActionGate } from "./types";

/** Evaluate an action gate against raw permission keys returned by the API. */
export function passesActionGate(
  gate: ActionGate,
  permissions: readonly string[],
): boolean {
  return passesGateWithSet(gate, permissions, new Set(permissions));
}

/**
 * resolvePermissionKey returns "" for a code missing from the registry. Treat
 * that as "nobody holds it" rather than letting an empty key coincidentally
 * match: an unresolvable code is a registry bug, and the safe reading of a bug
 * in a permission check is to deny.
 */
const holds = (held: ReadonlySet<string>, code: PermissionCode): boolean => {
  const key = resolvePermissionKey(code);
  return key !== "" && held.has(key);
};

function passesGateWithSet(
  gate: ActionGate,
  permissions: readonly string[],
  held: ReadonlySet<string>,
): boolean {
  if (gate === null) return true;
  if ("perm" in gate) return holds(held, gate.perm);
  if ("required" in gate) {
    return (
      gate.required.every((code) => holds(held, code)) &&
      gate.any.some((code) => holds(held, code))
    );
  }
  if ("any" in gate) return gate.any.some((code) => holds(held, code));
  if ("all" in gate) return gate.all.every((code) => holds(held, code));
  if ("module" in gate) {
    return permissions.some((key) => gate.module.some((prefix) => key.startsWith(prefix)));
  }
  return false;
}

export function filterActionsForPermissions(
  actions: readonly ActionDef[],
  permissions: readonly string[],
): ActionDef[] {
  const held = new Set(permissions);
  return actions.filter((action) => passesGateWithSet(action.gate, permissions, held));
}
