import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Route-level code splitting: each page loads on first visit rather than
// shipping in the main bundle. The Suspense fallback lives in routes/lazy-root.
const StaffDirectory = lazy(() => import("@/pages/protected/staff"));
const StaffProfile = lazy(() => import("@/pages/protected/staff/profile"));
const AddStaff = lazy(() => import("@/pages/protected/staff/add"));
const StaffInvitations = lazy(() => import("@/pages/protected/staff/invitations"));
const StaffPosting = lazy(() => import("@/pages/protected/staff/posting"));
const TeachingDuties = lazy(() => import("@/pages/protected/staff/teaching"));

const S = routesPath.PROTECTED.STAFF;

/**
 * Staff Management.
 *
 * **`pendingSurface`, and that is a narrower statement than it looks.** The
 * directory and the record ARE open to a school still onboarding, because the
 * backend declares `pending_tenant_surface` on them: adding colleagues is a
 * step on its checklist, and a school locked out of its own staff list during
 * setup can never finish. What is closed is the rest - the employment
 * lifecycle, leave and teaching duties all answer 403 `TENANT_NOT_LIVE`,
 * because nobody resigns during setup and there is no year to teach in yet. So
 * the routes are open and the CONTROLS inside them are gated one at a time.
 *
 * **The branch lens applies; the session lens does not.** Where somebody is
 * posted is a branch question and the directory narrows by it. Employment is
 * not per-year: a person hired in 2024 is still employed in 2026, and a year
 * pill over this list would be a control that changes nothing while looking
 * like it narrowed the page. The one thing here that IS per-year is a teaching
 * duty, and it carries its own session rather than borrowing the page's.
 */
export const staffRoutes = [
  {
    path: S.INDEX,
    Component: StaffDirectory,
    handle: {
      title: "Staff Directory",
      lens: true,
      lenses: "branch",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    path: S.ADD,
    Component: AddStaff,
    handle: {
      title: "Add staff",
      hasBack: true,
      lens: true,
      lenses: "branch",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    path: S.INVITATIONS,
    Component: StaffInvitations,
    handle: {
      title: "Invitations",
      lens: true,
      lenses: "branch",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    // Open before go-live, because the backend opens it: both the roster read
    // and the bulk move declare `pending_tenant_surface`. A school setting
    // itself up is exactly when it decides who is based where, and this app
    // mirrors the server rather than forming its own opinion - a route closed
    // here over an endpoint that answers is a door locked from the inside.
    path: S.POSTING,
    Component: StaffPosting,
    handle: {
      title: "Posting & reach",
      lens: true,
      lenses: "branch",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    // Closed before go-live, and the screen says so rather than erroring: a
    // teaching duty belongs to an academic year, and a school still being set
    // up has not started one. The backend agrees - the coverage read and every
    // teaching write declare no pending surface.
    path: S.TEACHING,
    Component: TeachingDuties,
    handle: {
      title: "Teaching duties",
      lens: true,
      lenses: "branch",
    } satisfies DashboardHandle,
  },
  {
    // Ranked routing puts the static children of /staff above this, so
    // /staff/invitations can never be read as a person called "invitations".
    path: S.PROFILE,
    Component: StaffProfile,
    handle: {
      title: "Staff Profile",
      hasBack: true,
      lens: true,
      lenses: "branch",
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
] as RouteObject[];
