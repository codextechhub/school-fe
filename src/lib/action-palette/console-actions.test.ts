/**
 * What the derivation must keep true, not what it happens to produce today.
 *
 * These tests do NOT pin the number of finance screens or the wording of any
 * one of them: @xvs/finance adding a screen or renaming one must not turn a
 * test red, because picking those up without an edit here is the entire reason
 * the actions are derived.
 */

import { describe, expect, it } from "vitest";
import { filterActionsForPermissions } from "./gate";
import {
  schoolFinanceNav,
  schoolProcurementNav,
} from "@/components/layout/console-nav-for-school";
import { FINANCE_MOUNTED_PATHS } from "@/routes/protected/finance-routes";
import { PROCUREMENT_MOUNTED_PATHS } from "@/routes/protected/procurement-routes";
import {
  consoleActions,
  consoleActionId,
  CONSOLE_CREATE_ACTIONS,
  EXTRA_ALIASES,
} from "./console-actions";
import { CONSOLE_ACTIONS } from "./registry";
import type { ConsoleNavGroup } from "@/components/finance-ui/console-nav";

const NAV_URLS = [...schoolFinanceNav, ...schoolProcurementNav]
  .flatMap((group) => group.items)
  .map((item) => item.url);

/**
 * The two halves are checked apart because they promise different things. A
 * view action exists for every screen; a create action exists only where the
 * screen has a drawer to open, and carries a different gate and a different
 * kind of label.
 */
const VIEWS = CONSOLE_ACTIONS.filter((action) => action.kind === "view");
const CREATES = CONSOLE_ACTIONS.filter((action) => action.kind === "do");
const pathOf = (to: string) => to.split("?")[0];

describe("actions derived from a console nav", () => {
  it("offers every screen the sidebar offers, and no others", () => {
    // The whole point: one list, two readers. A screen in the sidebar that the
    // search box has never heard of is the state this replaced.
    const destinations = VIEWS.map((action) =>
      "to" in action.run ? action.run.to : "",
    );
    expect(destinations.sort()).toEqual([...NAV_URLS].sort());
  });

  it("can only reach screens the router mounts", () => {
    for (const action of CONSOLE_ACTIONS) {
      if (!("to" in action.run)) continue;
      const path = pathOf(action.run.to);
      const mounted =
        FINANCE_MOUNTED_PATHS.has(path) || PROCUREMENT_MOUNTED_PATHS.has(path);
      expect(mounted, action.run.to).toBe(true);
    }
  });

  it("leads every label with a verb the matcher expands", () => {
    // A bare "Payroll" is reached by typing "payroll" and nothing else. With the
    // verb in front, "open payroll", "show payroll" and "list payroll" all land.
    for (const action of VIEWS) {
      expect(action.label, action.id).toMatch(/^View /);
    }
  });

  it("hides every action from a reader who holds no key", () => {
    // A console action with no gate would offer the finance dashboard to a
    // class teacher who holds not one finance key.
    expect(filterActionsForPermissions(VIEWS, []).map((action) => action.id)).toEqual([]);
  });

  it("offers a dashboard only with a screen that opens beside it", () => {
    // Somebody who may raise an invoice but not list them has no screen in
    // Finance, so the dashboard is not offered either.
    const shown = (keys: string[]) =>
      filterActionsForPermissions(VIEWS, keys).map((action) => action.id);
    expect(shown(["finance.invoice.create"])).not.toContain("finance");
    expect(shown(["finance.invoice.view"])).toEqual(
      expect.arrayContaining(["finance", "finance-receivables-invoices"]),
    );
  });

  it("writes no alias for a screen the consoles do not offer", () => {
    // The table is keyed by url, and a typo in a key is silent: the alias
    // simply never applies and "suppliers" quietly stops finding Vendors.
    const offered = new Set(NAV_URLS);
    for (const url of Object.keys(EXTRA_ALIASES)) {
      expect(offered.has(url), url).toBe(true);
    }
  });

  it("keys ids off the url, so a rename upstream keeps a user's ranking", () => {
    expect(consoleActionId("/finance/receivables/invoices")).toBe(
      "finance-receivables-invoices",
    );
    expect(consoleActionId("/procurement")).toBe("procurement");
  });
});

