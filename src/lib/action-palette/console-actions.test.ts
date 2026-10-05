/**
 * What the derivation must keep true, not what it happens to produce today.
 *
 * These tests do NOT pin the number of finance screens or the wording of any
 * one of them: @xvs/finance adding a screen or renaming one must not turn a
 * test red, because picking those up without an edit here is the entire reason
 * the actions are derived.
 */

import { describe, expect, it } from "vitest";
import { filterActionsForPermissions, passesActionGate } from "./gate";
import {
  schoolFinanceNav,
  schoolProcurementNav,
} from "@/components/layout/console-nav-for-school";
import { P, resolvePermissionKey } from "@/permissions";
import { FINANCE_MOUNTED_PATHS } from "@/routes/protected/finance-routes";
import { PROCUREMENT_MOUNTED_PATHS } from "@/routes/protected/procurement-routes";
import {
  consoleActions,
  consoleActionId,
  consoleSectionActions,
  CONSOLE_CREATE_ACTIONS,
  CONSOLE_SECTION_VIEWS,
  EXTRA_ALIASES,
  needsWholeSchool,
} from "./console-actions";
import { ACTIONS, CONSOLE_ACTIONS } from "./registry";
import type { ConsoleNavGroup } from "@/components/finance-ui/console-nav";

const NAV_URLS = [...schoolFinanceNav, ...schoolProcurementNav]
  .flatMap((group) => group.items)
  .map((item) => item.url);

/**
 * The three kinds are checked apart because they promise different things. A
 * derived view action exists for every sidebar screen; a section view exists
 * for a served screen the sidebar does not list; a create action exists only
 * where the screen has a drawer to open, and carries a different gate and a
 * different kind of label.
 */
const SECTION_IDS = new Set(CONSOLE_SECTION_VIEWS.map((entry) => entry.id));
const SECTIONS = CONSOLE_ACTIONS.filter((action) => SECTION_IDS.has(action.id));
const VIEWS = CONSOLE_ACTIONS.filter(
  (action) => action.kind === "view" && !SECTION_IDS.has(action.id),
);
const CREATES = CONSOLE_ACTIONS.filter((action) => action.kind === "do");
const pathOf = (to: string) => to.split("?")[0];
const keysOf = (...codes: Parameters<typeof resolvePermissionKey>[0][]) =>
  codes.map(resolvePermissionKey);

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

describe("screens the sidebar does not list", () => {
  const MOUNTED = new Set([...FINANCE_MOUNTED_PATHS, ...PROCUREMENT_MOUNTED_PATHS]);

  it("offers every section this app serves", () => {
    // All six are mounted here, so all six must reach the box. A missing one
    // is a settings section a bursar can only find by clicking through.
    expect(SECTIONS.map((action) => action.id).sort()).toEqual([...SECTION_IDS].sort());
  });

  it("opens each at its own address", () => {
    const to = (id: string) => {
      const run = SECTIONS.find((action) => action.id === id)?.run;
      return run && "to" in run ? run.to : undefined;
    };
    expect(to("finance-settings-receivables")).toBe("/finance/settings/receivables");
    expect(to("finance-settings-payroll")).toBe("/finance/settings/payroll");
    expect(to("finance-settings-fiscal-calendar")).toBe("/finance/settings/fiscal-calendar");
    expect(to("finance-settings-banking-cash")).toBe("/finance/settings/banking-cash");
    expect(to("finance-reports-periods")).toBe("/finance/reports/periods");
    expect(to("procurement-vendor-credit-notes")).toBe(
      "/procurement/vendor-invoices?view=credit-notes",
    );
  });

  it("is a view, led by a verb, and gated", () => {
    for (const action of SECTIONS) {
      expect(action.kind, action.id).toBe("view");
      expect(action.label, action.id).toMatch(/^View /);
      expect(action.gate, action.id).not.toBeNull();
    }
    expect(filterActionsForPermissions(SECTIONS, [])).toEqual([]);
  });

  it("files each under the heading of the screen it sits in", () => {
    const groupOf = (id: string) => SECTIONS.find((action) => action.id === id);
    const settings = VIEWS.find((action) => action.id === "finance-settings");
    expect(groupOf("finance-settings-receivables")?.group).toBe(settings?.group);
    expect(groupOf("finance-settings-receivables")?.section).toBe("Finance");
    const bills = VIEWS.find((action) => action.id === "procurement-vendor-invoices");
    expect(groupOf("procurement-vendor-credit-notes")?.group).toBe(bills?.group);
    expect(groupOf("procurement-vendor-credit-notes")?.section).toBe("Procurement");
  });

  it("gates each on the key its section checks", () => {
    const gateOf = (id: string) => SECTIONS.find((action) => action.id === id)?.gate ?? null;
    const shown = (id: string, keys: string[]) => passesActionGate(gateOf(id), keys);

    const settingsReader = keysOf(P.FIN_VIEW_SETTINGS);
    expect(shown("finance-settings-receivables", settingsReader)).toBe(true);
    expect(shown("finance-settings-payroll", settingsReader)).toBe(true);
    expect(shown("finance-settings-fiscal-calendar", settingsReader)).toBe(true);
    // Online payments needs both: the page opens on one, the panel reads on the other.
    expect(shown("finance-settings-banking-cash", settingsReader)).toBe(false);
    expect(shown("finance-settings-banking-cash", keysOf(P.PAY_VIEW_PAYMENT_SETTINGS))).toBe(false);
    expect(
      shown(
        "finance-settings-banking-cash",
        keysOf(P.FIN_VIEW_SETTINGS, P.PAY_VIEW_PAYMENT_SETTINGS),
      ),
    ).toBe(true);

    expect(shown("finance-reports-periods", keysOf(P.FIN_VIEW_PERIODS))).toBe(true);
    expect(shown("finance-reports-periods", settingsReader)).toBe(false);

    // The Vendor Invoices screen opens its credit notes list on this key alone.
    expect(
      shown("procurement-vendor-credit-notes", keysOf(P.PROC_VIEW_VENDOR_CREDIT_NOTES)),
    ).toBe(true);
    expect(shown("procurement-vendor-credit-notes", keysOf(P.PROC_VIEW_VENDOR_INVOICES))).toBe(
      false,
    );
  });

  it("drops a section the router does not mount", () => {
    const sources = [
      { nav: schoolFinanceNav, section: "Finance" as const, name: "Finance" },
      { nav: schoolProcurementNav, section: "Procurement" as const, name: "Procurement" },
    ];
    const without = new Set(MOUNTED);
    without.delete("/finance/settings/payroll");
    const ids = consoleSectionActions(sources, without).map((action) => action.id);
    expect(ids).not.toContain("finance-settings-payroll");
    expect(ids).toContain("finance-settings-receivables");
  });

  it("drops a section whose page the sidebar does not offer", () => {
    // Without Settings in the nav there is no heading to file under, and no
    // page this app offers the section of.
    const noSettings = schoolFinanceNav.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.url !== "/finance/settings"),
    }));
    const ids = consoleSectionActions(
      [{ nav: noSettings, section: "Finance", name: "Finance" }],
      MOUNTED,
    ).map((action) => action.id);
    expect(ids).not.toContain("finance-settings-receivables");
    expect(ids).toContain("finance-reports-periods");
  });
});

