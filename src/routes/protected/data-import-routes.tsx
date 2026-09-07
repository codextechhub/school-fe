import { lazy } from "react";
import { type RouteObject } from "react-router";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";
import { routesPath } from "@/routes/routes-path";

/**
 * The Data Imports console, served from `@xvs/finance`.
 *
 * Template authoring is mounted alongside the batches even though no school
 * role holds `import.templates.create` or `.manage`: the screens are shared
 * with the platform console, and gating a route on a key the caller lacks
 * refuses it in one place rather than hiding it in two. A school reaching
 * `/data-imports/templates/new` is told it may not; it does not 404.
 */
const ImportBatchesList = lazy(() => import("@/pages/protected/data-imports/batches"));
const NewImportBatch = lazy(() => import("@/pages/protected/data-imports/batches/new"));
const ViewBatch = lazy(() => import("@/pages/protected/data-imports/batches/view-batch"));
const ImportTemplatesList = lazy(() => import("@/pages/protected/data-imports/templates"));
const ViewTemplate = lazy(() => import("@/pages/protected/data-imports/templates/view"));
const NewTemplate = lazy(() => import("@/pages/protected/data-imports/templates/new"));
const EditTemplate = lazy(() => import("@/pages/protected/data-imports/templates/edit"));

const { BATCHES, TEMPLATES } = routesPath.PROTECTED.DATA_IMPORTS;

export const dataImportRoutes: RouteObject[] = [
  { path: BATCHES.INDEX, element: <ImportBatchesList />, handle: { title: "Import Batches", pendingSurface: true } satisfies DashboardHandle },
  { path: BATCHES.NEW, element: <NewImportBatch />, handle: { title: "Data Imports", back: true } satisfies DashboardHandle },
  // Open before go-live, unlike the rest of the console. Loading the initial
  // roll is an onboarding task, and the batch is where a school reads what the
  // upload did - it is also where a finished import's notification points, and
  // a school importing during setup is exactly who receives one.
  { path: BATCHES.VIEW_PATH, element: <ViewBatch />, handle: { title: "Batch Detail", back: BATCHES.INDEX, pendingSurface: true } satisfies DashboardHandle },
  { path: TEMPLATES.INDEX, element: <ImportTemplatesList />, handle: { title: "Import Templates" } satisfies DashboardHandle },
  { path: TEMPLATES.NEW, element: <NewTemplate />, handle: { title: "New Import Template", back: TEMPLATES.INDEX } satisfies DashboardHandle },
  { path: TEMPLATES.VIEW_PATH, element: <ViewTemplate />, handle: { title: "Template Detail", back: TEMPLATES.INDEX } satisfies DashboardHandle },
  { path: TEMPLATES.EDIT_PATH, element: <EditTemplate />, handle: { title: "Edit Template" } satisfies DashboardHandle },
];
