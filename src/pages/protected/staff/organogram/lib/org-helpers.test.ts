import { describe, expect, it } from "vitest";

import type { OrganogramNode, StaffHolder } from "@/redux/services/staff/organogram-types";
import {
  asArray,
  buildActingSet,
  buildPeopleTree,
  countAllReports,
  findPeoplePathToUser,
  fmtDate,
  nextFocusedNode,
  orgNodeDescendantIds,
  pruneTreeByOrgNodes,
  pruneVacantPositions,
} from "./org-helpers";

describe("fmtDate", () => {
  it("formats date-only and timestamp values without leaking Invalid Date", () => {
    expect(fmtDate("2026-08-21")).toBe("21 Aug 2026");
    expect(fmtDate("2026-08-21T16:30:00Z")).toBe("21 Aug 2026");
    expect(fmtDate("not-a-date")).toBe("-");
    expect(fmtDate(null)).toBe("-");
  });
});

describe("nextFocusedNode", () => {
  it("returns only the next branch on a viewer's initial reporting path", () => {
    const path = [10, 20, 30];

    expect(nextFocusedNode(path, 10)).toBe(20);
    expect(nextFocusedNode(path, 20)).toBe(30);
    expect(nextFocusedNode(path, 30)).toBeNull();
    expect(nextFocusedNode(path, 99)).toBeNull();
  });
});

// ── People tree: empty seats are transparent ─────────────────────────────────

function user(id: string, name: string): StaffHolder {
  return {
    id,
    staff_id: Number(id.slice(1)),
    first_name: name,
    last_name: "",
    full_name: name,
    photo: null,
    job_title: "",
  };
}

function seat(
  id: number,
  title: string,
  holders: StaffHolder[],
  direct_reports: OrganogramNode[] = [],
  orgNodeId: number | null = null,
): OrganogramNode {
  return {
    id,
    title,
    code: `P${id}`,
    org_node: orgNodeId === null ? null : { id: orgNodeId, name: `Unit ${orgNodeId}`, code: `U${orgNodeId}`, kind: "DEPARTMENT" },
    branch: null,
    holders,
    is_vacant: holders.length === 0,
    direct_reports,
  };
}

describe("buildPeopleTree", () => {
  const principal = user("u1", "Ada Principal");
  const science = user("u2", "Bola Science");
  const teacher = user("u3", "Chidi Teacher");

  it("draws no card for a vacant seat and lifts its reports to the nearest filled manager", () => {
    // Principal -> (vacant Vice Principal) -> Head of Science -> Teacher
    const tree = [
      seat(1, "Principal", [principal], [
        seat(2, "Vice Principal", [], [
          seat(3, "Head of Science", [science], [seat(4, "Teacher", [teacher])]),
        ]),
      ]),
    ];

    const roots = buildPeopleTree(tree, new Set());

    expect(roots).toHaveLength(1);
    expect(roots[0].user.id).toBe("u1");
    // The empty Vice Principal seat contributes no node of its own...
    expect(roots[0].children.map((c) => c.user.id)).toEqual(["u2"]);
    // ...and nobody below it is lost.
    expect(roots[0].children[0].children.map((c) => c.user.id)).toEqual(["u3"]);
    expect(countAllReports(roots[0].children)).toBe(2);
  });

  it("promotes the reports of a vacant root to roots rather than dropping them", () => {
    const tree = [seat(1, "Principal", [], [seat(2, "Head of Science", [science])])];

    const roots = buildPeopleTree(tree, new Set());

    expect(roots.map((r) => r.user.id)).toEqual(["u2"]);
  });

  it("keeps a fully vacant branch out of the chart entirely", () => {
    const tree = [seat(1, "Principal", [principal], [seat(2, "Vice Principal", [])])];

    const roots = buildPeopleTree(tree, new Set());

    expect(roots[0].children).toEqual([]);
  });
});

