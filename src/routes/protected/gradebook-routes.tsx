import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

const MySheets = lazy(() => import("@/pages/protected/gradebook/my-sheets"));
const ScoreSheet = lazy(() => import("@/pages/protected/gradebook/sheet"));
const WhoTakesWhat = lazy(() => import("@/pages/protected/gradebook/electives"));

const G = routesPath.PROTECTED.GRADEBOOK;

/**
 * The gradebook screens.
 *
 * Closed before go-live, like the backend: a school that has not gone live has
 * no term in progress and nobody placed in a class, so there is nothing to mark.
 *
 * No lens. A sheet belongs to its class's branch and to the term it names,
 * whatever the selector says, and a teacher's own sheets are the current
 * term's in every branch they teach.
 */
export const gradebookRoutes = [
  {
    path: G.INDEX,
    Component: MySheets,
    handle: { title: "Gradebook" } satisfies DashboardHandle,
  },
  {
    path: G.SHEET,
    Component: ScoreSheet,
    handle: { title: "Score sheet", back: G.INDEX } satisfies DashboardHandle,
  },
  {
    // The class rides in `?class=`, chosen on the screen from the reader's own.
    path: G.ELECTIVES,
    Component: WhoTakesWhat,
    handle: { title: "Who takes what" } satisfies DashboardHandle,
  },
] as RouteObject[];
