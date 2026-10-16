import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

const Notices = lazy(() => import("@/pages/protected/notices"));

/**
 * Notices the school posts to its pupils.
 *
 * One screen: the list, with drafting, reading and withdrawing in drawers over
 * it. Closed to a school that has not gone live, because a school still being
 * set up has no pupils to post to.
 */
export const noticesRoutes = [
  {
    path: routesPath.PROTECTED.NOTICES,
    Component: Notices,
    handle: { title: "Notices" } satisfies DashboardHandle,
  },
] as RouteObject[];
