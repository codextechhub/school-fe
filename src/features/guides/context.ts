import type { GuideRecord } from "./types";
import { canDiscoverGuide, type GuideReader } from "./discovery";
import { GUIDE_ROUTE_PATTERNS } from "./route-catalog";
import { routePatternMatches, routeSegments } from "./route-pattern";

/**
 * What the help panel knows about the screen it was opened on: the pattern the
 * address matched, a name for that part of the product, and the guides the
 * reader may open that were written for it.
 */
export type GuidePageContext = {
  routePattern?: string;
  productArea: string;
  guides: GuideRecord[];
  troubleshooting: GuideRecord[];
  walkthroughs: GuideRecord[];
};

const cleanPath = (value: string) => {
  const pathname = value.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
};

const segments = routeSegments;

export { routePatternMatches };

/**
 * The catalogued pattern an address belongs to. The pattern with the most
 * literal segments wins, the way the router ranks them, so
 * `/students/guardians` resolves to the guardians list and not to a student
 * profile called "guardians".
 */
export function resolveGuideRoutePattern(pathname: string): string | undefined {
  return [...GUIDE_ROUTE_PATTERNS]
    .sort((a, b) => {
      const staticDifference = segments(b).filter((part) => !part.startsWith(":")).length
        - segments(a).filter((part) => !part.startsWith(":")).length;
      return staticDifference || b.length - a.length;
    })
    .find((pattern) => routePatternMatches(pattern, pathname));
}

const PRODUCT_AREA_LABELS: Record<string, string> = {
  accounts: "Account access",
  "academic-calendar": "Academic calendar",
  "academic-structure": "Academic structure",
  branches: "Branches",
  "data-imports": "Data imports",
  export: "Exports",
  finance: "Finance",
  notifications: "Notifications",
  onboarding: "School setup",
  overview: "Overview",
  procurement: "Procurement",
  roles: "Roles",
  staff: "Staff",
  students: "Students",
  support: "Support",
  timetables: "Timetables",
  workflow: "Approvals",
};

/** A reader-facing name for the part of the product a pattern sits in. */
function routeProductArea(pattern: string | undefined): string {
  const firstSegment = segments(pattern ?? "")[0];
  return (firstSegment && PRODUCT_AREA_LABELS[firstSegment]) || "your current screen";
}

export function contextualGuideContext(
  guides: readonly GuideRecord[],
  pathname: string,
  reader: GuideReader,
): GuidePageContext {
  const routePattern = resolveGuideRoutePattern(pathname);
  const articleSlug = cleanPath(pathname).match(/^\/support\/guides\/([^/]+)$/)?.[1];
  const permitted = guides.filter((guide) => (
    guide.status === "published" && canDiscoverGuide(guide, reader)
  ));
  const pageGuides = permitted.filter((guide) => (
    articleSlug
      ? guide.slug === decodeURIComponent(articleSlug)
      : routePattern !== undefined && guide.routes.includes(routePattern)
  ));
  const relatedIds = new Set(pageGuides.flatMap((guide) => [...(guide.relatedGuideIds ?? [])]));
  const directTroubleshooting = pageGuides.filter(
    (guide) => guide.category === "troubleshooting",
  );
  const relatedTroubleshooting = permitted.filter((guide) => (
    guide.category === "troubleshooting"
    && !pageGuides.includes(guide)
    && relatedIds.has(guide.id)
  ));

  return {
    routePattern,
    productArea: routeProductArea(routePattern),
    guides: pageGuides.filter((guide) => guide.category !== "troubleshooting"),
    troubleshooting: [...directTroubleshooting, ...relatedTroubleshooting],
    walkthroughs: pageGuides.filter((guide) => Boolean(guide.walkthroughId)),
  };
}

/**
 * The guide a ticket raised from this screen should name, or undefined.
 *
 * Only the id travels, and only one the ticket API will accept: lowercase,
 * dots and hyphens. The API refuses the whole ticket over a bad value, so a
 * guide id that does not fit is dropped rather than sent.
 */
export function ticketGuideId(context: GuidePageContext): string | undefined {
  const id = (context.guides[0] ?? context.troubleshooting[0])?.id;
  return id && /^[a-z0-9][a-z0-9.-]{0,119}$/.test(id) ? id : undefined;
}
