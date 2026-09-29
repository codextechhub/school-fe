import type {
  Walkthrough,
  WalkthroughBranchStep,
  WalkthroughContentStep,
  WalkthroughProgress,
  WalkthroughStep,
} from "./types";
import type { GuideRecord } from "../types";
import { routePatternMatches } from "../route-pattern";
import { TERM_TOKEN_PATTERN, TERM_TOKENS } from "../guide-words";
import { routesPath } from "@/routes/routesPath";

const STORAGE_PREFIX = "school-guide-walkthrough";
const PENDING_KEY = `${STORAGE_PREFIX}:pending`;
export const WALKTHROUGH_START_EVENT = "school:walkthrough-start";

export function walkthroughStorageKey(identityKey: string, walkthroughId: string): string {
  return `${STORAGE_PREFIX}:${identityKey}:${walkthroughId}`;
}

export function loadWalkthroughProgress(
  storage: Pick<Storage, "getItem">,
  identityKey: string,
  walkthrough: Walkthrough,
): WalkthroughProgress | null {
  try {
    const raw = storage.getItem(walkthroughStorageKey(identityKey, walkthrough.id));
    if (!raw) return null;
    const progress = JSON.parse(raw) as WalkthroughProgress;
    if (
      progress.walkthroughId !== walkthrough.id
      || progress.guideId !== walkthrough.guideId
      || progress.version !== walkthrough.version
      || !walkthrough.steps.some((step) => step.id === progress.currentStepId)
    ) return null;
    return progress;
  } catch {
    return null;
  }
}

export function saveWalkthroughProgress(
  storage: Pick<Storage, "setItem">,
  identityKey: string,
  progress: WalkthroughProgress,
): void {
  storage.setItem(walkthroughStorageKey(identityKey, progress.walkthroughId), JSON.stringify(progress));
}

export function queueWalkthrough(id: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, id);
  } catch {
    // Navigation still works when browser storage is unavailable.
  }
}

export function requestWalkthroughStart(id: string): void {
  window.dispatchEvent(new CustomEvent(WALKTHROUGH_START_EVENT, { detail: { id } }));
}

export function consumeQueuedWalkthrough(): string | null {
  try {
    const id = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return id;
  } catch {
    return null;
  }
}

export function walkthroughStepById(
  walkthrough: Walkthrough,
  stepId: string,
): WalkthroughStep | undefined {
  return walkthrough.steps.find((step) => step.id === stepId);
}

export function resolveBranchStep(
  walkthrough: Walkthrough,
  step: WalkthroughBranchStep,
  targetPresent: boolean,
): WalkthroughStep | undefined {
  return walkthroughStepById(walkthrough, targetPresent ? step.whenPresent : step.whenMissing);
}

export function nextContentStep(
  walkthrough: Walkthrough,
  currentStepId: string,
  targetPresent: (target: string) => boolean,
): WalkthroughContentStep | undefined {
  let index = walkthrough.steps.findIndex((step) => step.id === currentStepId);
  if (index < 0) index = 0;
  let candidate: WalkthroughStep | undefined = walkthrough.steps[index];
  const visited = new Set<string>();

  while (candidate?.kind === "branch") {
    if (visited.has(candidate.id)) return undefined;
    visited.add(candidate.id);
    candidate = resolveBranchStep(walkthrough, candidate, targetPresent(candidate.target));
  }
  return candidate as WalkthroughContentStep | undefined;
}

export function followingContentStep(
  walkthrough: Walkthrough,
  currentStepId: string,
  targetPresent: (target: string) => boolean,
): WalkthroughContentStep | undefined {
  const currentIndex = walkthrough.steps.findIndex((step) => step.id === currentStepId);
  if (currentIndex < 0) return nextContentStep(walkthrough, walkthrough.steps[0]?.id ?? "", targetPresent);
  const next = walkthrough.steps[currentIndex + 1];
  if (!next) return undefined;
  return nextContentStep(walkthrough, next.id, targetPresent);
}

/** A target-click step must not advance until the UI it opens is ready. */
export function isFollowingStepReady(
  walkthrough: Walkthrough,
  currentStepId: string,
  targetPresent: (target: string) => boolean,
): boolean {
  const currentIndex = walkthrough.steps.findIndex((step) => step.id === currentStepId);
  const next = walkthrough.steps[currentIndex + 1];
  if (!next) return true;
  if (next.kind === "branch") return targetPresent(next.target);
  return !next.target || targetPresent(next.target);
}

/**
 * Resume drawer and modal walkthroughs at their nearest visible safe opener.
 * Progress can outlive transient UI, so a stored form step is not resumable
 * when the drawer that owns its target has closed.
 */
