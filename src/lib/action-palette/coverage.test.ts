/**
 * Does the search box know about everything this app can do?
 *
 * ── Why these tests exist ────────────────────────────────────────────────────
 *
 * The palette went nineteen actions deep while the app had ninety screens, and
 * nobody noticed for months, because nothing anywhere said it was incomplete.
 * A screen shipped, the sidebar got its link, and the box simply never heard of
 * it. The same held for the jobs: screens grew create drawers reachable by
 * `?action=new` and the palette went on offering only the screen.
 *
 * So these are the tests that notice. Each one fails with the exact path or
 * file that nobody decided about, and there are only ever two right answers:
 *
 *   1. add the action (registry.ts for this app's screens, the create table in
 *      console-actions.ts for a finance or procurement job); or
 *   2. record it below as deliberately unreachable, with the reason.
 *
 * Neither answer is more correct than the other. What is NOT allowed is the
 * third thing that used to happen, which is nobody thinking about it at all.
 *
 * ── What is deliberately NOT checked ─────────────────────────────────────────
 *
 * Finance and Procurement VIEW actions. Those are derived from the two console
 * sidebars (see console-actions.ts), so they cannot fall behind by
 * construction - a screen in the sidebar has an action because the action is
 * made from the sidebar. Only their create half is hand-written, so only their
 * create half is audited here.
 *
 * Console section PARENTS either ("/finance/setup", "/finance/receivables").
 * The router mounts them so a bare address resolves, but they are not screens
 * anybody names - each redirects to its first section - and the sidebar does
 * not offer them either.
 */

// Node types for this file alone. tsconfig.app.json limits `types` to
// vite/client on purpose, so app code cannot reach for the filesystem; an audit
// that reads the source tree is the one legitimate exception, and scoping the
// reference here keeps the ban in place everywhere else.
/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { protectedRoutes } from "@/routes/protected";
import { CONSOLE_CREATE_ACTIONS } from "./console-actions";
import { ACTIONS } from "./registry";

// ─────────────────────────────────────────────────────────────────────────────
// Screens with no palette action, and why. A path here is a decision on record.
// ─────────────────────────────────────────────────────────────────────────────
const NOT_A_DESTINATION: Record<string, string> = {
  "/onboarding/welcome":
    "the screen before you enter the control room; nobody asks to go here",
  "/onboarding/not-live":
    "where a refusal lands, not a place a person chooses",
  "/academic": "legacy address, redirects into /academic-structure",
  "/academic/session": "legacy address, redirects to Sessions & Terms",
  "/academic/calender":
    "legacy address (and the old misspelling), redirects to the calendar",
  "/classes": "legacy address, redirects to Classes & Arms",
  "/academic-structure/assignments":
    "was a placeholder promising class teachers once staff existed; staff " +
    "exist and Teaching duties answers it, so this redirects there",
};

/**
 * Every @xvs/finance screen that answers `?action=new`, and the address its
 * palette job points at. Hand-written, because the package publishes no such
 * list - but its COMPLETENESS is checked below, so a create flow added upstream
 * turns this file red with the name of the file that appeared.
 */
const PACKAGE_CREATE_SCREENS: Record<string, string> = {
  "finance/banking.tsx": "/finance/banking",
  "finance/budgets/assets-tab.tsx": "/finance/budgets/assets",
  "finance/budgets/budgets-tab.tsx": "/finance/budgets/budgets",
  "finance/collections/collections-tab.tsx": "/finance/collections",
  "finance/collections/virtual-accounts-tab.tsx":
    "/finance/collections/virtual-accounts",
  "finance/expenses/expense-claims-tab.tsx": "/finance/expenses/claims",
  "finance/ledger/index.tsx": "/finance/ledger",
  "finance/payroll.tsx": "/finance/payroll",
  "finance/receivables/concessions-tab.tsx":
    "/finance/receivables/concessions",
  "finance/receivables/credit-notes-tab.tsx":
    "/finance/receivables/credit-notes",
  "finance/receivables/customers-tab.tsx": "/finance/receivables/customers",
  "finance/receivables/invoices-tab.tsx": "/finance/receivables/invoices",
  "finance/receivables/payment-plans-tab.tsx":
    "/finance/receivables/payment-plans",
  "finance/receivables/receipts-allocation-tab.tsx":
    "/finance/receivables/receipts",
  "finance/receivables/refunds-tab.tsx": "/finance/receivables/refunds",
  "finance/setup/accounts-tab.tsx": "/finance/setup/accounts",
  "finance/setup/cost-centers-tab.tsx": "/finance/setup/cost-centers",
  "finance/setup/tax-codes-tab.tsx": "/finance/setup/tax-codes",
  "procurement/analytics/performance.tsx":
    "/procurement/analytics/performance",
  "procurement/contracts.tsx": "/procurement/contracts",
  "procurement/goods-receipts.tsx": "/procurement/goods-receipts",
  "procurement/inventory.tsx": "/procurement/inventory/items",
  "procurement/purchase-orders.tsx": "/procurement/purchase-orders",
  "procurement/requisitions.tsx": "/procurement/requisitions",
  "procurement/sourcing/quotations.tsx": "/procurement/sourcing/quotations",
  "procurement/sourcing/rfqs.tsx": "/procurement/sourcing/rfqs",
  "procurement/stock-locations.tsx": "/procurement/inventory/locations",
  "procurement/vendor-invoices.tsx": "/procurement/vendor-invoices",
  "procurement/vendor-payments.tsx": "/procurement/vendor-payments",
  "procurement/vendors/catalog-tab.tsx": "/procurement/vendors/catalog",
  "procurement/vendors/categories-tab.tsx": "/procurement/vendors/categories",
  "procurement/vendors/vendors-tab.tsx": "/procurement/vendors/vendors",
};

