import { capabilityForPath } from "@/lib/action-palette/plan";
import { resolvePermissionKey } from "@/permissions";

import type { GuideAudience, GuideRecord } from "./types";

/**
 * Who is reading: the permission keys their role holds, and what the school's
 * plan reaches. Built by `useGuideReader`; every discovery function takes one,
 * so no screen can filter guides by role and forget the plan.
 */
export type GuideReader = {
  permissions: readonly string[];
  hasCapability: (key: string | null | undefined) => boolean;
};

/**
 * The role cards on the guides home. They filter by who a guide is written
 * for; they never widen what a reader may open, which `canDiscoverGuide`
 * decides from their role and the school's plan.
 */
export const GUIDE_ROLE_ENTRY_POINTS = [
  { id: "all-users", label: "Everyone", description: "Signing in, finding your way around, and getting help." },
  { id: "school-administrator", label: "School administrator", description: "Setup, branches, roles, and the running of the whole school." },
  { id: "branch-administrator", label: "Branch administrator", description: "Day-to-day running of one branch: its students, staff, and classes." },
  { id: "admissions-and-records", label: "Admissions and records", description: "Applicants, enrolment, class placement, guardians, and promotion." },
  { id: "teacher", label: "Teacher", description: "Your classes, subjects, timetable, and the school calendar." },
  { id: "finance-officer", label: "Bursar and finance", description: "Fees, invoices, receipts, expenses, payroll, and reports." },
  { id: "procurement-officer", label: "Procurement and stores", description: "Requisitions, purchase orders, vendors, and stock." },
  { id: "approver", label: "Approver", description: "Approval queues, decisions, delegations, and tracking." },
] as const satisfies readonly { id: GuideAudience; label: string; description: string }[];

/**
 * Whether a reader may open a guide: their role passes its `access` rule, and
 * the school's plan reaches at least one of the screens it is about. A guide
 * to exam scheduling at a school without that module describes a screen its
 * readers will never see, so it is left out the way the sidebar item is.
 * The plan is read from the same table the search box uses (`capabilityForPath`).
 */
export function canDiscoverGuide(guide: GuideRecord, reader: GuideReader): boolean {
  if (guide.status === "retired") return false;
  if (!guide.routes.some((route) => reader.hasCapability(capabilityForPath(route)))) return false;
  if (guide.access.mode === "authenticated") return true;

  const required = guide.access.permissions.map(resolvePermissionKey);
  return guide.access.mode === "all"
    ? required.every((permission) => reader.permissions.includes(permission))
    : required.some((permission) => reader.permissions.includes(permission));
}

export function visibleGuides(
  guides: readonly GuideRecord[],
  reader: GuideReader,
): GuideRecord[] {
  return guides.filter((guide) => (
    guide.status === "published" && canDiscoverGuide(guide, reader)
  ));
}

export type GuideLandingView = "browse" | "category-results" | "audience-results" | "search-results";

export function guideLandingView({
  category,
  audience,
  query,
}: {
  category: string | null;
  audience: string | null;
  query: string;
}): GuideLandingView {
  if (category) return "category-results";
  if (query.trim()) return "search-results";
  if (audience) return "audience-results";
  return "browse";
}

export function guidesForAudience(
  guides: readonly GuideRecord[],
  audience: GuideAudience | null,
): GuideRecord[] {
  if (!audience) return [...guides];
  return guides.filter((guide) => guide.audiences.includes(audience));
}

export function featuredGuides(guides: readonly GuideRecord[], limit = 6): GuideRecord[] {
  return guides.filter((guide) => guide.featured).slice(0, limit);
}

export function recentlyReviewedGuides(guides: readonly GuideRecord[], limit = 4): GuideRecord[] {
  return [...guides]
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt) || a.title.localeCompare(b.title))
    .slice(0, limit);
}
