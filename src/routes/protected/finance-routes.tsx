import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";
// Static lists, so declaring the paths does not pull in the lazy page chunks.
import {
  BUDGETS_SECTIONS, COLLECTIONS_SECTIONS, EXPENSES_SECTIONS,
  RECEIVABLES_SECTIONS, REPORTS_SECTIONS,
} from "@/pages/protected/finance/console-sections";
import { financeSettingsSections, setupSections } from "@/xvs-host";

// The finance screens come from @xvs/finance and are shared with the CodeX
// console. Route-level code splitting: each area loads on first visit.
const FinanceDashboard = lazy(() => import("@/pages/protected/finance/dashboard"));
const GeneralLedger = lazy(() => import("@/pages/protected/finance/ledger"));
const Receivables = lazy(() => import("@/pages/protected/finance/receivables"));
const Collections = lazy(() => import("@/pages/protected/finance/collections"));
const Banking = lazy(() => import("@/pages/protected/finance/banking"));
const BankReconciliation = lazy(() => import("@/pages/protected/finance/bank-reconciliation"));
const Expenses = lazy(() => import("@/pages/protected/finance/expenses"));
const Payroll = lazy(() => import("@/pages/protected/finance/payroll"));
const BudgetsAssetsTax = lazy(() => import("@/pages/protected/finance/budgets"));
const Setup = lazy(() => import("@/pages/protected/finance/setup"));
const Reports = lazy(() => import("@/pages/protected/finance/reports"));
const FinanceAudit = lazy(() => import("@/pages/protected/finance/audit"));
const FinanceSettings = lazy(() => import("@/pages/protected/finance/settings"));

const F = routesPath.PROTECTED.FINANCE;

/**
 * A school gets a SUBSET of the console's finance area, and the difference is
 * deliberate rather than an oversight. Three setup sections are left unmounted
 * because a school can never be granted them (see the adaptation spec):
 *
 *   entities    - a school keeps one set of books, so there is nothing to list
 *   currencies  - it bills in naira
 *   dimensions  - analytical tagging it will not use
 *
 * A route that exists but can never be granted is dead surface: it ships in the
 * bundle and appears in route catalogues as though the product had a feature it
 * does not. Permission gating decides WHO sees a screen; it is the wrong tool
 * for deciding whether a screen belongs to this product at all.
 */
// The one list, declared where the package can read it too. Building the routes
// from the same array the host contract publishes is what stops the settings nav
// advertising a section this table does not serve.
const SCHOOL_SETUP_SECTIONS = setupSections;

/**
 * The whole Payments area is unmounted for the same reason. Its sections are
 * payouts, batches, settlement, transactions and webhooks - the platform's own
 * gateway operations, not a school's. A school's money-in arrives through
 * Collections, which IS mounted.
 */
export const financeRoutes: RouteObject[] = [
  {
    handle: { sidebar: "finance", title: "Finance" } satisfies DashboardHandle,
    children: [
      // One path per real section rather than a `:section` param, so an unknown
      // section matches no route and falls through to the app's 404 instead of
      // reaching a page that has to decide what is real.
      { path: F.INDEX, element: <FinanceDashboard /> },

      { path: F.SETUP, element: <Setup /> },
      ...SCHOOL_SETUP_SECTIONS.map((section) => ({
        path: `${F.SETUP}/${section}`, element: <Setup section={section} />,
      })),

      { path: F.LEDGER, element: <GeneralLedger /> },

      { path: F.RECEIVABLES, element: <Receivables /> },
      ...RECEIVABLES_SECTIONS.map((section) => ({
        path: `${F.RECEIVABLES}/${section}`, element: <Receivables section={section} />,
      })),

      { path: F.COLLECTIONS, element: <Collections /> },
      ...COLLECTIONS_SECTIONS.map((section) => ({
        path: `${F.COLLECTIONS}/${section}`, element: <Collections section={section} />,
      })),

      { path: F.BANKING, element: <Banking /> },
      { path: F.BANK_RECON, element: <BankReconciliation /> },

      { path: F.EXPENSES, element: <Expenses /> },
      ...EXPENSES_SECTIONS.map((section) => ({
        path: `${F.EXPENSES}/${section}`, element: <Expenses section={section} />,
      })),

      { path: F.PAYROLL, element: <Payroll /> },

      { path: F.BUDGETS, element: <BudgetsAssetsTax /> },
      ...BUDGETS_SECTIONS.map((section) => ({
        path: `${F.BUDGETS}/${section}`, element: <BudgetsAssetsTax section={section} />,
      })),

      { path: F.REPORTS, element: <Reports /> },
      ...REPORTS_SECTIONS.map((section) => ({
        path: `${F.REPORTS}/${section}`, element: <Reports section={section} />,
      })),

      { path: F.AUDIT, element: <FinanceAudit /> },

      { path: F.SETTINGS, element: <FinanceSettings /> },
      ...financeSettingsSections.map((section) => ({
        path: `${F.SETTINGS}/${section}`, element: <FinanceSettings section={section} />,
      })),
    ],
  },
];

/** Every path this app actually mounts.
 *
 *  The sidebar is filtered through this rather than through a second list of
 *  exclusions, so the nav can never offer a screen the router does not serve.
 *  A hand-kept list drifts the moment somebody mounts a route and forgets the
 *  nav, and the failure looks like a broken link rather than a missing edit.
 */
export const FINANCE_MOUNTED_PATHS: ReadonlySet<string> = new Set(
  (financeRoutes[0].children ?? [])
    .map((route) => route.path)
    .filter((path): path is string => typeof path === "string"),
);
