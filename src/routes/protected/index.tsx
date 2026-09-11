import { lazy } from "react";
import { type RouteObject } from "react-router";
import { onboardingWelcomeRoute } from "./onboarding-routes";
import { protectedChildren } from "./route-tables";

/**
 * The protected shell is one route-level chunk shared by every signed-in page.
 * Authentication and public payment routes do not need its sidebars, menus,
 * notification tray, or session controls, so they do not load this module.
 */
const DashboardLayout = lazy(
  () => import("@/components/layout/dashboard-layout"),
);

export const protectedRoutes = [
  // Authenticated, but deliberately outside the shell - see the route's own
  // comment for why the welcome screen has no sidebar or header.
  onboardingWelcomeRoute,
  {
    Component: DashboardLayout,
    children: protectedChildren,
  },
] as RouteObject[];