export function resumableContentStep(
  walkthrough: Walkthrough,
  currentStepId: string,
  targetPresent: (target: string) => boolean,
): WalkthroughContentStep | undefined {
  const desired = nextContentStep(walkthrough, currentStepId, targetPresent);
  if (!desired?.target || targetPresent(desired.target)) return desired;

  const desiredIndex = walkthrough.steps.findIndex((step) => step.id === desired.id);
  const desiredRoute = walkthroughStepRoute(walkthrough, desired.id);
  for (let index = desiredIndex - 1; index >= 0; index -= 1) {
    const candidate = walkthrough.steps[index];
    if (
      candidate.kind === "branch"
      || candidate.advance !== "target-click"
      || !candidate.target
      || walkthroughStepRoute(walkthrough, candidate.id) !== desiredRoute
    ) continue;
    if (targetPresent(candidate.target)) return candidate;
  }
  return desired;
}

export function walkthroughStepRoute(walkthrough: Walkthrough, stepId: string): string {
  let route = walkthrough.route;
  for (const candidate of walkthrough.steps) {
    if (candidate.kind !== "branch" && candidate.route) route = candidate.route;
    if (candidate.id === stepId) break;
  }
  return route;
}

/**
 * Whether the reader is on the screen a step belongs to.
 *
 * A step's route may be a pattern (`/students/:id`): the tour reaches a record
 * page by the reader clicking into it, since no step can name a record's id,
 * and any record then counts.
 */
export function isOnStepRoute(walkthrough: Walkthrough, stepId: string, pathname: string): boolean {
  return routePatternMatches(walkthroughStepRoute(walkthrough, stepId), pathname);
}

/** The route of the next content step after this one, if there is one. */
export function followingStepRoute(walkthrough: Walkthrough, stepId: string): string | undefined {
  const index = walkthrough.steps.findIndex((step) => step.id === stepId);
  const next = walkthrough.steps.slice(index + 1).find((step) => step.kind !== "branch");
  return next ? walkthroughStepRoute(walkthrough, next.id) : undefined;
}

/** Return completed walkthroughs to the published article that launched them. */
export function walkthroughCompletionRoute(
  walkthrough: Walkthrough,
  guides: readonly Pick<GuideRecord, "id" | "slug" | "status">[],
): string {
  const guide = guides.find((candidate) => (
    candidate.id === walkthrough.guideId && candidate.status === "published"
  ));
  return guide
    ? routesPath.PROTECTED.SUPPORT.GUIDE_DETAIL_SLUG(guide.slug)
    : routesPath.PROTECTED.SUPPORT.GUIDES;
}

const KNOWN_TOKENS: ReadonlySet<string> = new Set(TERM_TOKENS);

/**
 * Every broken contract in the walkthroughs, as readable lines.
 *
 * A step's title and body may carry the school-word placeholders
 * (`{term}`, `{Term}`, `{terms}`, `{Terms}`); any other `{...}` is a typo that
 * would reach the reader as written.
 */
export function validateWalkthroughs(
  walkthroughs: readonly Walkthrough[],
  guideIds: ReadonlySet<string>,
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const targets = new Set<string>();
  for (const walkthrough of walkthroughs) {
    if (ids.has(walkthrough.id)) issues.push(`Duplicate walkthrough ID: ${walkthrough.id}`);
    ids.add(walkthrough.id);
    if (!guideIds.has(walkthrough.guideId)) issues.push(`Missing guide for ${walkthrough.id}`);
    if (!walkthrough.route.startsWith("/")) issues.push(`Invalid route for ${walkthrough.id}`);
    if (walkthrough.route.includes(":")) issues.push(`Start route names a record for ${walkthrough.id}`);
    if (walkthrough.version < 1) issues.push(`Invalid version for ${walkthrough.id}`);
    const stepIds = new Set(walkthrough.steps.map((step) => step.id));
    if (stepIds.size !== walkthrough.steps.length) issues.push(`Duplicate step ID in ${walkthrough.id}`);
    for (const step of walkthrough.steps) {
      if (step.kind === "branch") {
        if (!stepIds.has(step.whenPresent) || !stepIds.has(step.whenMissing)) {
          issues.push(`Invalid branch in ${walkthrough.id}:${step.id}`);
        }
      } else if (step.search && !step.search.startsWith("?")) {
        issues.push(`Invalid search in ${walkthrough.id}:${step.id}`);
      } else if (step.route && !step.route.startsWith("/")) {
        issues.push(`Invalid step route in ${walkthrough.id}:${step.id}`);
      }
      if (step.kind !== "branch") {
        const unknown = `${step.title} ${step.body}`
          .match(TERM_TOKEN_PATTERN)
          ?.filter((token) => !KNOWN_TOKENS.has(token));
        if (unknown?.length) issues.push(`Unknown placeholder ${unknown[0]} in ${walkthrough.id}:${step.id}`);
      }
      if (step.target) {
        const contract = `${walkthrough.id}:${step.target}`;
        if (targets.has(contract)) continue;
        targets.add(contract);
      }
    }
  }
  return issues;
}
