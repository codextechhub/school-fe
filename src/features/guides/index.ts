export { GUIDE_CATEGORIES } from "./categories";
export {
  contextualGuideContext,
  resolveGuideRoutePattern,
  routePatternMatches,
  ticketGuideId,
} from "./context";
export type { GuidePageContext } from "./context";
export { buildGuideCoverageReport } from "./coverage";
export type { GuideCoverageGap, GuideCoverageReport, GuideCoverageTarget } from "./coverage";
export {
  canDiscoverGuide,
  featuredGuides,
  guideLandingView,
  GUIDE_ROLE_ENTRY_POINTS,
  guidesForAudience,
  recentlyReviewedGuides,
  visibleGuides,
} from "./discovery";
export type { GuideLandingView, GuideReader } from "./discovery";
export { useGuideReader } from "./use-guide-reader";
export { GUIDE_REGISTRY } from "./registry";
export { GUIDE_COVERAGE_ROUTE_PATTERNS, GUIDE_ROUTE_PATTERNS, GUIDE_ROUTE_PATTERN_SET } from "./route-catalog";
export { searchGuides } from "./search";
export { validateGuideRegistry } from "./validate";
export { WALKTHROUGH_REGISTRY, findWalkthrough } from "./walkthroughs/registry";
export { useWalkthrough } from "./walkthroughs/context";
export { queueWalkthrough, requestWalkthroughStart, validateWalkthroughs } from "./walkthroughs/engine";
export type { Walkthrough, WalkthroughProgress, WalkthroughStep } from "./walkthroughs/types";
export type {
  GuideArticleModule,
  GuideArticleSection,
  GuideAudience,
  GuideCategory,
  GuideCategoryId,
  GuidePermissionRule,
  GuideRecord,
  GuideRisk,
  GuideMatchKind,
  ScoredGuide,
  GuideValidationIssue,
} from "./types";
