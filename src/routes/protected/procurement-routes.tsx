import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";
// Static lists, so declaring the paths does not pull in the lazy page chunks.
import {
  ANALYTICS_SECTIONS, INVENTORY_SECTIONS, PROCUREMENT_SETTINGS_SECTIONS,
  VENDOR_SECTIONS,
} from "@/pages/protected/procurement/console-sections";

/** The school uses its own dashboard presentation and the shared detailed views. */
const ProcurementDashboard = lazy(() => import("@/pages/protected/procurement-dashboard"));
const Vendors = lazy(() => import("@/pages/protected/procurement/vendors"));
const Requisitions = lazy(() => import("@/pages/protected/procurement/requisitions"));
const PurchaseOrders = lazy(() => import("@/pages/protected/procurement/purchase-orders"));
const GoodsReceipts = lazy(() => import("@/pages/protected/procurement/goods-receipts"));
const VendorInvoices = lazy(() => import("@/pages/protected/procurement/vendor-invoices"));
const VendorPayments = lazy(() => import("@/pages/protected/procurement/vendor-payments"));
const Approvals = lazy(() => import("@/pages/protected/procurement/approvals"));
const SourcingRfqs = lazy(() => import("@/pages/protected/procurement/sourcing/rfqs"));
const SourcingQuotations = lazy(() => import("@/pages/protected/procurement/sourcing/quotations"));
const Contracts = lazy(() => import("@/pages/protected/procurement/contracts"));
const Inventory = lazy(() => import("@/pages/protected/procurement/inventory"));
const Analytics = lazy(() => import("@/pages/protected/procurement/analytics"));
const ProcurementSettings = lazy(() => import("@/pages/protected/procurement/settings"));

const P = routesPath.PROTECTED.PROCUREMENT;

/**
 * Unlike Finance, this area is mounted WHOLE, and the difference is worth
 * stating rather than looking like an oversight.
 *
 * Finance carries platform machinery a school can never hold - several sets of
 * books, foreign currencies, analytical dimensions, the payment gateway's own
 * payouts and webhooks - so those routes are left unmounted. Procurement has no
 * equivalent: every screen here is a school buying something. A storekeeper
 * counts exercise books, a vice principal raises a requisition, a bursar
 * matches a supplier's bill. There is nothing in vs_procurement that belongs to
 * the platform and not to a school.
 *
 * What a given person may DO here is still decided by permissions, and most of
 * it is deliberately not grantable through a group: creating a supplier payment
 * is CRITICAL, so it travels through a named role rather than a dropdown.
 */
export const procurementRoutes: RouteObject[] = [
  {
    handle: { sidebar: "procurement", title: "Procurement" } satisfies DashboardHandle,
    children: [
      { path: P.INDEX, element: <ProcurementDashboard /> },

      { path: P.VENDORS, element: <Vendors /> },
      ...VENDOR_SECTIONS.map((section) => ({
        path: `${P.VENDORS}/${section}`, element: <Vendors section={section} />,
      })),

      { path: P.REQUISITIONS, element: <Requisitions /> },
      { path: P.PURCHASE_ORDERS, element: <PurchaseOrders /> },
      { path: P.GOODS_RECEIPTS, element: <GoodsReceipts /> },
      { path: P.VENDOR_INVOICES, element: <VendorInvoices /> },
      { path: P.VENDOR_PAYMENTS, element: <VendorPayments /> },
      { path: P.APPROVALS, element: <Approvals /> },

      { path: P.SOURCING, element: <SourcingRfqs /> },
      { path: `${P.SOURCING}/rfqs`, element: <SourcingRfqs /> },
      { path: `${P.SOURCING}/quotations`, element: <SourcingQuotations /> },

      { path: P.CONTRACTS, element: <Contracts /> },

      { path: P.INVENTORY, element: <Inventory /> },
      ...INVENTORY_SECTIONS.map((section) => ({
        path: `${P.INVENTORY}/${section}`, element: <Inventory section={section} />,
      })),

      { path: P.ANALYTICS, element: <Analytics /> },
      // One path per section that exists, rather than `:section` matching
      // anything. An address for a report that does not exist falls through to
      // the app's 404 instead of reaching a page that has to decide.
      ...ANALYTICS_SECTIONS.map((section) => ({
        path: `${P.ANALYTICS}/${section}`, element: <Analytics section={section} />,
      })),

      { path: P.SETTINGS, element: <ProcurementSettings /> },
      ...PROCUREMENT_SETTINGS_SECTIONS.map((section) => ({
        path: `${P.SETTINGS}/${section}`, element: <ProcurementSettings section={section} />,
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
export const PROCUREMENT_MOUNTED_PATHS: ReadonlySet<string> = new Set(
  (procurementRoutes[0].children ?? [])
    .map((route) => route.path)
    .filter((path): path is string => typeof path === "string"),
);
