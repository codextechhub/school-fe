/**
 * Pure helpers for the organogram views: no network, no React.
 *
 * The server builds the post tree. Everything here is derived from it: the
 * people view, the viewer's own reporting path, the unit filter and the
 * expand/collapse bookkeeping.
 */

import { calendarDayOf, formatDate, type DisplayPrefs } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import type {
  CurrentOrganogramAssignment,
  OrganogramNode,
  OrgNodeKind,
  StaffHolder,
} from "@/redux/services/staff/organogram-types";

/** Rows from a response that may not have arrived, or may not be a list: none. */
export function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ── Avatar colour (deterministic by id) ──────────────────────────────────────

const AV_PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-cyan-100 text-cyan-700",
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  return AV_PALETTE[h % AV_PALETTE.length];
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const KIND_LABEL: Record<OrgNodeKind, string> = {
  DIVISION: "Division",
  DEPARTMENT: "Department",
  TEAM: "Team",
};

// ── Formatters ────────────────────────────────────────────────────────────────

/** A date or timestamp in the school's style; "-" for nothing or junk. */
export function fmtDate(
  value: string | null | undefined,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  if (!value || !calendarDayOf(value, prefs.timeZone)) return "-";
  return formatDate(value, prefs);
}

/** Acting holders, as `${userId}@${positionId}`. */
export function buildActingSet(assignments: CurrentOrganogramAssignment[]): Set<string> {
  const s = new Set<string>();
  for (const a of assignments) {
    if (a.is_acting) s.add(`${a.staff.id}@${a.position.id}`);
  }
  return s;
}

/**
 * The people view, derived from the post tree.
 *
 * A person card is the holder of a post, and its children are the holders of
 * the posts that report to it. An empty post draws no card, because the chart
 * shows people and an unfilled post is not one; its reports are lifted to the
 * nearest filled post above, so nobody drops off the chart because the post
 * over them is vacant.
 */
export interface PeopleNode {
  kind: "person";
  user: StaffHolder;
  positionId: number;
  positionTitle: string;
  positionCode: string;
  departmentName: string | null;
  isActing: boolean;
  children: PeopleNode[];
}

function personFor(u: StaffHolder, node: OrganogramNode, actingSet: Set<string>): PeopleNode {
  return {
    kind: "person",
    user: u,
    positionId: node.id,
    positionTitle: node.title,
    positionCode: node.code,
    departmentName: node.org_node?.name ?? null,
    isActing: actingSet.has(`${u.id}@${node.id}`),
    children: peopleChildrenOf(node, actingSet),
  };
}

function peopleChildrenOf(node: OrganogramNode, actingSet: Set<string>): PeopleNode[] {
  const out: PeopleNode[] = [];
  for (const child of node.direct_reports) {
    if (child.holders.length) {
      for (const u of child.holders) out.push(personFor(u, child, actingSet));
    } else {
      out.push(...peopleChildrenOf(child, actingSet));
    }
  }
  return out;
}

/**
 * The post tree with unfilled posts taken out, for drawing.
 *
 * The chart is the school as it is staffed, not its establishment: vacancies
 * and headcount live on Manage. A removed post lifts its own reports to the
 * nearest filled post above, exactly as the people view does, so a vacant
 * head of section never hides the section.
 */
export function pruneVacantPositions(tree: OrganogramNode[]): OrganogramNode[] {
  const out: OrganogramNode[] = [];
  for (const node of tree) {
    const kept = pruneVacantPositions(node.direct_reports);
    if (node.holders.length) {
      out.push({ ...node, direct_reports: kept });
    } else {
      out.push(...kept);
    }
  }
  return out;
}

export function buildPeopleTree(tree: OrganogramNode[], actingSet: Set<string>): PeopleNode[] {
  const roots: PeopleNode[] = [];
  for (const node of tree) {
    if (node.holders.length) {
      for (const u of node.holders) roots.push(personFor(u, node, actingSet));
    } else {
      roots.push(...peopleChildrenOf(node, actingSet));
    }
  }
  return roots;
}

/** Everyone under these children, directly or indirectly. */
export function countAllReports(children: PeopleNode[]): number {
  let n = 0;
  for (const c of children) {
    n += 1 + countAllReports(c.children);
  }
  return n;
}

export function collectPeopleIds(nodes: PeopleNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    acc.push(n.user.id);
    collectPeopleIds(n.children, acc);
  }
  return acc;
}

/**
 * Person ids from a root down to the matched person, inclusive.
 *
 * Expanding exactly these reveals the viewer's own reporting line, and their
 * own reports, while every other branch of the chart stays closed.
 */
export function findPeoplePathToUser(
  nodes: PeopleNode[],
  match: (u: StaffHolder) => boolean,
): string[] | null {
  for (const n of nodes) {
    if (match(n.user)) return [n.user.id];
    const below = findPeoplePathToUser(n.children, match);
    if (below) return [n.user.id, ...below];
  }
  return null;
}

/** Post ids from a root down to the post the matched person holds, inclusive. */
export function findPositionPathToUser(
  tree: OrganogramNode[],
  match: (u: StaffHolder) => boolean,
): number[] | null {
  for (const n of tree) {
    if (n.holders.some(match)) return [n.id];
    const below = findPositionPathToUser(n.direct_reports, match);
    if (below) return [n.id, ...below];
  }
  return null;
}

/**
 * The one child to show beneath `current` while the chart is focused on a path.
 *
 * On first load an expanded ancestor reveals only the next card on the
 * viewer's line. Once that ancestor is expanded on purpose the caller ignores
 * this and shows every child.
 */
export function nextFocusedNode<T extends string | number>(
  path: readonly T[],
  current: T,
): T | null {
  const index = path.indexOf(current);
  return index >= 0 && index + 1 < path.length ? path[index + 1] : null;
}

export function collectPositionIds(tree: OrganogramNode[], acc: number[] = []): number[] {
  for (const n of tree) {
    acc.push(n.id);
    collectPositionIds(n.direct_reports, acc);
  }
  return acc;
}

// ── Org unit hierarchy ────────────────────────────────────────────────────────

export interface OrgNodeLike {
  id: number;
  name: string;
  code: string;
  kind: OrgNodeKind;
  parent: { id: number } | null;
}

export type OrgNodeMap = Map<number, OrgNodeLike>;

export function buildOrgNodeMap(nodes: OrgNodeLike[]): OrgNodeMap {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** Every unit id in the subtree rooted at `rootId`, inclusive. */
export function orgNodeDescendantIds(map: OrgNodeMap, rootId: number): Set<number> {
  const out = new Set<number>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const node of map.values()) {
      if (node.parent && out.has(node.parent.id) && !out.has(node.id)) {
        out.add(node.id);
        added = true;
      }
    }
  }
  return out;
}

/**
 * The post tree narrowed to posts in `allowed` units.
 *
 * A kept post keeps its kept descendants, re-parented past any post that was
 * dropped, so the structure inside the chosen unit survives and its top posts
 * surface as roots.
 */
export function pruneTreeByOrgNodes(nodes: OrganogramNode[], allowed: Set<number>): OrganogramNode[] {
  const out: OrganogramNode[] = [];
  for (const n of nodes) {
    const keptChildren = pruneTreeByOrgNodes(n.direct_reports, allowed);
    if (n.org_node && allowed.has(n.org_node.id)) {
      out.push({ ...n, direct_reports: keptChildren });
    } else {
      out.push(...keptChildren);
    }
  }
  return out;
}
