import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Route-level code splitting: each page loads on first visit rather than
// shipping in the main bundle. The Suspense fallback lives in routes/lazy-root.
const StaffDirectory = lazy(() => import("@/pages/protected/staff"));
const StaffProfile = lazy(() => import("@/pages/protected/staff/profile"));

const S = routesPath.PROTECTED.STAFF;

/**
 * Staff Management.
 *
 * **`pendingSurface`, and that is a narrower statement than it looks.** The
 * directory and the record ARE open to a school still onboarding, because the
 * backend declares `pending_tenant_surface` on them: adding colleagues is a
 * step on its checklist, and a school locked out of its own staff list during
 * setup can never finish. What is closed is the rest - the employment
 * lifecycle, leave and teaching duties all answer 403 `TENANT_NOT_LIVE`,
 * because nobody resigns during setup and there is no year to teach in yet. So
 * the routes are open and the CONTROLS inside them are gated one at a time.
 *
 * **The branch lens applies; the session lens does not.** Where somebody is
 * posted is a branch question and the directory narrows by it. Employment is
 * not per-year: a person hired in 2024 is still employed in 2026, and a year
 * pill over this list would be a control that changes nothing while looking
 * like it narrowed the page. The one thing here that IS per-year is a teaching
 * duty, and it carries its own session rather than borrowing the page's.
 */
export const staffRoutes = [
  {
    path: S.INDEX,
    Component: StaffDirectory,
    handle: {
      title: "Staff Directory",
      lens: true,
      lenses: "branch",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    // Ranked routing would put any static child of /staff above this, which is
    // what makes adding one safe later. Nothing declares one yet - see the
    // STAFF prefix in routesPath for why an unmounted name is worse than none.
    path: S.PROFILE,
    Component: StaffProfile,
    handle: {
      title: "Staff Profile",
      hasBack: true,
      lens: true,
      lenses: "branch",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
] as RouteObject[];
