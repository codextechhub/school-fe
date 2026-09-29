import { unknownTermTokens } from "./guide-words";
import { GUIDE_ROUTE_PATTERN_SET } from "./route-catalog";
import {
  GUIDE_AUDIENCES,
  GUIDE_CATEGORY_IDS,
  type GuideRecord,
  type GuideValidationIssue,
} from "./types";

type ValidationOptions = {
  validActionIds?: ReadonlySet<string>;
  validRoutes?: ReadonlySet<string>;
  validWalkthroughIds?: ReadonlySet<string>;
};

function duplicateValues(values: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates;
}

/**
 * Every broken contract in the guide registry, one issue per problem.
 *
 * Title, summary, section titles, tags and aliases may carry the school-word
 * placeholders (`{term}`, `{Term}`, `{terms}`, `{Terms}`); any other `{...}` is
 * a typo that would reach the reader as written, and is refused.
 */
export function validateGuideRegistry(
  records: readonly GuideRecord[],
  options: ValidationOptions = {},
): GuideValidationIssue[] {
  const issues: GuideValidationIssue[] = [];
  const validRoutes = options.validRoutes ?? GUIDE_ROUTE_PATTERN_SET;
  const validCategories = new Set<string>(GUIDE_CATEGORY_IDS);
  const validAudiences = new Set<string>(GUIDE_AUDIENCES);
  const ids = new Set(records.map((record) => record.id));
  const duplicateIds = duplicateValues(records.map((record) => record.id));
  const duplicateSlugs = duplicateValues(records.map((record) => record.slug));

  for (const record of records) {
    if (!/^school\.[a-z0-9][a-z0-9.-]{0,112}$/.test(record.id)) {
      issues.push({ code: "invalid-id", guideId: record.id, message: `Guide id must be lowercase, dotted and start with "school.": ${record.id}` });
    }
    if (duplicateIds.has(record.id)) {
      issues.push({ code: "duplicate-id", guideId: record.id, message: `Guide id is duplicated: ${record.id}` });
    }
    if (duplicateSlugs.has(record.slug)) {
      issues.push({ code: "duplicate-slug", guideId: record.id, message: `Guide slug is duplicated: ${record.slug}` });
    }
    if (!validCategories.has(record.category)) {
      issues.push({ code: "invalid-category", guideId: record.id, message: `Unknown category: ${record.category}` });
    }
    for (const audience of record.audiences) {
      if (!validAudiences.has(audience)) {
        issues.push({ code: "invalid-audience", guideId: record.id, message: `Unknown audience: ${audience}` });
      }
    }
    if (!record.owner.trim()) {
      issues.push({ code: "missing-owner", guideId: record.id, message: "Guide owner is required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.reviewedAt) || Number.isNaN(Date.parse(`${record.reviewedAt}T00:00:00Z`))) {
      issues.push({ code: "invalid-date", guideId: record.id, message: `Invalid review date: ${record.reviewedAt}` });
    }
    if (record.routes.length === 0) {
      issues.push({ code: "missing-route", guideId: record.id, message: "At least one product route is required" });
    }
    for (const route of record.routes) {
      if (!validRoutes.has(route)) {
        issues.push({ code: "invalid-route", guideId: record.id, message: `Unknown product route: ${route}` });
      }
    }
    if (record.primaryRoute && !record.routes.includes(record.primaryRoute)) {
      issues.push({ code: "invalid-route", guideId: record.id, message: `Primary route is not included in guide routes: ${record.primaryRoute}` });
    }
    const sectionIds = (record.sections ?? []).map((section) => section.id);
    for (const sectionId of sectionIds) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sectionId) || duplicateValues(sectionIds).has(sectionId)) {
        issues.push({ code: "invalid-section", guideId: record.id, message: `Invalid or duplicated article section: ${sectionId}` });
      }
    }
    const worded = [
      record.title,
      record.summary,
      ...(record.sections ?? []).map((section) => section.title),
      ...record.tags,
      ...record.aliases,
    ];
    for (const token of new Set(worded.flatMap(unknownTermTokens))) {
      issues.push({ code: "invalid-placeholder", guideId: record.id, message: `Unknown placeholder ${token}` });
    }
    for (const relatedId of record.relatedGuideIds ?? []) {
      if (relatedId === record.id || !ids.has(relatedId)) {
        issues.push({ code: "missing-related-guide", guideId: record.id, message: `Related guide does not exist or refers to itself: ${relatedId}` });
      }
    }
    if (record.access.mode === "authenticated" && record.access.permissions.length > 0) {
      issues.push({ code: "invalid-permissions", guideId: record.id, message: "Authenticated guides cannot declare permission codes" });
    }
    if (record.access.mode !== "authenticated" && record.access.permissions.length === 0) {
      issues.push({ code: "invalid-permissions", guideId: record.id, message: `${record.access.mode} access requires permission codes` });
    }
    if (record.status === "published" && !record.article) {
      issues.push({ code: "missing-article", guideId: record.id, message: "Published guides require an article loader" });
    }
    if (record.status === "published" && !record.sections?.length) {
      issues.push({ code: "invalid-section", guideId: record.id, message: "Published guides require contents sections" });
    }
    if (record.status === "retired" && record.replacedBy && !ids.has(record.replacedBy)) {
      issues.push({ code: "missing-replacement", guideId: record.id, message: `Replacement guide does not exist: ${record.replacedBy}` });
    }
    if (record.status === "published" && record.walkthroughId && options.validWalkthroughIds && !options.validWalkthroughIds.has(record.walkthroughId)) {
      issues.push({ code: "missing-walkthrough", guideId: record.id, message: `Published guide walkthrough does not exist: ${record.walkthroughId}` });
    }
    if (options.validActionIds) {
      for (const actionId of record.actionIds ?? []) {
        if (!options.validActionIds.has(actionId)) {
          issues.push({ code: "invalid-action", guideId: record.id, message: `Unknown action id: ${actionId}` });
        }
      }
    }
  }

  return issues;
}
