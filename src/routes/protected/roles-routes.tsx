import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Route-level code splitting: each page loads on first visit instead of
// shipping in the main bundle. Suspense fallback lives in routes/lazy-root.tsx.
const Roles = lazy(() => import("@/pages/protected/roles"));
const FieldAccess = lazy(() => import("@/pages/protected/roles/field-access"));
const RoleView = lazy(() => import("@/pages/protected/roles/role-view"));
const RoleEditor = lazy(() => import("@/pages/protected/roles/role-editor"));

export const rolesRoutes = [
  {
    path: routesPath.PROTECTED.ROLES.INDEX,
    Component: Roles,
    handle: { title: "Roles & Permissions" } satisfies DashboardHandle,
  },
  {
    path: routesPath.PROTECTED.ROLES.FIELD_ACCESS,
    Component: FieldAccess,
    handle: { title: "Field Access" } satisfies DashboardHandle,
  },
  { path: routesPath.PROTECTED.ROLES.NEW, Component: RoleEditor, handle: { title: "Create Role", back: routesPath.PROTECTED.ROLES.INDEX } satisfies DashboardHandle },
  { path: routesPath.PROTECTED.ROLES.EDIT, Component: RoleEditor, handle: { title: "Edit Role", back: routesPath.PROTECTED.ROLES.INDEX } satisfies DashboardHandle },
  { path: routesPath.PROTECTED.ROLES.DETAIL, Component: RoleView, handle: { title: "Role", back: routesPath.PROTECTED.ROLES.INDEX } satisfies DashboardHandle },
] as RouteObject[];
