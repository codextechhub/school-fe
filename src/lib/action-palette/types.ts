/**
 * Action palette - the workspace search is an *action* launcher, not a page
 * finder. Every entry is a permission-gated action a user can type
 * ("view students", "enroll student"), and the registry that lists them lives
 * beside this file in registry.ts.
 */

import type { ConsoleNavChild, ConsoleNavGate, ConsoleNavGroup } from "@/components/finance-ui/console-nav";
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
 * - console: that console's menu holds a screen the reader can open, the same
 *           rule that decides whether the sidebar draws its door. Used by the
 *           screens that carry no permission of their own (the dashboards).
 */
export type ActionGate =
  | null
  | { perm: PermissionCode }
  | { any: PermissionCode[] }
  | { required: PermissionCode[]; any: PermissionCode[] }
  | { all: PermissionCode[] }
  | { module: string[] }
  | { console: ConsoleNavGroup[] };

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
/**
 * What a screen needs of the school before any permission counts, exactly as
 * its console sidebar entry declares it: `multiBranch` for a screen about
 * branches dealing with each other, `heldCustody` for one that pays out of
 * money the platform holds for the school.
 */
export type ActionSchoolShape = Pick<ConsoleNavChild, "multiBranch" | "heldCustody"> & {
  /**
   * The job is one the server takes only from a reader who covers the whole
   * school (adding a ledger account, a cost centre, a catalogue item): its key
   * is in `WHOLE_SCHOOL_KEYS`, and the screen it opens offers it to nobody
   * else.
   */
  wholeSchool?: true;
};

/**
 * The school the reader works in, as the console sidebar reads it: whether it
 * runs more than one branch, and its custody mode. Unknown is answered the way
 * the sidebar answers it: `multiBranch` false, custody "UNKNOWN", and both
 * hide the screens that need them.
 */
export type PaletteSchool = Pick<ConsoleNavGate, "multiBranch" | "custody"> & {
  /**
   * Whether the reader covers the whole school, as `useReaderReach` answers
   * it (a reader pinned to a one-branch school's only branch does). Only an
   * explicit `false` hides a whole-school job: the session carries the reach,
   * so a header that knows the reader always says, and a caller that does not
   * track reach is not asking that question.
   */
  wholeSchool?: boolean;
};

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
  /**
   * The plan module this action needs, when it differs from its address's
   * (see plan.ts). One settings address can hold parts sold separately.
   */
  capability?: string;
  /**
   * The school shape the screen needs (see ActionSchoolShape). Copied from the
   * console nav entry, so an action is offered at exactly the schools whose
   * sidebar offers its screen.
   */
  schoolShape?: ActionSchoolShape;
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
