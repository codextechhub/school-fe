/**
 * Action palette - the workspace search is an *action* launcher, not a page
 * finder. Every entry is a permission-gated action a user can type
 * ("view students", "enroll student"), and the registry that lists them lives
 * beside this file in registry.ts.
 */

import type { PermissionCode } from "@/permissions";

/**
 * Which part of the workspace an action belongs to - drives the grouped headers
 * in the expanded results list.
 *
 * Why a closed union rather than a free string: the headers render in a FIXED
 * order (see SECTION_ORDER in index.ts), not in relevance order, because a
 * stable header order is far more scannable when a query lights up four
 * sections at once. A fixed order needs a known, finite set of names, and a
 * closed union makes a typo in the registry a compile error instead of a
 * silently-dropped group.
 *
 * The names deliberately mirror the sidebar group titles in
 * src/components/app-sidebar.tsx ("Overview", "People", "Academics",
 * "Finance"), so a result header reads the same as the nav the user already
 * knows. Two extras have no sidebar group of their own:
 * - "Settings"   - configuration screens the sidebar tucks under Finance.
 * - "Account"    - the header account menu (proxy, logout), which is not
 *                  navigation at all.
 * - "Data"       - the Data Imports console and the Export Centre, which are
 *                  one area to a school: both are how rows arrive and leave in
 *                  bulk, and neither is a place its own sidebar group leads to.
 * Add a name here (and to SECTION_ORDER) when the app grows a new area.
 *
 * Finance and Procurement are two sections rather than one because they are two
 * consoles: opening either replaces the school sidebar with that area's own, and
 * a bursar looking for a supplier payment is not in the same place as one
 * looking for a fee invoice.
 */
export type ActionSection =
  | "Overview"
  | "People"
  | "Academics"
  | "Finance"
  | "Procurement"
  | "Settings"
  | "Data"
  | "Onboarding"
  | "Account";

/**
 * A gate is evaluated against the user's raw permission keys. `null` = always
 * visible.
 * - perm:   holds this one capability
 * - any:    holds at least one of these capabilities
 * - all:    holds every one of these capabilities
 * - module: holds ANY backend key under one of these prefixes (e.g. "school.")
 *           - the one place raw keys are used, matching the sidebar.
 */
export type ActionGate =
  | null
  | { perm: PermissionCode }
  | { any: PermissionCode[] }
  | { all: PermissionCode[] }
  | { module: string[] };

/**
 * What running an action does. Most navigate; a couple invoke a header command
 * that only the header can carry out.
 *
 * The command list is exactly what the account menu in
 * src/components/layout/dashboard-layout.tsx can do from a cold start:
 * - "proxy"  opens the ProxyUserDialog ("view as another user")
 * - "logout" opens the logout confirmation
 * "Exit proxy" is deliberately NOT a command: the header only offers it while
 * an impersonation session is live, and that is runtime state, not a
 * permission, so a gate could not hide the action the rest of the time.
 */
export type ActionRun =
  | { to: string }
  | { command: "proxy" | "logout" | "help" };

export interface ActionDef {
  // Stable id (kebab-case) - the key used by popularity storage, so it must not
  // change once shipped or a user's learned ranking resets.
  id: string;
  label: string;
  aliases: string[];
  section: ActionSection;
  // Sub-section within the section (e.g. "Students") - shown as the row's
  // detail line so an action carries its context without a header.
  group: string;
  kind: "view" | "do";
  gate: ActionGate;
  run: ActionRun;
}

// A scored, permission-passed action ready to render.
export interface ScoredAction {
  action: ActionDef;
  // Coarse relevance bucket (higher = stronger match): 4 exact, 3 prefix,
  // 2 initials/word-prefix, 1 substring. Popularity only reorders *within* a
  // tier, so a weak match can never outrank a strong one.
  tier: number;
  // Popularity score (adaptive pick + frecency) - the within-tier sort key.
  popularity: number;
  // Match strength within the tier - the final deterministic tie-break.
  matchScore: number;
}
