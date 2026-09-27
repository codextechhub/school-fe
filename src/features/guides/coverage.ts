import type { GuideRecord, GuideRisk } from "./types";

export type GuideCoverageTarget = {
  id: string;
  route?: string;
  actionId?: string;
  risk: GuideRisk;
  walkthroughRequired?: boolean;
  walkthroughException?: string;
};

export type GuideCoverageGap = {
  targetId: string;
  kind: "missing-guide" | "missing-walkthrough-or-reason";
};

export type GuideCoverageReport = {
  targetCount: number;
  coveredTargetCount: number;
  publishedGuideCount: number;
  draftGuideCount: number;
  gaps: GuideCoverageGap[];
};

export function buildGuideCoverageReport(
  guides: readonly GuideRecord[],
  targets: readonly GuideCoverageTarget[],
  availableWalkthroughIds?: ReadonlySet<string>,
): GuideCoverageReport {
  const activeGuides = guides.filter((guide) => guide.status !== "retired");
  const gaps: GuideCoverageGap[] = [];
  let coveredTargetCount = 0;

  for (const target of targets) {
    const coveringGuides = activeGuides.filter((guide) =>
      (target.route ? guide.routes.includes(target.route) : true)
      && (target.actionId ? guide.actionIds?.includes(target.actionId) : true),
    );

    if (coveringGuides.length === 0) {
      gaps.push({ targetId: target.id, kind: "missing-guide" });
      continue;
    }

    coveredTargetCount += 1;
    const walkthroughExpected = target.walkthroughRequired ?? target.risk === "high";
    if (
      walkthroughExpected
      && !coveringGuides.some((guide) => (
        guide.walkthroughId
        && (!availableWalkthroughIds || availableWalkthroughIds.has(guide.walkthroughId))
      ))
      && !target.walkthroughException?.trim()
    ) {
      gaps.push({ targetId: target.id, kind: "missing-walkthrough-or-reason" });
    }
  }

  return {
    targetCount: targets.length,
    coveredTargetCount,
    publishedGuideCount: guides.filter((guide) => guide.status === "published").length,
    draftGuideCount: guides.filter((guide) => guide.status === "draft").length,
    gaps,
  };
}
