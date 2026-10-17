import { describe, expect, it } from "vitest";
import type { RouteObject } from "react-router";

import { financeRoutes } from "./finance-routes";
import { procurementRoutes } from "./procurement-routes";

/**
 * Which Finance and Procurement screens show the branch switcher under the
 * menu.
 *
 * A screen shows it when the branch picked there decides something on the
 * screen: the rows a list shows, or the branch a new record is raised for. A
 * switcher on any other screen looks as though it narrowed the page while
 * changing nothing. No screen here shows the session switcher, because none of
 * them reads the school year.
 */
function lensesByPath(routes: RouteObject[]): Map<string, string | undefined> {
  const children = routes[0].children ?? [];
  return new Map(children
    .filter((route): route is RouteObject & { path: string } => typeof route.path === "string")
    .map((route) => [route.path, (route.handle as { lenses?: string } | undefined)?.lenses]));
}

function withBranchLens(routes: RouteObject[]): string[] {
  return [...lensesByPath(routes)].filter(([, lenses]) => lenses === "branch").map(([path]) => path);
}

describe("branch switcher on Finance screens", () => {
  const lenses = lensesByPath(financeRoutes);

  it.each([
    "/finance/ledger",
    "/finance/receivables",
    "/finance/receivables/receipts",
    "/finance/collections",
    "/finance/banking",
    "/finance/expenses",
    "/finance/payroll",
    "/finance/inter-branch",
    "/finance/budgets",
    "/finance/payments",
  ])("shows on %s, whose lists or new records follow the branch", (path) => {
    expect(lenses.get(path)).toBe("branch");
  });

  it.each([
    "/finance",
    "/finance/setup",
    "/finance/bank-reconciliation",
    "/finance/reports",
    "/finance/audit",
    "/finance/settings",
  ])("stays off %s, which reads the whole school or asks for the branch itself", (path) => {
    expect(lenses.has(path)).toBe(true);
    expect(lenses.get(path)).toBeUndefined();
  });

  it("marks every section of an area the same way as the area itself", () => {
    const marked = withBranchLens(financeRoutes);
    for (const path of marked.filter((p) => p.split("/").length === 3)) {
      const sections = [...lenses.keys()].filter((p) => p.startsWith(`${path}/`));
      for (const section of sections) expect([section, lenses.get(section)]).toEqual([section, "branch"]);
    }
  });
});

describe("branch switcher on Procurement screens", () => {
  it("shows wherever the list, report or new document follows the branch picked", () => {
    expect(withBranchLens(procurementRoutes).sort()).toEqual([
      "/procurement/analytics",
      "/procurement/analytics/ap-aging",
      "/procurement/analytics/grir",
      "/procurement/analytics/performance",
      "/procurement/analytics/spend",
      "/procurement/goods-receipts",
      "/procurement/inventory",
      "/procurement/inventory/items",
      "/procurement/inventory/locations",
      "/procurement/inventory/movements",
      "/procurement/purchase-orders",
      "/procurement/requisitions",
      "/procurement/sourcing",
      "/procurement/sourcing/quotations",
      "/procurement/sourcing/rfqs",
      "/procurement/vendor-invoices",
      "/procurement/vendor-payments",
    ]);
  });

  it.each(["/procurement", "/procurement/approvals", "/procurement/vendors", "/procurement/contracts", "/procurement/settings"])(
    "stays off %s, which the server cannot narrow by branch",
    (path) => {
      const lenses = lensesByPath(procurementRoutes);
      expect(lenses.has(path)).toBe(true);
      expect(lenses.get(path)).toBeUndefined();
    },
  );
});

describe("session switcher", () => {
  it("shows on no Finance or Procurement screen", () => {
    const all = [...lensesByPath(financeRoutes).values(), ...lensesByPath(procurementRoutes).values()];
    expect(all.filter((lenses) => lenses === "both" || lenses === "session")).toEqual([]);
    const lensFlag = [...(financeRoutes[0].children ?? []), ...(procurementRoutes[0].children ?? [])]
      .filter((route) => (route.handle as { lens?: boolean } | undefined)?.lens);
    expect(lensFlag).toEqual([]);
  });
});
