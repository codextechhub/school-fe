import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";
import { SCHOOL_SETTINGS_SECTIONS } from "@/pages/protected/settings/sections";

const SchoolSettings = lazy(() => import("@/pages/protected/settings"));

const S = routesPath.PROTECTED.SETTINGS;

/**
 * The school's Settings console: the index plus one path per section.
 *
 * Declared per section rather than as `:section`, so an address naming a
 * section that does not exist is the app's 404 and not a silent overview.
 * The overview's own address is the index, never `/settings/overview`.
 */
export const settingsRoutes = [
  {
    path: S.INDEX,
    element: <SchoolSettings />,
    handle: { title: "Settings" } satisfies DashboardHandle,
  },
  ...SCHOOL_SETTINGS_SECTIONS.filter((section) => section !== "overview").map((section) => ({
    path: `${S.INDEX}/${section}`,
    element: <SchoolSettings section={section} />,
    handle: { title: "Settings" } satisfies DashboardHandle,
  })),
] as RouteObject[];