describe("pruneVacantPositions", () => {
  const principal = user("u1", "Ada Principal");
  const science = user("u2", "Bola Science");

  it("drops an unfilled seat and reparents its reports to the filled seat above", () => {
    const tree = [
      seat(1, "Principal", [principal], [
        seat(2, "Vice Principal", [], [seat(3, "Head of Science", [science])]),
      ]),
    ];

    const pruned = pruneVacantPositions(tree);

    expect(pruned.map((n) => n.id)).toEqual([1]);
    expect(pruned[0].direct_reports.map((n) => n.id)).toEqual([3]);
  });

  it("leaves a fully staffed tree untouched", () => {
    const tree = [seat(1, "Principal", [principal], [seat(2, "Head of Science", [science])])];

    const pruned = pruneVacantPositions(tree);

    expect(pruned[0].direct_reports.map((n) => n.id)).toEqual([2]);
  });

  it("removes a branch that is vacant all the way down", () => {
    const tree = [
      seat(1, "Principal", [principal], [seat(2, "Vice Principal", [], [seat(3, "Bursar", [])])]),
    ];

    const pruned = pruneVacantPositions(tree);

    expect(pruned[0].direct_reports).toEqual([]);
  });
});

describe("asArray", () => {
  it("reads the empty object the backend sends for an empty list as no rows", () => {
    expect(asArray({})).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
    expect(asArray([1, 2])).toEqual([1, 2]);
  });
});

describe("buildActingSet", () => {
  it("marks only the post a person is acting in, not every post they hold", () => {
    const bola = user("u2", "Bola Science");
    const acting = buildActingSet([
      { staff: bola, position: { id: 7, title: "Vice Principal", code: "P7", org_node: null }, is_acting: true },
      { staff: bola, position: { id: 3, title: "Head of Science", code: "P3", org_node: null }, is_acting: false },
    ]);

    expect(acting.has("u2@7")).toBe(true);
    expect(acting.has("u2@3")).toBe(false);
  });
});

describe("findPeoplePathToUser", () => {
  it("returns the viewer's own line from the top of the school down to them", () => {
    const tree = [
      seat(1, "Principal", [user("u1", "Ada Principal")], [
        seat(2, "Head of Primary", [user("u2", "Bola Adeyemi")], [
          seat(3, "Class Teacher", [user("u3", "Tunde Okafor")]),
        ]),
        seat(4, "Bursar", [user("u4", "Ngozi Bursar")]),
      ]),
    ];

    const roots = buildPeopleTree(tree, new Set());

    expect(findPeoplePathToUser(roots, (u) => u.id === "u3")).toEqual(["u1", "u2", "u3"]);
    expect(findPeoplePathToUser(roots, (u) => u.id === "u9")).toBeNull();
  });
});

describe("pruneTreeByOrgNodes", () => {
  it("keeps a unit's posts and lifts them past posts outside it", () => {
    const tree = [
      seat(1, "Principal", [user("u1", "Ada Principal")], [
        seat(2, "Head of Primary", [user("u2", "Bola Adeyemi")], [
          seat(3, "Class Teacher", [user("u3", "Tunde Okafor")], [], 20),
        ], 20),
        seat(4, "Bursar", [user("u4", "Ngozi Bursar")], [], 30),
      ], 10),
    ];
    const units = new Map([
      [10, { id: 10, name: "School", code: "U10", kind: "DIVISION" as const, parent: null }],
      [20, { id: 20, name: "Primary", code: "U20", kind: "DEPARTMENT" as const, parent: { id: 10 } }],
      [30, { id: 30, name: "Accounts", code: "U30", kind: "DEPARTMENT" as const, parent: { id: 10 } }],
    ]);

    const primary = pruneTreeByOrgNodes(tree, orgNodeDescendantIds(units, 20));

    expect(primary.map((n) => n.id)).toEqual([2]);
    expect(primary[0].direct_reports.map((n) => n.id)).toEqual([3]);
    expect(orgNodeDescendantIds(units, 10)).toEqual(new Set([10, 20, 30]));
  });
});
