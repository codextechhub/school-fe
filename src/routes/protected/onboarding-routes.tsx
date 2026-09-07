import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Route-level code splitting, as everywhere else. `onboarding: true` on each
// handle is what puts the shell into its pre-go-live shape: reduced sidebar,
// status strip, no branch switcher.
const OnboardingWelcome = lazy(
  () => import("@/pages/protected/onboarding/welcome"),
);
const OnboardingControlRoom = lazy(
  () => import("@/pages/protected/onboarding"),
);
const SchoolProfile = lazy(
  () => import("@/pages/protected/onboarding/school-profile"),
);
const OnboardingRoles = lazy(() => import("@/pages/protected/onboarding/roles"));
const OnboardingImport = lazy(() => import("@/pages/protected/onboarding/import"));
const Notifications = lazy(() => import("@/pages/protected/notifications"));
const GoLive = lazy(() => import("@/pages/protected/onboarding/go-live"));
const OnboardingNotLive = lazy(
  () => import("@/pages/protected/onboarding/not-live"),
);

const handle = (title: string, hasBack = false): DashboardHandle => ({
  title,
  hasBack,
  onboarding: true,
});

/**
 * Welcome sits OUTSIDE the dashboard shell, which is why it is exported
 * separately and mounted as a sibling of the layout route rather than a child.
 *
 * The design draws it as a full-page card on the canvas: no sidebar, no header,
 * no status strip. It is the screen before you enter the control room, and a
 * shell around it would answer questions the reader has not asked yet.
 */
export const onboardingWelcomeRoute = {
  path: routesPath.PROTECTED.ONBOARDING.WELCOME,
  Component: OnboardingWelcome,
} as RouteObject;

export const onboardingRoutes = [
  {
    path: routesPath.PROTECTED.ONBOARDING.INDEX,
    Component: OnboardingControlRoom,
    handle: handle("Onboarding"),
  },
  {
    path: routesPath.PROTECTED.ONBOARDING.PROFILE,
    Component: SchoolProfile,
    handle: handle("School Profile", true),
  },
  {
    // Both checklist cards land here; ?tab= decides which half opens.
    path: routesPath.PROTECTED.ONBOARDING.ROLES,
    Component: OnboardingRoles,
    handle: handle("Roles & Invitations", true),
  },
  {
    path: routesPath.PROTECTED.ONBOARDING.IMPORT,
    Component: OnboardingImport,
    handle: handle("Upload Datasets", true),
  },
  {
    path: routesPath.PROTECTED.ONBOARDING.GO_LIVE,
    Component: GoLive,
    handle: handle("Go-Live", true),
  },
  {
    // Not under /onboarding: a school keeps its post after go-live too.
    path: routesPath.PROTECTED.NOTIFICATIONS,
    Component: Notifications,
    handle: handle("Notifications", true),
  },
  {
    path: routesPath.PROTECTED.ONBOARDING.NOT_LIVE,
    Component: OnboardingNotLive,
    handle: handle("Not available yet"),
  },
] as RouteObject[];