describe("the create actions", () => {
  it("offers a job only where the console offers the screen", () => {
    // Collections is unmounted for some schools. "Create a checkout" has to go
    // with it rather than sit in the box pointing at a 404.
    const offered = new Set(NAV_URLS);
    for (const entry of CONSOLE_CREATE_ACTIONS) {
      expect(offered.has(entry.url), entry.url).toBe(true);
    }
    expect(CREATES.length).toBe(CONSOLE_CREATE_ACTIONS.length);
  });

  it("asks the screen to create, not merely to open", () => {
    for (const action of CREATES) {
      if (!("to" in action.run)) continue;
      expect(action.run.to, action.id).toMatch(/\?action=new$/);
    }
  });

  it("gates on a create key, never on the screen's read key", () => {
    // The failure this stops: "Raise an invoice" offered to a bursar who may
    // only read invoices, because the view action's gate was reused.
    for (const action of CREATES) {
      const to = "to" in action.run ? action.run.to.split("?")[0] : "";
      const view = VIEWS.find((v) => "to" in v.run && v.run.to === to);
      expect(action.gate, action.id).not.toBeNull();
      expect(action.gate, action.id).not.toHaveProperty("console");
      if (view) expect(action.gate, action.id).not.toEqual(view.gate);
    }
  });

  it("files each job under the heading of the screen it opens", () => {
    const viewOf = new Map(
      VIEWS.map((action) => [
        "to" in action.run ? action.run.to : "",
        action,
      ]),
    );
    for (const action of CREATES) {
      if (!("to" in action.run)) continue;
      const view = viewOf.get(pathOf(action.run.to));
      expect(view, action.id).toBeDefined();
      expect(action.section, action.id).toBe(view?.section);
      expect(action.group, action.id).toBe(view?.group);
    }
  });

  it("says what the job is, not what the screen is called", () => {
    // "Add Receipts & Allocation" is not a thing anybody does.
    for (const action of CREATES) {
      expect(action.label, action.id).not.toMatch(/^View /);
      expect(action.label.trim(), action.id).not.toBe("");
    }
  });
});

describe("titles that appear in both consoles", () => {
  const NAV: ConsoleNavGroup[] = [
    { items: [{ title: "Dashboard", url: "/a" }] },
    { label: "Admin", items: [{ title: "Settings", url: "/a/settings" }] },
  ];
  const OTHER: ConsoleNavGroup[] = [
    { items: [{ title: "Dashboard", url: "/b" }] },
    { label: "Admin", items: [{ title: "Reports", url: "/b/reports" }] },
  ];
  const built = consoleActions([
    { nav: NAV, section: "Finance", name: "Alpha" },
    { nav: OTHER, section: "Procurement", name: "Beta" },
  ]);
  const labelOf = (url: string) =>
    built.find((action) => "to" in action.run && action.run.to === url)?.label;

  it("names the console, so two rows are not both 'View Dashboard'", () => {
    expect(labelOf("/a")).toBe("View Alpha Dashboard");
    expect(labelOf("/b")).toBe("View Beta Dashboard");
  });

  it("leaves a title that appears once alone", () => {
    expect(labelOf("/a/settings")).toBe("View Settings");
    expect(labelOf("/b/reports")).toBe("View Reports");
  });

  it("keeps the bare title as an alias of a disambiguated row", () => {
    const dashboard = built.find((action) => action.id === "a");
    expect(dashboard?.aliases).toContain("Dashboard");
  });

  it("takes the group heading as the row's detail line", () => {
    expect(built.find((a) => a.id === "a-settings")?.group).toBe("Admin");
    // A group with no heading is the console's own pinned row.
    expect(built.find((a) => a.id === "a")?.group).toBe("Alpha");
  });

  it("offers an ungated screen when its console is offered", () => {
    expect(built.find((a) => a.id === "a")?.gate).toEqual({ console: NAV });
  });
});