describe("screens that need a particular kind of school", () => {
  /**
   * Every sidebar entry with a shape flag, read from the nav itself. A new
   * Between Branches screen, or a new screen paid from held money, is in scope
   * the moment the package adds it, so it cannot reach the box ungated.
   */
  const FLAGGED = [...schoolFinanceNav, ...schoolProcurementNav]
    .flatMap((group) => group.items)
    .flatMap((item) => [item, ...(item.children ?? [])])
    .filter((entry) => entry.multiBranch || entry.heldCustody);

  it("finds the flagged screens the sidebar holds", () => {
    // A guard on the guard: if this list were empty the checks below would
    // pass by checking nothing.
    const urls = FLAGGED.map((entry) => entry.url);
    expect(urls).toContain("/finance/inter-branch/transfers");
    expect(urls).toContain("/finance/payments/payouts");
  });

  it("carries the sidebar's shape onto every action that opens such a screen", () => {
    for (const entry of FLAGGED) {
      // The whole registry, not only the derived half: a typed row pointing at
      // Payouts would leak just the same.
      const actions = ACTIONS.filter(
        (action) => "to" in action.run && pathOf(action.run.to) === entry.url,
      );
      expect(actions.length, entry.url).toBeGreaterThan(0);
      for (const action of actions) {
        expect(action.schoolShape?.multiBranch ?? false, action.id).toBe(!!entry.multiBranch);
        expect(action.schoolShape?.heldCustody ?? false, action.id).toBe(!!entry.heldCustody);
      }
    }
  });

  it("marks no other action", () => {
    const flaggedUrls = new Set(FLAGGED.map((entry) => entry.url));
    for (const action of ACTIONS) {
      // A whole-school job is a question of the reader's reach, not of the
      // school's shape; it is checked under "whole-school jobs".
      if (!action.schoolShape?.multiBranch && !action.schoolShape?.heldCustody) continue;
      const to = "to" in action.run ? pathOf(action.run.to) : "";
      expect(flaggedUrls.has(to), action.id).toBe(true);
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

describe("whole-school jobs", () => {
  // The chart of accounts, cost centres, tax codes, vendor categories and the
  // catalogue are every branch's at once, so their create keys are in
  // @xvs/finance's WHOLE_SCHOOL_KEYS and the screens offer them to nobody else.
  const WHOLE_SCHOOL_URLS = [
    "/finance/setup/accounts",
    "/finance/setup/cost-centers",
    "/finance/setup/tax-codes",
    "/procurement/vendors/categories",
    "/procurement/vendors/catalog",
  ];

  it("are exactly the create jobs whose key needs whole-school reach", () => {
    const marked = CONSOLE_CREATE_ACTIONS.filter((entry) => needsWholeSchool(entry.gate)).map((entry) => entry.url);
    expect(marked.sort()).toEqual([...WHOLE_SCHOOL_URLS].sort());
  });

  it("carry the need on the action, so the school's shape can close them", () => {
    const actions = CREATES;
    for (const url of WHOLE_SCHOOL_URLS) {
      const action = actions.find((a) => a.id === `create-${consoleActionId(url)}`);
      expect(action?.schoolShape?.wholeSchool, url).toBe(true);
    }
    const invoice = actions.find((a) => a.id === `create-${consoleActionId("/finance/receivables/invoices")}`);
    expect(invoice?.schoolShape?.wholeSchool).toBeUndefined();
  });

  it("read an any-gate as whole-school only when every key in it is", () => {
    expect(needsWholeSchool({ perm: P.FIN_CREATE_ACCOUNT })).toBe(true);
    expect(needsWholeSchool({ any: [P.FIN_CREATE_ACCOUNT, P.FIN_CREATE_INVOICE] })).toBe(false);
    expect(needsWholeSchool({ any: [P.FIN_CREATE_ACCOUNT, P.FIN_CREATE_COST_CENTER] })).toBe(true);
    expect(needsWholeSchool({ all: [P.FIN_CREATE_INVOICE, P.FIN_CREATE_ACCOUNT] })).toBe(true);
    expect(needsWholeSchool({ perm: P.FIN_CREATE_INVOICE })).toBe(false);
    expect(needsWholeSchool(null)).toBe(false);
  });
});
