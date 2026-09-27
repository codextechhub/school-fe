import type { ComponentType } from "react";

import type { PermissionCode } from "@/permissions";

export const GUIDE_CATEGORY_IDS = [
  "getting-started",
  "school-setup",
  "students-and-guardians",
  "staff",
  "academics",
  "calendar-and-timetables",
  "roles-and-permissions",
  "approvals-and-workflow",
  "finance-and-payments",
  "procurement-and-inventory",
  "data-imports-and-exports",
  "troubleshooting",
] as const;

export type GuideCategoryId = (typeof GUIDE_CATEGORY_IDS)[number];

/**
 * Who a guide is written for. A label for browsing, never a gate: what a
 * reader may open is decided by `access`, against the permissions they hold.
 */
export const GUIDE_AUDIENCES = [
  "all-users",
  "school-administrator",
  "branch-administrator",
  "admissions-and-records",
  "teacher",
  "finance-officer",
  "procurement-officer",
  "approver",
] as const;

export type GuideAudience = (typeof GUIDE_AUDIENCES)[number];

export type GuideRisk = "low" | "medium" | "high";

export type GuidePermissionRule =
  | { mode: "authenticated"; permissions: readonly [] }
  | { mode: "any" | "all"; permissions: readonly PermissionCode[] };

export type GuideArticleModule = {
  default: ComponentType;
};

export type GuideArticleSection = {
  id: string;
  title: string;
};

type GuideRecordBase = {
  /**
   * Lowercase, dots and hyphens, and always `school.`-prefixed. Analytics and
   * ticket context carry it to a platform-wide store that Console writes to
   * as well, so the prefix is what keeps the two apps' guides apart there.
   */
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: GuideCategoryId;
  tags: readonly string[];
  aliases: readonly string[];
  audiences: readonly GuideAudience[];
  routes: readonly string[];
  actionIds?: readonly string[];
  access: GuidePermissionRule;
  walkthroughId?: string;
  owner: string;
  reviewedAt: string;
  risk: GuideRisk;
  featured?: boolean;
  primaryRoute?: string;
  sections?: readonly GuideArticleSection[];
  relatedGuideIds?: readonly string[];
  estimatedMinutes?: number;
};

export type GuideRecord = GuideRecordBase & (
  | {
      status: "draft";
      article?: () => Promise<GuideArticleModule>;
    }
  | {
      status: "published";
      article: () => Promise<GuideArticleModule>;
    }
  | {
      status: "retired";
      article?: () => Promise<GuideArticleModule>;
      replacedBy?: string;
    }
);

export type GuideCategory = {
  id: GuideCategoryId;
  title: string;
  description: string;
  order: number;
};

export type GuideValidationIssue = {
  code:
    | "duplicate-id"
    | "duplicate-slug"
    | "invalid-action"
    | "invalid-audience"
    | "invalid-category"
    | "invalid-date"
    | "invalid-id"
    | "invalid-permissions"
    | "invalid-route"
    | "invalid-section"
    | "missing-article"
    | "missing-owner"
    | "missing-replacement"
    | "missing-related-guide"
    | "missing-walkthrough"
    | "missing-route";
  guideId: string;
  message: string;
};

export type GuideMatchKind = "title" | "alias" | "prefix" | "content";

export type ScoredGuide = {
  guide: GuideRecord;
  matchKind: GuideMatchKind;
  score: number;
};
