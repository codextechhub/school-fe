import { type RouteObject } from "react-router";
// EAGER on purpose. The shell (sidebar, header, session hooks) is a LAYOUT
// ROUTE above every protected page, so it ships in the entry bundle and paints
// the moment the app boots. Previously each page imported it, which made it a
// shared dependency of the lazy page chunks only - rollup hoisted it into its
// own chunk that had to be fetched before the frame could be drawn at all.
import DashboardLayout from "@/components/layout/dashboard-layout";
import { onboardingWelcomeRoute } from "./onboarding-routes";
import { protectedChildren } from "./route-tables";

export const protectedRoutes = [
  // Authenticated, but deliberately outside the shell - see the route's own
  // comment for why the welcome screen has no sidebar or header.
  onboardingWelcomeRoute,
  {
    Component: DashboardLayout,
    children: protectedChildren,
  },
] as RouteObject[];
