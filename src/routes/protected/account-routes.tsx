import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

const AccountSecurity = lazy(() => import("@/pages/protected/account/security"));

const A = routesPath.PROTECTED.ACCOUNT;

/**
 * The signed-in person's own account, reached from the account menu.
 *
 * Gated on nothing beyond a session: the server answers a password change for
 * any active account and only ever for the caller. `pendingSurface` because the
 * endpoint is open before go-live too, and a school's first administrator may
 * need to replace a password they were sent before anything else.
 */
export const accountRoutes = [
  {
    path: A.SECURITY,
    Component: AccountSecurity,
    handle: {
      title: "Account security",
      lenses: "none",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
] satisfies RouteObject[];
