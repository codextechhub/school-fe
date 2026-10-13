import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

const AttendanceToday = lazy(() => import("@/pages/protected/attendance/today"));
const ClassRegisters = lazy(() => import("@/pages/protected/attendance/registers"));
const ClassRegister = lazy(() => import("@/pages/protected/attendance/register"));
const AttendanceCorrections = lazy(() => import("@/pages/protected/attendance/corrections"));
const AttendanceReports = lazy(() => import("@/pages/protected/attendance/reports"));
const AttendanceLessons = lazy(() => import("@/pages/protected/attendance/lessons"));
const LessonRegisterPage = lazy(() => import("@/pages/protected/attendance/lesson"));
const StaffRegisterPage = lazy(() => import("@/pages/protected/attendance/staff"));

const A = routesPath.PROTECTED.ATTENDANCE;

/**
 * The attendance screens.
 *
 * Closed before go-live, like the backend: a school that has not gone live has
 * nobody placed in a class, so there is no register to take.
 *
 * The branch lens only. A register belongs to a day, not to a school year, and
 * the day is chosen on the screen itself, so a session pill would be a control
 * that changes nothing.
 */
export const attendanceRoutes = [
  {
    path: A.INDEX,
    Component: AttendanceToday,
    handle: { title: "Attendance", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    path: A.REGISTERS,
    Component: ClassRegisters,
    handle: { title: "Class registers", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    // No lens: one class's register belongs to that class's branch whatever
    // the selector says. Back names Today, because a register is opened from
    // Today, the class list and a teacher's own cards alike.
    path: A.REGISTER,
    Component: ClassRegister,
    handle: { title: "Daily register", back: A.INDEX } satisfies DashboardHandle,
  },
  {
    path: A.CORRECTIONS,
    Component: AttendanceCorrections,
    handle: { title: "Corrections", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    // A term is chosen on the screen, from the terms the report knows, so
    // only the branch lens applies.
    path: A.REPORTS,
    Component: AttendanceReports,
    handle: { title: "Attendance reports", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    path: A.LESSONS,
    Component: AttendanceLessons,
    handle: { title: "Lesson registers", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
  {
    path: A.LESSON,
    Component: LessonRegisterPage,
    handle: { title: "Lesson register", back: A.INDEX } satisfies DashboardHandle,
  },
  {
    path: A.STAFF,
    Component: StaffRegisterPage,
    handle: { title: "Staff register", lens: true, lenses: "branch" } satisfies DashboardHandle,
  },
] as RouteObject[];