// Create flows on screens this app does not mount, so there is no job to offer.
// See finance-routes.tsx: a school keeps one set of books, bills in naira, uses
// no analytical tagging, and does not run the gateway's own payouts.
const PACKAGE_CREATE_NOT_MOUNTED: Record<string, string> = {
  "finance/payouts-tab.tsx": "the gateway's payouts are not a school's",
  "finance/setup/currencies-tab.tsx": "a school bills in naira",
  "finance/setup/dimensions-tab.tsx": "analytical tagging it will not use",
  "finance/setup/entities-tab.tsx": "a school keeps one set of books",
};

// ── Scanning ─────────────────────────────────────────────────────────────────

function sourceFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFilesUnder(full, out);
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Screen files that answer `?action=new` by opening their create drawer. */
function screensWithCreateLanding(root: string): string[] {
  return sourceFilesUnder(root)
    .filter((file) => /useActionParam\(\s*["']new["']/.test(readFileSync(file, "utf8")))
    .map((file) => file.slice(root.length + 1))
    .sort();
}

const SCHOOL_PAGES = "src/pages/protected";
// `src/pages` rather than `src`, so the hook's own definition is not mistaken
// for a call site: its doc comment shows the call, and a doc comment is not a
// screen.
const PACKAGE_PAGES = "node_modules/@xvs/finance/src/pages";

/**
 * Every address the router serves, read from the router itself.
 *
 * Naming the route tables one by one is the failure this whole file exists to
 * catch, one level up: a table added and not listed here makes the audit pass
 * by having nothing to say about the screens it forgot. Walking
 * `protectedRoutes` means a mounted screen is in scope the moment it is
 * mounted, and the only way out is a recorded decision below.
 */
function pathsOf(routes: readonly unknown[]): string[] {
  return routes.flatMap((route) => {
    const node = route as { path?: string; children?: readonly unknown[] };
    return [
      ...(typeof node.path === "string" ? [node.path] : []),
      ...(node.children ? pathsOf(node.children) : []),
    ];
  });
}

/**
 * The two consoles, whose view actions are derived rather than written.
 *
 * `consoleActions` builds them from the same nav the sidebar draws, so a screen
 * in the sidebar has an action by construction and cannot fall behind. Their
 * section parents ("/finance/setup", "/procurement/vendors") are mounted only
 * so a bare address resolves and each redirects to its first section, so they
 * are nobody's destination either. Auditing this half would be auditing the
 * derivation, not the decisions; the hand-written create half IS audited below.
 */
const DERIVED_PREFIXES = ["/finance/", "/procurement/"];

const mountedSchoolPaths = pathsOf(protectedRoutes)
  // A path with an :id is nobody's palette destination: there is no id to name
  // from a search box. The student search above the actions covers profiles.
  .filter((path) => !path.includes(":"))
  .filter((path) => !DERIVED_PREFIXES.some((prefix) => path.startsWith(prefix)));

const destinations = new Set(
  ACTIONS.flatMap((action) =>
    "to" in action.run ? [action.run.to.split("?")[0]] : [],
  ),
);

describe("every screen this app serves", () => {
  it("is either reachable from the search box or recorded as not a destination", () => {
    const unaccounted = mountedSchoolPaths.filter(
      (path) => !destinations.has(path) && !(path in NOT_A_DESTINATION),
    );

    expect(
      unaccounted,
      unaccounted.length
        ? `\n\nThese screens are mounted but the search box cannot reach them:\n` +
          unaccounted.map((p) => `  ${p}`).join("\n") +
          `\n\nDo one of two things:\n` +
          `  - add an action for it to src/lib/action-palette/registry.ts, or\n` +
          `  - add it to NOT_A_DESTINATION in this file with the reason.\n`
        : "",
    ).toEqual([]);
  });

  it("records no reason for a screen that is reachable after all", () => {
    // A stale exemption is how a screen stays quietly missing: somebody adds
    // the action later and the note claiming it is unreachable outlives it.
    for (const path of Object.keys(NOT_A_DESTINATION)) {
      expect(
        destinations.has(path),
        `${path} has a palette action, so its NOT_A_DESTINATION note is stale - delete it`,
      ).toBe(false);
    }
  });

  it("records no reason for a screen that is not mounted", () => {
    const mounted = new Set(mountedSchoolPaths);
    for (const path of Object.keys(NOT_A_DESTINATION)) {
      expect(
        mounted.has(path),
        `${path} is not mounted any more - delete its NOT_A_DESTINATION note`,
      ).toBe(true);
    }
  });
});

describe("every job this app can start", () => {
  it("is offered by the search box", () => {
    // The reverse of the check in registry.test.ts. That one stops an action
    // pointing at a screen with no landing hook; this one stops a screen
    // growing a create drawer that the box never learns to open.
    const wired = screensWithCreateLanding(SCHOOL_PAGES);
    // This app's own jobs only. The console jobs land on package screens and
    // are audited separately, below.
    const offered = new Set(
      ACTIONS.flatMap((action) => {
        if (!("to" in action.run) || !action.run.to.includes("action=new")) return [];
        const path = action.run.to.split("?")[0];
        const isConsole =
          path.startsWith("/finance") || path.startsWith("/procurement");
        return isConsole ? [] : [path];
      }),
    );

    expect(
      wired.length,
      `\n\n${wired.length} screens answer ?action=new:\n` +
        wired.map((f) => `  ${f}`).join("\n") +
        `\n\nbut the palette offers ${offered.size} create actions. Every wired\n` +
        `screen needs one in registry.ts, or the hook on it is dead weight.\n`,
    ).toBe(offered.size);
  });
});

describe("every job the finance package can start", () => {
  const wired = screensWithCreateLanding(PACKAGE_PAGES);

  it("is either offered here or recorded as a screen this app does not mount", () => {
    const known = new Set([
      ...Object.keys(PACKAGE_CREATE_SCREENS),
      ...Object.keys(PACKAGE_CREATE_NOT_MOUNTED),
    ]);
    const unaccounted = wired.filter((file) => !known.has(file));

    expect(
      unaccounted,
      unaccounted.length
        ? `\n\n@xvs/finance grew create flows nobody has decided about:\n` +
          unaccounted.map((f) => `  ${f}`).join("\n") +
          `\n\nEither add the job to CONSOLE_CREATE_ACTIONS in console-actions.ts\n` +
          `(and map the file to its url in PACKAGE_CREATE_SCREENS here), or add\n` +
          `it to PACKAGE_CREATE_NOT_MOUNTED with the reason.\n`
        : "",
    ).toEqual([]);
  });

  it("keeps no note for a screen the package no longer creates from", () => {
    const stillWired = new Set(wired);
    for (const file of [
      ...Object.keys(PACKAGE_CREATE_SCREENS),
      ...Object.keys(PACKAGE_CREATE_NOT_MOUNTED),
    ]) {
      expect(
        stillWired.has(file),
        `${file} no longer answers ?action=new - drop it from this file, and drop its action if it has one`,
      ).toBe(true);
    }
  });

  it("has a job for every mapped screen", () => {
    const offered = new Set(CONSOLE_CREATE_ACTIONS.map((entry) => entry.url));
    for (const [file, url] of Object.entries(PACKAGE_CREATE_SCREENS)) {
      expect(
        offered.has(url),
        `${file} creates at ${url}, but CONSOLE_CREATE_ACTIONS offers no job there`,
      ).toBe(true);
    }
  });

  it("maps every job it offers back to a screen that can answer it", () => {
    const mapped = new Set(Object.values(PACKAGE_CREATE_SCREENS));
    for (const entry of CONSOLE_CREATE_ACTIONS) {
      expect(
        mapped.has(entry.url),
        `"${entry.label}" points at ${entry.url}, which no package screen answers with a create drawer`,
      ).toBe(true);
    }
  });
});
