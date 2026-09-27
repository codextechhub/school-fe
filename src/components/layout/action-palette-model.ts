/**
 * The palette's rules, with no React in them.
 *
 * AppSearch is the only consumer, but the rules live here rather than inside
 * the component for one reason: they are the part that can be wrong. Which
 * actions a pending school may see, which identity a gate is judged against,
 * and what beats what in the ordering are all decisions with a right answer,
 * and a decision with a right answer should be testable without mounting a
 * dialog. The engine in src/lib/action-palette does the scoring; this file
 * decides who is allowed to see what, and in what order it lands on screen.
 */

import {
  groupBySection,
  LIVE_ONLY_ACTION_IDS,
  PENDING_ONLY_ACTION_IDS,
  passesActionGate,
  scoreAction,
  type ActionDef,
  type PopularityModel,
  type ScoredAction,
  type SectionGroup,
} from "@/lib/action-palette";
import { capabilityForPath } from "@/lib/action-palette/plan";

/**
 * Anywhere in the app can ask the header to put the cursor in the search box.
 * An event keeps the caller decoupled from the header: AppSearch owns the
 * input and its dropdown, so it stays the only place that touches them.
 */
export const ACTION_PALETTE_OPEN_EVENT = "action-palette:open";

export function requestActionPaletteOpen(): void {
  window.dispatchEvent(new Event(ACTION_PALETTE_OPEN_EVENT));
}

/** How many rows the collapsed list shows before the "show all" row appears. */
export const COLLAPSED_COUNT = 5;

/**
 * ── Readiness ────────────────────────────────────────────────────────────────
 *
 * Readiness is tenant state, not a capability, so the registry records it as
 * two id lists rather than as a gate (see the note at the foot of registry.ts).
 * The two lists are not symmetrical, and they should not be:
 *
 * - LIVE_ONLY is load-bearing. A pending school reaches onboarding and nothing
 *   else: DashboardLayout draws the "opens at go-live" wall over every other
 *   page and the server answers 403 behind it. Offering "View students" to a
 *   school still being set up sends the reader to that wall, so these are
 *   dropped while the tenant is pending.
 *
 * - PENDING_ONLY is tidiness. These screens keep working after go-live; the
 *   sidebar simply stops drawing them, and the palette follows the sidebar so
 *   a live school is not offered a setup checklist it has finished.
 *
 * ALWAYS_AVAILABLE is the exception the second rule needs. Get Help is a
 * support form, and a support form that disappears the moment a school goes
 * live is a defect rather than a rule: the head teacher at Brightfield whose
 * first live term-fee run comes out wrong would have no way left to say so,
 * because the header's Headset button only renders on onboarding routes. So it
 * stays reachable in both states.
 */
const ALWAYS_AVAILABLE_ACTION_IDS: readonly string[] = ["get-help"];

/**
 * Sets, not the arrays themselves. This runs once per action per render of the
 * dropdown, and LIVE_ONLY went from five entries to one per closed screen when
 * Finance and Procurement joined the registry - a linear scan of that, eighty
 * times, on every keystroke.
 */
const ALWAYS_AVAILABLE = new Set(ALWAYS_AVAILABLE_ACTION_IDS);
const LIVE_ONLY = new Set(LIVE_ONLY_ACTION_IDS);
const PENDING_ONLY = new Set(PENDING_ONLY_ACTION_IDS);

export function isAvailableAtReadiness(actionId: string, tenantIsPending: boolean): boolean {
  if (ALWAYS_AVAILABLE.has(actionId)) return true;
  return tenantIsPending ? !LIVE_ONLY.has(actionId) : !PENDING_ONLY.has(actionId);
}

// ── Identity ─────────────────────────────────────────────────────────────────

export interface PaletteIdentity {
  /** Keys of the identity in effect - the target's during a proxy session. */
  permissions: readonly string[];
  /** Keys of the human who signed in - unchanged by a proxy session. */
  actorPermissions: readonly string[];
}

/**
 * Which permission set an action's gate is judged against.
 *
 * Navigation is judged by the identity in effect: while Mrs Adeyemi proxies as
 * a branch admin she should be offered exactly the branch admin's screens,
 * because those are the screens the server will actually open for her.
 *
 * The header commands are the opposite case. "Proxy user" mirrors the account
 * menu, which DashboardLayout gates on the ORIGINAL actor's keys precisely so
 * the control does not vanish mid-session: the branch admin she is proxying as
 * holds no proxy key, so an effective-permission gate would delete the entry
 * from the palette at the exact moment she wants to hop to a third account.
 * Every command action belongs to the actor rather than the borrowed identity,
 * so the rule is written against `run`, not against the id.
 */
function permissionsForAction(action: ActionDef, identity: PaletteIdentity): readonly string[] {
  return "command" in action.run ? identity.actorPermissions : identity.permissions;
}

