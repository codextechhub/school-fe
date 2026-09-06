"use client";
import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { HomeIcon, TeamMgtIcon } from "@/assets/navbar-svg";
import { NavAccordionProvider, NavMain } from "./nav-main";
import { routesPath } from "@/routes/routesPath";
import { useGetStudentSummaryQuery } from "@/redux/services/students/students-api";
import { useGetStaffListQuery } from "@/redux/services/staff/staff-api";
import { useGetPendingApprovalsQuery } from "@/redux/services/dashboard/workflow-api";
import { Link, useLocation } from "react-router";
import {
  Bell,
  BookOpen,
  Briefcase,
  Headset,
  MailCheck,
  CalendarClock,
  ShoppingCart,
  Wallet,
  CalendarRange,
  ArrowLeftRight,
  Building2,
  Contact,
  GraduationCap,
  ListChecks,
  Rocket,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { P, type PermissionCode } from "@/permissions";
import { useAppSelector } from "@/redux/store";
import { selectSchool, selectUser } from "@/redux/features/auth/auth-slice";
import { useSchoolLogo } from "@/hooks/use-school-logo";
import { LensRail } from "./layout/lens-pills";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { SchoolMark } from "./school-mark";

// A nav item may declare a permission (single code or a list). When absent the
// item always renders. `permissionMode` decides whether a list requires ANY
// (default) or ALL of the listed codes.
type NavPermission = PermissionCode | PermissionCode[] | null | undefined;

interface NavItem {
  /** Show a trailing arrow: this link opens a different area, and the sidebar
   *  changes under you. Finance and Procurement are separate consoles. */
  affordance?: boolean;
  title: string;
  url: string;
  icon?: React.ElementType;
  isActive: boolean;
  childActive: boolean;
  permission?: NavPermission;
  permissionMode?: "any" | "all";
  /** A live count of work waiting behind this item. Omitted when there is none. */
  badge?: number;
  items?: { title: string; url: string; isActive: boolean }[];
}

/**
 * Every People screen that owns a path under /students.
 *
 * The Students directory is the only item whose URL is a prefix of the others,
 * so it is the only one that needs to say what it is NOT. Listed once here so
 * adding a screen cannot reintroduce two rows looking selected at once.
 */
export function AppSidebar({
  onboarding = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /**
   * Reduce the nav to what a school that has not gone live can actually reach.
   *
   * Overview, People, Academics and Finance are ABSENT rather than greyed out
   * or padlocked: the server refuses every one of those surfaces to a PENDING
   * tenant, and a disabled row is a promise the school can see but not use. They
   * appear at go-live, when the routes behind them start answering.
   */
  onboarding?: boolean;
}) {
  const { pathname: location, search } = useLocation();

  // The enrol form is one form with one switch, and the switch decides which
  // door it belongs to: saving an applicant is Applicants' work, enrolling is
  // the directory's. Reading the flag here is what lets the two share a path
  // without the nav having to guess - and the form keeps the parameter in the
  // address as the switch moves, so this never goes stale.
  const savingAnApplicant =
    location === routesPath.PROTECTED.STUDENTS.ENROL &&
    new URLSearchParams(search).get("applicant") === "1";

  const {
    hasPermission, hasAnyPermission, hasAllPermissions, hasModuleAccess,
  } = usePermissions();

  const school = useAppSelector(selectSchool);
  const user = useAppSelector(selectUser);
  // False at a one-branch school, where every branch-shaped control recedes.
  // Shares the branch list with the lens rail below, so it costs no request.
  const { applies: multiBranch } = useBranchLens();

  // The two live counts the design puts on the nav.
  //
  // **Skipped for a school that has not gone live**, and that is not an
  // optimisation. Every student route answers 403 TENANT_NOT_LIVE to a PENDING
  // tenant, and base-api turns that into a redirect to the not-live screen - so
  // firing this from the SIDEBAR would bounce an onboarding school off whatever
  // page they opened, on every page. Skipped equally without the permission the
  // screens themselves check, so a badge cannot count work behind a door the
  // reader may not open.
  //
  // Shares RTK Query's cache with the directory's own summary call, so this
  // costs a request per cache period rather than one per navigation.
  const { data: summary } = useGetStudentSummaryQuery(undefined, {
    skip: onboarding || !hasPermission(P.BROWSE_STUDENTS),
  });
  // Documents waiting on THIS reader. The endpoint is personal - it returns
  // only what the caller may act on - so it needs no permission key and is
  // fetched for everybody: a teacher's queue is simply empty, and the item
  // below is hidden when it is.
  const { data: pendingApprovals } = useGetPendingApprovalsQuery(undefined, {
    skip: onboarding,
  });
  // Invitations nobody has accepted. Asked for as a page of one, because the
  // figure wanted is the total in the pagination block rather than the rows -
  // fetching twenty-five people to count them would be a page of staff on every
  // screen in the app. Open before go-live, so it is NOT skipped for a pending
  // school: chasing invitations is most of what onboarding is.
  const { data: invited } = useGetStaffListQuery(
    { employment_status: "INVITED", page: 1 },
    { skip: !hasPermission(P.BROWSE_TEACHERS) },
  );
  const waiting = {
    applicants: summary?.data?.applicants,
    unassigned: summary?.data?.unassigned,
    // Undefined rather than 0 when there is nothing: the badge is for work
    // outstanding, and a nav item wearing a grey zero is noise on every screen.
    approvals: pendingApprovals?.results?.length || undefined,
    invitations: invited?.pagination?.totalItems || undefined,
  };

  const schoolName =
    school?.name ?? user?.school_name ?? "";
  // The raw school.logo is an auth-gated /media/ URL a browser <img> can't load;
  // the hook fetches it with the token and returns a renderable blob: URL.
  const logoBlobUrl = useSchoolLogo();

  // A nav item is visible when it declares no permission, or when the current
  // user satisfies the declared permission(s) per the item's mode.
  const canSee = (item: NavItem): boolean => {
    const permission = item.permission;
    if (permission === null || permission === undefined) return true;
    const codes = Array.isArray(permission) ? permission : [permission];
    if (codes.length === 1) return hasPermission(codes[0]);
    return item.permissionMode === "all"
      ? hasAllPermissions(...codes)
      : hasAnyPermission(...codes);
  };

  /**
   * Whether a door owns where the reader is.
   *
   * Lit when the location is under the door's own path AND no DEEPER door of
   * the same group claims that place. Both halves matter, and each half has
   * already broken this sidebar once:
   *
   *   - without the second, a parent lights alongside its child and two rows
   *     look selected at once;
   *   - without a door to point at, the exclusion darkens the whole group. A
   *     hand-written list of excluded paths named /students/enrol and
   *     /roles/change-requests, neither of which has a door, so opening either
   *     unlit the parent and lit nothing else - and somebody halfway through
   *     enrolling a child had no answer to "where am I?".
   *
   * Passing the sibling DOORS rather than their paths is what keeps the two
   * halves in step: a group cannot exclude a path it does not offer, and a
   * door whose claim is not a path prefix is still seen.
   */
  const owns = (url: string, deeper: NavItem[] = []) =>
    location.startsWith(url) && !deeper.some((door) => door.isActive);

  // The onboarding nav, gated like every other group. A branch admin holds
  // `onboarding.progress.view` and nothing else, so they get the Control Room
  // and no Go-Live: a nav item that answers 403 is a door drawn on a wall.
  const goLiveDoor: NavItem = {
    title: "Go-Live",
    url: routesPath.PROTECTED.ONBOARDING.GO_LIVE,
    icon: Rocket,
    isActive: location.startsWith(routesPath.PROTECTED.ONBOARDING.GO_LIVE),
    childActive: false,
    permission: P.VIEW_GO_LIVE_REQUESTS,
  };

  const onboardingNav: NavItem[] = [
    {
      title: "Control Room",
      url: routesPath.PROTECTED.ONBOARDING.INDEX,
      icon: ListChecks,
      // Every onboarding screen except Go-Live is a step opened FROM the
      // control room, so the control room is where the reader still is. An
      // exact-path match unlit the item the moment they opened a step, leaving
      // the whole sidebar dark and no answer to "where am I?".
      isActive: owns(routesPath.PROTECTED.ONBOARDING.INDEX, [goLiveDoor]),
      childActive: false,
      permission: P.VIEW_ONBOARDING,
    },
    goLiveDoor,
  ].filter(canSee);

  // The People doors other than the directory. Hoisted out of `data` so the
  // Students item can derive its exclusion from the doors that ACTUALLY
  // exist, rather than from a list kept beside them.
  //
  // That list is how the group went dark. It named /students/enrol and
  // /students/import, neither of which has a door - so opening either unlit
  // Students and lit nothing else, and a registrar halfway through enrolling
  // a child had no answer to "where am I?". The onboarding group above
  // carries a comment about the same failure; this is it again, one group
  // down.
  const peopleDoors: NavItem[] = [
    {
      title: "Applicants",
      url: routesPath.PROTECTED.STUDENTS.APPLICANTS,
      icon: UserPlus,
      isActive:
        location.startsWith(routesPath.PROTECTED.STUDENTS.APPLICANTS) ||
        savingAnApplicant,
      childActive: false,
      permission: P.BROWSE_STUDENTS,
      // Applications waiting on a decision. A job, not a total.
      badge: waiting.applicants,
    },
    {
      // Placing children, and reading a register. Its own door because the
      // unplaced list is a worklist somebody is asked to empty, not a view
      // of the directory.
      title: "Classes & Transfers",
      url: routesPath.PROTECTED.STUDENTS.ASSIGN,
      icon: ArrowLeftRight,
      isActive: location.startsWith(routesPath.PROTECTED.STUDENTS.ASSIGN),
      childActive: false,
      permission: P.ASSIGN_CLASS,
      // Children on the roll with no class. The worklist this screen exists
      // to empty, so the number belongs on its door.
      badge: waiting.unassigned,
    },
    {
      // The households. Its own door because "who do we call about this
      // family" is a question asked without a student in mind.
      title: "Guardians",
      url: routesPath.PROTECTED.STUDENTS.GUARDIANS,
      icon: Contact,
      isActive: location.startsWith(routesPath.PROTECTED.STUDENTS.GUARDIANS),
      childActive: false,
      permission: P.BROWSE_STUDENTS,
    },
    {
      // The end-of-session move. Its own door because it is a thing a school
      // does once a year, deliberately, and not a view of anything.
      title: "Promotion",
      url: routesPath.PROTECTED.STUDENTS.PROMOTION,
      icon: GraduationCap,
      isActive: location.startsWith(routesPath.PROTECTED.STUDENTS.PROMOTION),
      childActive: false,
      permission: P.MANAGE_STUDENTS,
    },
  ];

  const studentsDoor: NavItem = {
    // Student Management. Only the directory is listed today: the profile
    // hangs off it and needs no door of its own, and Applicants, Guardians,
    // Classes & Transfers and Promotion join this list in the phases that
    // build them. A nav item that 404s is a door drawn on a wall.
    //
    // The design's live counts sit on Applicants and Classes & Transfers,
    // not here: this item is the whole roll, and a count of it is a fact
    // rather than a job.
    title: "Students",
    url: routesPath.PROTECTED.STUDENTS.INDEX,
    icon: Users,
    // Every People screen lives under /students, so a bare startsWith lights
    // this row up on all of them and two items look selected at once.
    //
    // The rule is the whole intent, said once: the directory is lit when no
    // OTHER People door is. Reading `door.isActive` rather than `door.url`
    // is what makes that true of a door whose claim is not a path prefix -
    // Applicants owns the enrol form in applicant mode, and a url comparison
    // could not see it. A screen no door claims at all - enrolling a student,
    // a profile - keeps the directory lit, because that is the list the
    // reader came from.
    isActive: owns(routesPath.PROTECTED.STUDENTS.INDEX, peopleDoors),
    childActive: false,
    permission: P.BROWSE_STUDENTS,
  };

  // The staff doors other than the directory, hoisted for the same reason the
  // student ones are: the Staff item derives its exclusion from the doors that
  // actually exist rather than from a list kept beside them.
  //
  // Teaching duties joins it in the phase that builds it. The design's live
  // counts belong on these doors rather than on Staff itself: that item is
  // everybody employed, and a count of it is a fact rather than a job, while an
  // invitation nobody has accepted is work outstanding.
  const staffDoors: NavItem[] = [
    {
      title: "Invitations",
      url: routesPath.PROTECTED.STAFF.INVITATIONS,
      icon: MailCheck,
      isActive: location.startsWith(routesPath.PROTECTED.STAFF.INVITATIONS),
      childActive: false,
      permission: P.BROWSE_TEACHERS,
      badge: waiting.invitations,
    },
    // Absent at a one-branch school rather than disabled. A posting answers
    // which site somebody is based at, and a school with one site has no
    // question to put behind the door; the server answers 404 there for the
    // same reason. The screen says so too, for anybody arriving by address.
    ...(multiBranch
      ? [
          {
            title: "Posting & reach",
            url: routesPath.PROTECTED.STAFF.POSTING,
            icon: Building2,
            isActive: location.startsWith(routesPath.PROTECTED.STAFF.POSTING),
            childActive: false,
            permission: P.MODIFY_TEACHER,
          },
        ]
      : []),
  ];

  const staffDoor: NavItem = {
    // The people who work here: the bursar and the registrar as much as the
    // teacher, which is why the item says Staff and not Teachers. The backend
    // key is still `school.teachers.*`, because it is a primary key that four
    // tables point at, so the word changed and the key did not.
    title: "Staff",
    url: routesPath.PROTECTED.STAFF.INDEX,
    icon: Briefcase,
    isActive: owns(routesPath.PROTECTED.STAFF.INDEX, staffDoors),
    childActive: false,
    permission: P.BROWSE_TEACHERS,
  };

  const data: Record<string, NavItem[]> = {
    overview: [
      {
        title: "Dashboard",
        url: routesPath.PROTECTED.OVERVIEW.INDEX,
        icon: HomeIcon,
        isActive: location.startsWith(routesPath.PROTECTED.OVERVIEW.INDEX),
        childActive: false,
        permission: P.VIEW_SCHOOL_DASHBOARD,
        items: [],
      },
      {
        title: "Branches",
        url: routesPath.PROTECTED.BRANCHES.INDEX,
        icon: TeamMgtIcon,
        isActive: location.startsWith(routesPath.PROTECTED.BRANCHES.INDEX),
        childActive: false,
        permission: P.BROWSE_BRANCHES,
      },
    ],
    // Where the school and CodeX talk to each other: the post that arrived, and
    // the place you go when something is wrong. Grouped as Communication rather
    // than named after its two items, because a heading that repeats the labels
    // beneath it tells a reader nothing they cannot already see.
    //
    // Last, below everything a person actually came here to do.
    help: [
      {
        // The bell reaches this too, but a bell is for what arrived while you
        // were looking elsewhere. Somebody going back to read a go-live
        // decision from last week is navigating, and had nowhere to navigate
        // from: the page existed with no way into it but the bell.
        //
        // No permission, deliberately. A school's own post is not a capability
        // it can be missing, which is why the screen itself gates nothing.
        title: "Notifications",
        url: routesPath.PROTECTED.NOTIFICATIONS,
        icon: Bell,
        isActive: location.startsWith(routesPath.PROTECTED.NOTIFICATIONS),
        childActive: false,
      },
      {
        // No permission, like Notifications. Raising a ticket is open to
        // anybody with an account - a person who cannot reach a single other
        // screen is exactly the person who needs to say so - and what the desk
        // then shows them is the server's answer, not a nav decision.
        title: "Support",
        url: routesPath.PROTECTED.SUPPORT.INDEX,
        icon: Headset,
        isActive: location.startsWith(routesPath.PROTECTED.SUPPORT.INDEX),
        childActive: false,
      },
    ],
    people: [studentsDoor, ...peopleDoors, staffDoor, ...staffDoors],
    academics: [
      {
        // Academic Structure is the module: the overview and everything that
        // hangs off it. Submenus appear as their screens land - a nav item that
        // 404s is a door drawn on a wall, so Departments, Programmes, Subjects
        // and Assignments join this list in the phases that build them.
        title: "Academic Structure",
        url: "#",
        icon: BookOpen,
        isActive: location.startsWith(
          routesPath.PROTECTED.ACADEMIC_STRUCTURE.INDEX,
        ),
        childActive: location.startsWith(
          routesPath.PROTECTED.ACADEMIC_STRUCTURE.INDEX,
        ),
        // The group opens for anyone who can read any part of the structure;
        // each child is gated on its own key below.
        permission: [P.BROWSE_STRUCTURE, P.BROWSE_SESSIONS, P.BROWSE_CLASSES],
        permissionMode: "any",
        items: (
          [
            {
              title: "Overview",
              url: routesPath.PROTECTED.ACADEMIC_STRUCTURE.INDEX,
              // Exact match: every child below starts with this path, so
              // `includes` would light Overview on all of them.
              isActive:
                location === routesPath.PROTECTED.ACADEMIC_STRUCTURE.INDEX,
              perm: P.BROWSE_STRUCTURE,
            },
            {
              title: "Sessions & Terms",
              url: routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS,
              isActive: location.startsWith(
                routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS,
              ),
              perm: P.BROWSE_SESSIONS,
            },
            {
              title: "Departments",
              url: routesPath.PROTECTED.ACADEMIC_STRUCTURE.DEPARTMENTS,
              isActive: location.startsWith(
                routesPath.PROTECTED.ACADEMIC_STRUCTURE.DEPARTMENTS,
              ),
              perm: P.BROWSE_STRUCTURE,
            },
            {
              title: "Programmes & Levels",
              url: routesPath.PROTECTED.ACADEMIC_STRUCTURE.PROGRAMS,
              isActive: location.startsWith(
                routesPath.PROTECTED.ACADEMIC_STRUCTURE.PROGRAMS,
              ),
              perm: P.BROWSE_STRUCTURE,
            },
            {
              title: "Classes & Arms",
              url: routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASSES,
              isActive: location.startsWith(
                routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASSES,
              ),
              perm: P.BROWSE_CLASSES,
            },
            {
              title: "Subjects",
              url: routesPath.PROTECTED.ACADEMIC_STRUCTURE.SUBJECTS,
              isActive: location.startsWith(
                routesPath.PROTECTED.ACADEMIC_STRUCTURE.SUBJECTS,
              ),
              perm: P.BROWSE_SUBJECTS,
            },
            {
              title: "Assignments",
              url: routesPath.PROTECTED.ACADEMIC_STRUCTURE.ASSIGNMENTS,
              isActive: location.startsWith(
                routesPath.PROTECTED.ACADEMIC_STRUCTURE.ASSIGNMENTS,
              ),
              // Gated on classes, not structure: this screen is about who
              // teaches a class and who is in it.
              perm: P.BROWSE_CLASSES,
            },
          ] as { title: string; url: string; isActive: boolean; perm: PermissionCode }[]
        )
          .filter((sub) => hasPermission(sub.perm))
          // `perm` is this file's gate, not part of the NavItem shape.
          .map((sub) => ({ title: sub.title, url: sub.url, isActive: sub.isActive })),
      },
      {
        // Its own module now, not a child of academics management. The design
        // splits it into two siblings - what a school DATES, and what runs
        // inside those dates - and they are gated on different backend keys, so
        // a reader may hold one and not the other.
        //
        // Timetables joins this list as its screens land, following the same
        // rule the group above records: a nav item that 404s is a door drawn on
        // a wall.
        title: "Calendar",
        url: "#",
        icon: CalendarRange,
        isActive: location.startsWith(
          routesPath.PROTECTED.ACADEMIC_CALENDAR.INDEX,
        ),
        childActive: location.startsWith(
          routesPath.PROTECTED.ACADEMIC_CALENDAR.INDEX,
        ),
        permission: P.BROWSE_CALENDAR,
        items: [
          {
            title: "Overview",
            url: routesPath.PROTECTED.ACADEMIC_CALENDAR.INDEX,
            // Exact match: both children below start with this path, so
            // `startsWith` would light Overview on all three.
            isActive:
              location === routesPath.PROTECTED.ACADEMIC_CALENDAR.INDEX,
          },
          {
            title: "Events",
            url: routesPath.PROTECTED.ACADEMIC_CALENDAR.EVENTS,
            isActive: location.startsWith(
              routesPath.PROTECTED.ACADEMIC_CALENDAR.EVENTS,
            ),
          },
          {
            title: "Term view",
            url: routesPath.PROTECTED.ACADEMIC_CALENDAR.TERM_VIEW,
            isActive: location.startsWith(
              routesPath.PROTECTED.ACADEMIC_CALENDAR.TERM_VIEW,
            ),
          },
        ],
      },
      {
        // The calendar's sibling, and gated on its own key: a reader may hold
        // `academics.calendar.view` and not `academics.timetable.view`, in
        // which case this group is ABSENT rather than greyed out.
        //
        // Class timetables, Teacher timetables and Exam scheduling join this
        // list in the phases that build them.
        title: "Timetables",
        url: "#",
        icon: CalendarClock,
        isActive: location.startsWith("/timetables"),
        childActive: location.startsWith("/timetables"),
        permission: P.BROWSE_TIMETABLES,
        items: [
          {
            title: "Rooms",
            url: routesPath.PROTECTED.TIMETABLES.ROOMS,
            isActive: location.startsWith(routesPath.PROTECTED.TIMETABLES.ROOMS),
          },
          {
            title: "Bell schedule",
            url: routesPath.PROTECTED.TIMETABLES.BELL_SCHEDULE,
            isActive: location.startsWith(
              routesPath.PROTECTED.TIMETABLES.BELL_SCHEDULE,
            ),
          },
          {
            title: "Class timetables",
            url: routesPath.PROTECTED.TIMETABLES.CLASSES,
            isActive: location.startsWith(
              routesPath.PROTECTED.TIMETABLES.CLASSES,
            ),
          },
          {
            title: "Teacher timetables",
            url: routesPath.PROTECTED.TIMETABLES.TEACHERS,
            isActive: location.startsWith(
              routesPath.PROTECTED.TIMETABLES.TEACHERS,
            ),
          },
          {
            title: "Exam scheduling",
            url: routesPath.PROTECTED.TIMETABLES.EXAMS,
            isActive: location.startsWith(
              routesPath.PROTECTED.TIMETABLES.EXAMS,
            ),
          },
        ],
      },
    ],
    // Who can do what. Its own group rather than a row under People: People is
    // the children on the roll, and access is about the staff who operate the
    // system. The onboarding screen at /onboarding/roles covers the same rows
    // once during setup and then disappears; these are the permanent doors.
    administration: [
      {
        title: "Roles & Permissions",
        url: routesPath.PROTECTED.ROLES.INDEX,
        icon: ShieldCheck,
        // No deeper door under /roles, so nothing is excluded. It used to
        // exclude /roles/change-requests, which has no door - so that screen
        // darkened the whole sidebar. Approvals is not a sibling either: it
        // sits at /approvals and cannot match this path.
        isActive: owns(routesPath.PROTECTED.ROLES.INDEX),
        childActive: false,
        permission: P.VIEW_ROLES,
      },
      {
        // Documents routed for a decision. Two personal queues under one door:
        // what waits on this reader, and what they are waiting on somebody else
        // for. Always present, badge only when something waits - an inbox that
        // disappears when empty cannot be checked, and a new approver would have
        // no way to find it before their first document arrives.
        title: "Workflow",
        url: routesPath.PROTECTED.WORKFLOW.APPROVALS,
        icon: ListChecks,
        isActive: location.startsWith("/workflow"),
        childActive: location.startsWith("/workflow"),
        badge: waiting.approvals,
        items: [
          {
            title: "Approvals",
            url: routesPath.PROTECTED.WORKFLOW.APPROVALS,
            isActive: location.startsWith(routesPath.PROTECTED.WORKFLOW.APPROVALS),
          },
          {
            title: "My Submissions",
            url: routesPath.PROTECTED.WORKFLOW.MY_SUBMISSIONS,
            isActive: location.startsWith(
              routesPath.PROTECTED.WORKFLOW.MY_SUBMISSIONS,
            ),
          },
          {
            title: "Delegations",
            url: routesPath.PROTECTED.WORKFLOW.DELEGATIONS,
            isActive: location.startsWith(
              routesPath.PROTECTED.WORKFLOW.DELEGATIONS,
            ),
          },
          {
            title: "Approver Groups",
            url: routesPath.PROTECTED.WORKFLOW.APPROVER_GROUPS,
            isActive: location.startsWith(
              routesPath.PROTECTED.WORKFLOW.APPROVER_GROUPS,
            ),
          },
          ...(hasModuleAccess("workflow.template.")
            ? [{
                title: "Templates",
                url: routesPath.PROTECTED.WORKFLOW.TEMPLATES,
                isActive: location.startsWith(
                  routesPath.PROTECTED.WORKFLOW.TEMPLATES,
                ),
              }]
            : []),
        ],
      },
    ],
    // Finance and Procurement are separate consoles: opening one replaces this
    // sidebar with that area's own. They are grouped apart from the school's
    // day-to-day work for that reason, and each carries a trailing arrow so the
    // change of context is visible before the click rather than after it.
    business: [
      // Finance. The screens come from @xvs/finance, and the area builds its
      // own sub-navigation once you are inside it - this is only the door.
      //
      // Gated on holding ANY finance permission, not on one code. The package's
      // 145 codes gate individual ACTIONS (create an invoice, post a journal);
      // there is no "may use finance" code to point at, and picking one action
      // would hide the area from somebody who legitimately holds a different
      // part of it. hasModuleAccess reads the backend keys directly, which is
      // what the area's own sub-navigation already does with its prefixes.
      ...(hasModuleAccess("finance.")
        ? [{
            title: "Finance",
            url: routesPath.PROTECTED.FINANCE.INDEX,
            icon: Wallet,
            isActive: location.startsWith(routesPath.PROTECTED.FINANCE.INDEX),
            childActive: location.startsWith(routesPath.PROTECTED.FINANCE.INDEX),
            affordance: true,
          }]
        : []),
      // Procurement, gated the same way and for the same reason.
      ...(hasModuleAccess("procurement.")
        ? [{
            title: "Procurement",
            url: routesPath.PROTECTED.PROCUREMENT.INDEX,
            icon: ShoppingCart,
            isActive: location.startsWith(routesPath.PROTECTED.PROCUREMENT.INDEX),
            childActive: location.startsWith(routesPath.PROTECTED.PROCUREMENT.INDEX),
            affordance: true,
          }]
        : []),
    ],
  };

  // Filter each group's items by permission. A group whose items are all
  // filtered out is dropped entirely (its label disappears with it).
  const overview = data.overview.filter(canSee);
  const people = data.people.filter(canSee);
  const academics = data.academics.filter(canSee);
  const administration = data.administration.filter(canSee);
  const business = data.business.filter(canSee);
  const help = data.help.filter(canSee);

  const { state } = useSidebar();
  return (
    <>
      <Sidebar className="bg-white" collapsible="icon" {...props}>
        {/* h-15 with no padding, matching the page header exactly. The school
            block and the page title sit on ONE line with one continuous rule
            under both, which is how the design draws the top of the app; a
            taller block here puts a step in that line. */}
        <SidebarHeader className="h-15 justify-center border-b border-white-02 bg-white p-0 px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* The mark alone, the way the console shows its own. The name
                  and the role used to sit beside it in a block wide enough to
                  need its own truncation; the name is now one hover away and
                  the role is on the account menu, where a reader looks for it.

                  Collapsed to the icon rail there is no width for the name to
                  turn into, so it stays a plain logo there. */}
              <Link
                to={routesPath.PROTECTED.OVERVIEW.INDEX}
                aria-label={schoolName ? `${schoolName} - go to dashboard` : "Go to dashboard"}
                className="mx-auto flex h-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <SchoolMark
                  logo={logoBlobUrl}
                  name={schoolName}
                  slug={school?.slug}
                  animate={state !== "collapsed"}
                />
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        {/* One expandable group open at a time, across every group rather than
            within each - see nav-main. */}
        <SidebarContent className="bg-white pt-3">
          <NavAccordionProvider>
          {onboarding ? (
            <>
              {onboardingNav.length > 0 && (
                <NavMain items={onboardingNav} groupTitle="Onboarding" />
              )}
            </>
          ) : (
            <>
              {overview.length > 0 && (
                <NavMain items={overview} groupTitle="Overview" />
              )}
              {people.length > 0 && (
                <NavMain items={people} groupTitle="People" />
              )}
              {academics.length > 0 && (
                <NavMain items={academics} groupTitle="Academics" />
              )}
              {administration.length > 0 && (
                <NavMain items={administration} groupTitle="Administration" />
              )}
              {business.length > 0 && (
                <NavMain items={business} groupTitle="Operations" />
              )}
              {help.length > 0 && (
                <NavMain items={help} groupTitle="Communication" />
              )}
            </>
          )}
          </NavAccordionProvider>
        </SidebarContent>

        {/* The branch and session lenses, pinned under the nav so they stay put
            while it scrolls. Absent for a school with one branch and one year -
            see lens-pills. Hidden during onboarding for the same reason the
            nav is reduced there: the school has one thing to do. */}
        {!onboarding && <SidebarFooter className="bg-white p-0">
          <LensRail collapsed={state === "collapsed"} />
        </SidebarFooter>}

        <SidebarRail />
      </Sidebar>

    </>
  );
}
