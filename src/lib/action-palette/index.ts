/**
 * Barrel for the action palette engine. The engine is pure: no React, no
 * imports from components, so every rule in here is unit testable on its own.
 *
 * The registry of actions lives in ./registry.
 */
export { ACTIONS, LIVE_ONLY_ACTION_IDS, PENDING_ONLY_ACTION_IDS } from "./registry";
export { consoleActions, consoleActionId } from "./console-actions";
export type { ConsoleSource } from "./console-actions";

export { scoreAction, TIER } from "./match";
export type { MatchResult } from "./match";
export { loadPopularity, loadFrecencyScores, recordPick } from "./popularity";
export type { PopularityModel } from "./popularity";
export { passesActionGate, filterActionsForPermissions } from "./gate";
export type { ActionDef, ActionSection, ScoredAction, ActionRun, ActionGate } from "./types";

import type { ActionSection, ScoredAction } from "./types";

// Fixed section order for the grouped, expanded results list - stable ordering
// reads more scannably than relevance-ordered group headers. It follows the
// sidebar top-to-bottom, with the two non-navigation sections last.
export const SECTION_ORDER: ActionSection[] = [
  "Overview",
  "People",
  "Academics",
  "Finance",
  "Procurement",
  "Settings",
  "Data",
  "Onboarding",
  "Account",
];

export interface SectionGroup {
  section: ActionSection;
  items: ScoredAction[];
}

/** Group ranked results by section in fixed order, preserving relevance order
 *  within each group. Empty sections are omitted. */
export function groupBySection(results: ScoredAction[]): SectionGroup[] {
  return SECTION_ORDER.map((section) => ({
    section,
    items: results.filter((r) => r.action.section === section),
  })).filter((g) => g.items.length > 0);
}