/**
 * The actions this person may be offered right now: gated on permissions,
 * filtered by what the tenant's readiness actually serves, and by what the
 * school's plan reaches.
 *
 * `hasCapability` is the plan question, asked of the address a navigation
 * action opens (see capabilityForPath). It defaults to "yes" so a caller that
 * does not know the plan yet offers everything the role allows, which is the
 * same optimistic default useCapabilities takes. A header command opens no
 * address and is never plan-gated.
 */
export function availableActions(
  actions: readonly ActionDef[],
  identity: PaletteIdentity,
  tenantIsPending: boolean,
  hasCapability: (key: string | undefined) => boolean = () => true,
): ActionDef[] {
  return actions.filter(
    (action) =>
      isAvailableAtReadiness(action.id, tenantIsPending) &&
      passesActionGate(action.gate, permissionsForAction(action, identity)) &&
      ("command" in action.run ||
        hasCapability(action.capability ?? capabilityForPath(action.run.to))),
  );
}

// ── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Rank `actions` against a typed query.
 *
 * The sort is the engine's contract and must not be reordered: tier first, so
 * a weak match can never outrank a strong one however often it has been
 * picked; popularity second, which is therefore only ever a tie-break WITHIN a
 * tier; then match strength, then the label so the order is deterministic.
 */
export function rankActions(
  actions: readonly ActionDef[],
  query: string,
  popularity: PopularityModel,
): ScoredAction[] {
  const q = query.trim();
  if (!q) return [];
  const scored: ScoredAction[] = [];
  for (const action of actions) {
    const match = scoreAction(action, q);
    if (!match) continue;
    scored.push({
      action,
      tier: match.tier,
      popularity: popularity.scoreFor(action.id, q),
      matchScore: match.score,
    });
  }
  scored.sort(
    (a, b) =>
      b.tier - a.tier ||
      b.popularity - a.popularity ||
      b.matchScore - a.matchScore ||
      a.action.label.localeCompare(b.action.label),
  );
  return scored;
}

/**
 * The list shown before a single character is typed: what this user reaches
 * for most, by decayed frecency.
 *
 * With no history every score is zero and the ties fall back to registry
 * order, which is the sidebar's own top-to-bottom order - a sensible first
 * answer rather than an arbitrary one. Tier is 0 throughout because nothing
 * was matched; these rows were not searched for.
 */
export function rankDefaultActions(
  actions: readonly ActionDef[],
  frecency: Record<string, number>,
): ScoredAction[] {
  return actions
    .map((action, index) => ({
      action,
      index,
      tier: 0,
      popularity: frecency[action.id] ?? 0,
      matchScore: 0,
    }))
    .sort((a, b) => b.popularity - a.popularity || a.index - b.index)
    .map(({ action, tier, popularity, matchScore }) => ({ action, tier, popularity, matchScore }));
}

// ── What the dropdown shows ──────────────────────────────────────────────────

/**
 * One navigable row of the dropdown.
 *
 * The dropdown is a combobox listbox, so the arrow keys walk a flat index and
 * that index has to line up with what the eye sees. The "show all" row is
 * navigable too - it is the only way to reach the rest of a long list from the
 * keyboard - which is why it is a row here rather than a detail of rendering.
 */
export type PaletteRow =
  | { kind: "action"; result: ScoredAction }
  | { kind: "show-all" };

export interface PaletteView {
  /** Section groups to draw once the list is expanded; null while collapsed. */
  groups: SectionGroup[] | null;
  /** Every navigable row, in the order it appears on screen. */
  rows: PaletteRow[];
  /** How many results the ranking produced, before truncation. */
  total: number;
  /** True when the collapsed list is holding some of them back. */
  truncated: boolean;
}

/**
 * Turn ranked results into the rows the dropdown draws AND the order the arrow
 * keys traverse - deliberately one function, because those two orders drifting
 * apart is the bug this shape exists to prevent. Expanding regroups the list
 * by section, so ArrowDown after "Show all" must follow the headers rather
 * than the relevance order the collapsed list used.
 */
export function buildPaletteView(
  results: readonly ScoredAction[],
  expanded: boolean,
): PaletteView {
  const total = results.length;
  // A broad query ("v") can match most of the registry, so the list starts
  // collapsed and the rest waits behind the "show all" row.
  const truncated = !expanded && total > COLLAPSED_COUNT;
  const visible = truncated ? results.slice(0, COLLAPSED_COUNT) : [...results];
  // Collapsed is a flat top-N list, so headers would be noise. Expanded groups
  // by section in the fixed SECTION_ORDER, which reads far more scannably than
  // relevance order once a query lights up four areas of the app at once.
  const groups = expanded ? groupBySection(visible) : null;
  const ordered = groups ? groups.flatMap((group) => group.items) : visible;
  const rows: PaletteRow[] = ordered.map((result) => ({ kind: "action", result }));
  if (truncated) rows.push({ kind: "show-all" });
  return { groups, rows, total, truncated };
}
