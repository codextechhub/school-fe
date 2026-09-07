import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Route-level code splitting: each area page loads on first visit instead of
// shipping in the main bundle. Suspense fallback lives in routes/lazy-root.tsx.
const AcademicStructureOverview = lazy(
  () => import("@/pages/protected/academics/structure"),
);
const AcademicSession = lazy(() => import("@/pages/protected/academics/session"));
const SessionDetails = lazy(
  () => import("@/pages/protected/academics/session/session-details"),
);
const Departments = lazy(() => import("@/pages/protected/academics/departments"));
const Programs = lazy(() => import("@/pages/protected/academics/programs"));
const Subjects = lazy(() => import("@/pages/protected/academics/subjects"));
const CalendarOverview = lazy(() => import("@/pages/protected/calendar/overview"));
const CalendarEvents = lazy(() => import("@/pages/protected/calendar/events"));
const TermView = lazy(() => import("@/pages/protected/calendar/term-view"));
const Rooms = lazy(() => import("@/pages/protected/calendar/rooms"));
const BellSchedule = lazy(() => import("@/pages/protected/calendar/bell-schedule"));
const ClassTimetables = lazy(
  () => import("@/pages/protected/calendar/class-timetables"),
);
const TeacherTimetables = lazy(
  () => import("@/pages/protected/calendar/teacher-timetables"),
);
const ExamScheduling = lazy(() => import("@/pages/protected/calendar/exams"));

const S = routesPath.PROTECTED.ACADEMIC_STRUCTURE;
const C = routesPath.PROTECTED.ACADEMIC_CALENDAR;
const T = routesPath.PROTECTED.TIMETABLES;

/** Old paths that now point somewhere else. See the note beside the list. */
export function redirects(pairs: [from: string, to: string][]): RouteObject[] {
  return pairs.map(([from, to]) => ({
    path: from,
    element: <Navigate to={to} replace />,
    handle: { pendingSurface: true } satisfies DashboardHandle,
  }));
}

// `lens: true` puts the branch and session pills in the header. Only the
// Academic Structure screens read those lenses, so only they ask for them - a
// session pill over the student roster would be a filter that does nothing.
export const academicRoutes = [
  {
    path: S.INDEX,
    Component: AcademicStructureOverview,
    handle: { title: "Academic Structure", lens: true, pendingSurface: true } satisfies DashboardHandle,
  },
  {
    path: S.SESSIONS,
    Component: AcademicSession,
    handle: { title: "Sessions & Terms", lens: true, pendingSurface: true } satisfies DashboardHandle,
  },
  {
    path: S.SESSION_DETAILS,
    // Detail screens keep their parent's title and only add a back button.
    Component: SessionDetails,
    handle: {
      title: "Sessions & Terms",
      hasBack: true,
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  {
    path: S.DEPARTMENTS,
    Component: Departments,
    handle: {
      title: "Departments",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  {
    path: S.PROGRAMS,
    Component: Programs,
    handle: {
      title: "Programmes & Levels",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  {
    path: S.SUBJECTS,
    Component: Subjects,
    handle: {
      title: "Subjects",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  // The calendar half. `lens: true` on all three: every row in this module
  // belongs to one branch scope and one school year, and the overview's counts
  // are the year's - a hub with no session pill is a hub reporting a year the
  // reader did not choose.
  {
    path: C.INDEX,
    Component: CalendarOverview,
    handle: {
      title: "Calendar Overview",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    path: C.EVENTS,
    Component: CalendarEvents,
    handle: {
      title: "Calendar & Events",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    path: C.TERM_VIEW,
    Component: TermView,
    handle: {
      title: "Term Calendar View",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  // The timetable half. Same two lenses: a room belongs to a branch, and a
  // bell schedule belongs to a year - a screen showing last year's periods
  // under this year's heading is the mistake the session pill exists to stop.
  {
    path: T.ROOMS,
    Component: Rooms,
    handle: {
      title: "Rooms",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },
  {
    path: T.BELL_SCHEDULE,
    Component: BellSchedule,
    handle: {
      title: "Bell Schedule",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  {
    path: T.CLASSES,
    Component: ClassTimetables,
    handle: {
      title: "Class Timetables",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  {
    path: T.TEACHERS,
    Component: TeacherTimetables,
    handle: {
      title: "Teacher Timetables",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  {
    path: T.EXAMS,
    Component: ExamScheduling,
    handle: {
      title: "Exam Scheduling",
      lens: true,
      pendingSurface: true,
    } satisfies DashboardHandle,
  },

  // The module moved. Anything bookmarked at the old paths lands where the
  // screen actually lives rather than on a blank route.
  //
  // `pendingSurface` on a REDIRECT is not a permission decision - it is what
  // stops the layout answering first. The closed-school notice renders above the
  // outlet, so without this a pending school following an old bookmark gets
  // "this part of XVS opens when your school goes live" and the redirect never
  // runs. A redirect shows nothing and grants nothing; whatever it lands on
  // makes its own decision.
  ...redirects([
    ["/academic", S.INDEX],
    ["/academic/session", S.SESSIONS],
    ["/academic/calender", C.INDEX],
    // Assignments was a placeholder: two panels saying class teachers and
    // class lists would open once staff and student records existed. Both
    // exist now and both have screens of their own, so the placeholder was
    // left telling a school with fifteen staff that it had none. Redirected
    // rather than removed, because it sat in the nav for months and the
    // bookmark is somebody's - and to Teaching duties rather than to Classes &
    // Transfers because the class-teacher half is the one this address was
    // drawn for.
    ["/academic-structure/assignments", routesPath.PROTECTED.STAFF.TEACHING],
  ]),
] as RouteObject[];
