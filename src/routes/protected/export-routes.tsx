import { lazy } from "react";
import { type RouteObject } from "react-router";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";
import { routesPath } from "@/routes/routes-path";

/**
 * The Export Centre, served from `@xvs/finance`.
 *
 * Every prebuilt school role may run and download an export; only school_admin
 * may save a definition or share one, and only school_admin holds
 * `exports.sensitive_field.export`, which is what decides whether restricted
 * columns leave the school at all. The screens read those keys themselves, so
 * a teacher reaching Saved exports sees the list without the controls that
 * would rewrite it.
 */
const QueuesPage = lazy(() => import("@/pages/protected/export/queues"));
const FilesPage = lazy(() => import("@/pages/protected/export/files"));
const RunDetailPage = lazy(() => import("@/pages/protected/export/run-detail"));
const SavedExportsPage = lazy(() => import("@/pages/protected/export/saved"));
const ExportBuilderPage = lazy(() => import("@/pages/protected/export/builder"));

const { EXPORT } = routesPath.PROTECTED;

export const exportRoutes: RouteObject[] = [
  { path: EXPORT.SAVED, element: <SavedExportsPage />, handle: { title: "Exports" } satisfies DashboardHandle },
  { path: EXPORT.NEW, element: <ExportBuilderPage />, handle: { title: "New export" } satisfies DashboardHandle },
  { path: EXPORT.EDIT_PATH, element: <ExportBuilderPage />, handle: { title: "Edit export" } satisfies DashboardHandle },
  { path: EXPORT.FILES, element: <FilesPage />, handle: { title: "Files" } satisfies DashboardHandle },
  { path: EXPORT.RUN_PATH, element: <RunDetailPage />, handle: { title: "Export run" } satisfies DashboardHandle },
  { path: EXPORT.QUEUES, element: <QueuesPage />, handle: { title: "Queues" } satisfies DashboardHandle },
];
