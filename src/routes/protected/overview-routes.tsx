import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Route-level code splitting: each page loads on first visit instead of
// shipping in the main bundle. Suspense fallback lives in routes/lazy-root.tsx.
const Dashboard = lazy(() => import("@/pages/protected/dashboard"));

export const overviewRoutes = [
  // Named, like every other route. This used to declare no title so the shell
  // fell back to "Welcome back!!", which greeted the reader in the one place
  // the page already greets them by name - and left the header saying something
  // different from the sidebar item that got them here.
  {
    path: routesPath.PROTECTED.OVERVIEW.INDEX,
    Component: Dashboard,
    // The school pulse counts one branch's roll for one year, so both pills.
    handle: { title: "Dashboard", lenses: "both" } satisfies DashboardHandle,
  },
] as RouteObject[];
