import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

const GradebookHome = lazy(() => import("@/pages/protected/gradebook/home"));
const MySheets = lazy(() => import("@/pages/protected/gradebook/my-sheets"));
const Moderation = lazy(() => import("@/pages/protected/gradebook/moderation"));
const Approvals = lazy(() => import("@/pages/protected/gradebook/approvals"));
const FeeHolds = lazy(() => import("@/pages/protected/gradebook/holds"));
const Release = lazy(() => import("@/pages/protected/gradebook/release"));
const Amendments = lazy(() => import("@/pages/protected/gradebook/amendments"));
const ReportCardPage = lazy(() => import("@/pages/protected/gradebook/report-card"));
const ClassCardsPage = lazy(() => import("@/pages/protected/gradebook/report-card/class-cards"));
const BroadsheetPage = lazy(() => import("@/pages/protected/gradebook/broadsheet"));
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
    // The hub reads the branch lens; a teacher's own sheets ignore it.
    path: G.INDEX,
    Component: GradebookHome,
    handle: { title: "Gradebook", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    path: G.MINE,
    Component: MySheets,
    handle: { title: "My sheets" } satisfies DashboardHandle,
  },
  {
    // No lens: a class's broadsheet belongs to its branch whatever is chosen.
    path: G.BROADSHEET,
    Component: BroadsheetPage,
    handle: { title: "Broadsheet", back: G.INDEX } satisfies DashboardHandle,
  },
  {
    path: G.MODERATION,
    Component: Moderation,
    handle: { title: "Moderation", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    path: G.APPROVALS,
    Component: Approvals,
    handle: { title: "Approvals", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    path: G.HOLDS,
    Component: FeeHolds,
    handle: { title: "Fee holds", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    path: G.AMENDMENTS,
    Component: Amendments,
    handle: { title: "Corrections", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    // The class rides in `?class=`, chosen on the screen.
    path: G.RELEASE,
    Component: Release,
    handle: { title: "Report cards", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    // No lens: a class's cards belong to its branch whatever is chosen.
    path: G.CLASS_CARDS,
    Component: ClassCardsPage,
    handle: { title: "Print the class", back: G.RELEASE } satisfies DashboardHandle,
  },
  {
    path: G.REPORT_CARD,
    Component: ReportCardPage,
    handle: { title: "Report card", back: G.RELEASE } satisfies DashboardHandle,
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
