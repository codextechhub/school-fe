import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Route-level code splitting: the desk loads on first visit rather than
// shipping in the main bundle.
const SupportDesk = lazy(() => import("@/pages/protected/support"));
const SupportTicketDetail = lazy(() => import("@/pages/protected/support/detail"));
const HowToGuides = lazy(() => import("@/pages/protected/support/guides"));
const GuideArticle = lazy(() => import("@/pages/protected/support/guide-article"));

const S = routesPath.PROTECTED.SUPPORT;

// The school's own support desk.
//
// `pendingSurface` on both, and it is the point rather than a convenience. A
// school still being set up is exactly when it needs to be able to ask for
// help, and the header's headset has always been able to file a ticket from
// anywhere - including before go-live. Without it a school could raise a ticket
// and then have nowhere to read the answer.
export const supportRoutes = [
  {
    path: S.INDEX,
    Component: SupportDesk,
    handle: { title: "Support", pendingSurface: true } satisfies DashboardHandle,
  },
  // The how-to guides. Open before go-live for the same reason the desk is,
  // and gated on nothing beyond a session: each guide is filtered against the
  // reader's own permissions, so the home shows only what they may use.
  {
    path: S.GUIDES,
    Component: HowToGuides,
    handle: { title: "How-to Guides", pendingSurface: true } satisfies DashboardHandle,
  },
  {
    path: S.GUIDE_DETAIL,
    Component: GuideArticle,
    // Back names the guides home: an article is opened from the search box and
    // the help panel as often as from the list, and history-back would return
    // the reader to whatever screen they had been on instead.
    handle: {
      title: "How-to Guides",
      back: S.GUIDES,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    path: S.DETAIL,
    Component: SupportTicketDetail,
    handle: {
      title: "Support",
      hasBack: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
] as RouteObject[];
