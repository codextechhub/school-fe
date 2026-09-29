/**
 * The school's display settings for code that cannot call a hook.
 *
 * Components read them with `useSchoolDisplay`. A plain helper (a table cell
 * formatter, a label builder in a `.ts` file, a function the shared finance
 * package imports) has no hook to call and often no prefs to be handed, so it
 * reads them here: the live store is bound once in `store.ts`, the same way
 * `tenant-context` exposes the tenant slug, and every call reads the current
 * session. This module imports nothing from the store at runtime, so there is
 * no import cycle.
 *
 * What it cannot do is re-render. A component that formats through a helper
 * picks up changed settings on its next render, which in practice is the next
 * navigation; a screen that must follow a change at once (the Display
 * settings page's own preview) uses the hook.
 *
 * Unbound (a unit test that never builds the store) it answers with the
 * defaults, so helpers stay callable from plain tests.
 */

import {
  bindFormatters,
  resolveDisplayPrefs,
  type DateFormatters,
  type DisplayPrefs,
  type SchoolDisplay,
} from "./dates";

/** The slice of the store this module reads, typed structurally. */
export interface DisplayState {
  auth?: {
    tenant?: { display?: SchoolDisplay | null } | null;
    branch_reach?: { whole_tenant: boolean; branch_ids: number[] } | null;
  };
  academicsLens?: { branch: number | "all" };
}

let readState: (() => DisplayState) | null = null;

export function bindDisplayStore(getState: () => DisplayState): void {
  readState = getState;
}

/**
 * The one branch the reader is looking at, or null for the whole school.
 *
 * The branch lens when it is on one branch; otherwise the reader's only
 * branch when their reach is a single branch, because such a reader sees
 * nothing else whatever the lens says.
 */
export function selectDisplayBranch(state: DisplayState): number | null {
  const lens = state.academicsLens?.branch;
  if (typeof lens === "number") return lens;
  const reach = state.auth?.branch_reach;
  if (reach && !reach.whole_tenant && reach.branch_ids.length === 1) {
    return reach.branch_ids[0];
  }
  return null;
}

/** The tenant's display settings as sent, or undefined. */
export function selectSchoolDisplay(state: DisplayState): SchoolDisplay | undefined {
  return state.auth?.tenant?.display ?? undefined;
}

/**
 * The prefs for one branch, or for whatever the reader is looking at.
 *
 * `branchId` undefined follows the lens (see {@link selectDisplayBranch});
 * null asks for the whole school's zone; a number asks for that branch's.
 */
export function activeDisplayPrefs(branchId?: number | string | null): DisplayPrefs {
  const state = readState?.() ?? {};
  const branch = branchId === undefined ? selectDisplayBranch(state) : branchId;
  return resolveDisplayPrefs(selectSchoolDisplay(state), branch);
}

/** The bound formatters for {@link activeDisplayPrefs}. */
export function activeFormatters(branchId?: number | string | null): DateFormatters {
  return bindFormatters(activeDisplayPrefs(branchId));
}
