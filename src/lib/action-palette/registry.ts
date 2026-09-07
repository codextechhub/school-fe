/**
 * The action registry: every action a school user can type into the palette.
 *
 * Derived from what this app actually serves, not from what it might one day
 * serve. Each entry was checked against three things and agrees with all three:
 *   1. src/routes/protected/*.tsx  - the route is registered, so `to` resolves.
 *   2. src/components/app-sidebar.tsx and the screen's own gate - the `gate`
 *      here is the same key the screen checks, so the palette never offers a
 *      door that answers 403 on arrival.
 *   3. src/components/layout/app-search.tsx - the destination list this replaces.
 *
 * Finance and Procurement are NOT typed out here. They are fifty-odd screens
 * that ship inside @xvs/finance and move on a version bump, so they are derived
 * from the two console sidebars instead - see console-actions.ts for why, and
 * for what the derivation adds on the way through. Everything below is this
 * app's own, where the sidebar is built here too and there is no second list to
 * drift from.
 *
 * Deliberately absent:
 * - /onboarding/welcome and /onboarding/not-live. One is the screen before you
 *   enter, the other is where a refusal lands. Neither is somewhere a person
 *   asks to go.
 * - /onboarding/import/:batchId/validation, /students/:id and
 */
//   /students/guardians/:id. Each needs an id, and there is no id to name from
//   a search box. The student search above the actions covers the profile.
//
// ── Labels ───────────────────────────────────────────────────────────────────
// Labels lead with a verb because the matcher expands the leading verb through
// its synonym groups (see VERB_GROUPS in match.ts): "View students" is reached
// by "open students", "show students", "list students" and "see students"
// without any of those being written down. A bare noun label would match none
// of them. The noun after the verb is always the app's own word for the screen,
// so a result reads as the sidebar item or page title it opens.

import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import {
  schoolFinanceNav,
  schoolProcurementNav,
} from "@/components/layout/console-nav-for-school";
import {
  consoleActions,
  consoleCreateActions,
  type ConsoleSource,
} from "./console-actions";
import type { ActionDef, ActionRun } from "./types";

const R = routesPath.PROTECTED;

const SCHOOL_ACTIONS: ActionDef[] = [
  // ── Overview ───────────────────────────────────────────────────────────────
  {
    id: "view-dashboard",
    label: "View dashboard",
    aliases: ["overview", "home"],
    section: "Overview",
    group: "Overview",
    kind: "view",
    gate: { perm: P.VIEW_SCHOOL_DASHBOARD },
    run: { to: R.OVERVIEW.INDEX },
  },
  {
    id: "view-branches",
    label: "View branches",
    // "campuses" and "sites" are what a user may TYPE, not what we write.
    // The house rule bans the word from our own copy; it does not ban us from
    // recognising it when somebody reaches for it. These are match keys and
    // are never rendered, so they stay.
    aliases: ["campuses", "sites"],
    section: "Overview",
    group: "Branches",
    kind: "view",
    gate: { perm: P.BROWSE_BRANCHES },
    run: { to: R.BRANCHES.INDEX },
  },
  {
    // The bell's screen. Not in the sidebar, and it has no permission of its
    // own: the notifications page gates nothing, because a school's own post is
    // not a capability it can be missing.
    id: "view-notifications",
    label: "View notifications",
    aliases: ["alerts", "inbox", "bell"],
    section: "Overview",
    group: "Notifications",
    kind: "view",
    gate: null,
    run: { to: R.NOTIFICATIONS },
  },

  // ── People ─────────────────────────────────────────────────────────────────
  //
  // Gates match app-sidebar.tsx item for item. Three of these five screens are
  // reachable by a reader who holds only `BROWSE_STUDENTS`; placing a child and
  // running a promotion are separate keys because they are separate jobs.
  {
    id: "view-students",
    label: "View students",
    aliases: ["roster", "roll", "pupils", "children", "student directory"],
    section: "People",
    group: "Students",
    kind: "view",
    gate: { perm: P.BROWSE_STUDENTS },
    run: { to: R.STUDENTS.INDEX },
  },
  {
    id: "view-applicants",
    label: "View applicants",
    aliases: ["applications", "admissions", "waiting list"],
    section: "People",
    group: "Students",
    kind: "view",
    gate: { perm: P.BROWSE_STUDENTS },
    run: { to: R.STUDENTS.APPLICANTS },
  },
  {
    // A page, not a drawer, so it is a destination like any other - but it is
    // an act rather than a view, and the row carries the "Action" chip to say
    // so. `enrol` is in the matcher's create group, so "add a student" and
    // "register a child" both land here.
    id: "enrol-student",
    label: "Enrol a student",
    aliases: ["admit a child", "new student", "intake"],
    section: "People",
    group: "Students",
    kind: "do",
    gate: { perm: P.ENROLL_STUDENT },
    run: { to: R.STUDENTS.ENROL },
  },
  {
    id: "view-class-transfers",
    label: "View classes and transfers",
    aliases: ["assign a class", "place a student", "unassigned", "move a child"],
    section: "People",
    group: "Students",
    kind: "view",
    gate: { perm: P.ASSIGN_CLASS },
    run: { to: R.STUDENTS.ASSIGN },
  },
  {
    id: "view-guardians",
    label: "View guardians",
    aliases: ["parents", "households", "families", "next of kin"],
    section: "People",
    group: "Students",
    kind: "view",
    gate: { perm: P.BROWSE_STUDENTS },
    run: { to: R.STUDENTS.GUARDIANS },
  },
  {
    id: "view-promotion",
    label: "View promotion",
    aliases: ["promote students", "end of session", "move up a year"],
    section: "People",
    group: "Students",
    kind: "view",
    gate: { perm: P.MANAGE_STUDENTS },
    run: { to: R.STUDENTS.PROMOTION },
  },
  {
    // The people who work here, not only the ones who teach. The aliases carry
    // the job titles a reader actually types, because "staff" is the word the
    // product uses and "teachers" is the word a head teacher reaches for -
    // and the backend key is still `school.teachers.view`, which is the third
    // spelling of the same thing and the one nobody types.
    id: "view-staff",
    label: "View staff",
    aliases: [
      "teachers", "employees", "personnel", "staff directory", "bursar",
      "registrar", "who works here",
    ],
    section: "People",
    group: "Staff",
    kind: "view",
    gate: { perm: P.BROWSE_TEACHERS },
    run: { to: R.STAFF.INDEX },
  },
  {
    // A page rather than a drawer, so it is a destination like any other - but
    // it is an act rather than a view, and the row carries the Action chip to
    // say so. Gated on the key the screen's own button is gated on, so nobody
    // is offered a form the server would refuse to save.
    id: "add-staff",
    label: "Add a member of staff",
    aliases: ["invite a teacher", "new employee", "hire", "onboard somebody"],
    section: "People",
    group: "Staff",
    kind: "do",
    gate: { perm: P.INVITE_TEACHER },
    run: { to: R.STAFF.ADD },
  },
  {
    id: "view-teaching-duties",
    label: "View teaching duties",
    // Carries the words the withdrawn Academic Structure > Assignments action
    // answered. That screen was a placeholder and its address now redirects
    // here, so the search box should land on the same place the bookmark does.
    aliases: [
      "who teaches what", "coverage", "class teachers", "subject cover",
      "assign a subject", "gaps", "assignments", "subject teacher",
      "teaching load",
    ],
    section: "People",
    group: "Staff",
    kind: "view",
    // The read key, not the assign one. A head teacher checking which classes
    // have nobody does not need to be able to staff them.
    gate: { perm: P.BROWSE_TEACHERS },
    run: { to: R.STAFF.TEACHING },
  },
  {
    id: "view-staff-posting",
    label: "View postings and reach",
    aliases: [
      "who works at this branch", "move somebody", "based at", "branch roster",
      "reassign a branch",
    ],
    section: "People",
    group: "Staff",
    kind: "view",
    // The key the screen's own move button checks. Reading a roster and moving
    // somebody are the same key here because the screen exists to do the
    // second: a read-only roster is the directory with a branch filter.
    gate: { perm: P.MODIFY_TEACHER },
    run: { to: R.STAFF.POSTING },
  },
  {
    // Named apart from the onboarding action of nearly the same words, which is
    // a CHECKLIST STEP on a screen that disappears at go-live. This is the
    // module's permanent door, it is gated on the staff key rather than the
    // administrators one, and both are legitimately reachable while a school is
    // still being set up - so they are told apart by their labels and their
    // sections rather than by one of them being hidden.
    id: "view-pending-invitations",
    label: "View pending invitations",
    aliases: [
      "invitations", "who has not accepted", "resend an invitation",
      "withdraw an invitation",
    ],
    section: "People",
    group: "Staff",
    kind: "view",
    gate: { perm: P.BROWSE_TEACHERS },
    run: { to: R.STAFF.INVITATIONS },
  },

  // ── Academics ──────────────────────────────────────────────────────────────
  {
    id: "view-academic-structure",
    label: "View academic structure",
    aliases: ["structure", "overview", "programmes", "programs", "levels"],
    section: "Academics",
    group: "Academic structure",
    kind: "view",
    gate: { perm: P.BROWSE_STRUCTURE },
    run: { to: R.ACADEMIC_STRUCTURE.INDEX },
  },
  {
    id: "view-academic-session",
    label: "View academic session",
    aliases: ["sessions", "terms", "school year"],
    section: "Academics",
    group: "Academic structure",
    kind: "view",
    // The sidebar's Academic Structure group opens on any academics key, but
    // this child is gated on sessions alone - and so is the child link.
    gate: { perm: P.BROWSE_SESSIONS },
    run: { to: R.ACADEMIC_STRUCTURE.SESSIONS },
  },
  {
    id: "view-departments",
    label: "View departments",
    aliases: ["faculties", "faculty", "department"],
    section: "Academics",
    group: "Academic structure",
    kind: "view",
    gate: { perm: P.BROWSE_STRUCTURE },
    run: { to: R.ACADEMIC_STRUCTURE.DEPARTMENTS },
  },
  {
    id: "view-programmes",
    label: "View programmes and levels",
    aliases: ["programs", "programmes", "levels", "year groups"],
    section: "Academics",
    group: "Academic structure",
    kind: "view",
    gate: { perm: P.BROWSE_STRUCTURE },
    run: { to: R.ACADEMIC_STRUCTURE.PROGRAMS },
  },
  {
    id: "view-subjects",
    label: "View subjects",
    aliases: ["subject", "curriculum", "offered at"],
    section: "Academics",
    group: "Academic structure",
    kind: "view",
    gate: { perm: P.BROWSE_SUBJECTS },
    run: { to: R.ACADEMIC_STRUCTURE.SUBJECTS },
  },
  {
    id: "view-academic-calendar",
    label: "View academic calendar",
    // "calender" stays an alias: the old URL spelled it that way for months, so
    // it is what somebody who has used the app may still type.
    aliases: ["calendar", "calender", "events", "holidays"],
    section: "Academics",
    group: "Academic calendar",
    kind: "view",
    gate: { perm: P.BROWSE_CALENDAR },
    run: { to: R.ACADEMIC_CALENDAR.INDEX },
  },
  {
    id: "view-classes",
    label: "View classes",
    aliases: ["class list", "class rosters"],
    section: "Academics",
    group: "Academic structure",
    kind: "view",
    gate: { perm: P.BROWSE_CLASSES },
    run: { to: R.ACADEMIC_STRUCTURE.CLASSES },
  },

  {
    id: "view-calendar-events",
    label: "View events",
    aliases: ["calendar events", "add an event", "term dates", "midterm"],
    section: "Academics",
    group: "Academic calendar",
    kind: "view",
    gate: { perm: P.BROWSE_CALENDAR },
    run: { to: R.ACADEMIC_CALENDAR.EVENTS },
  },
  {
    id: "view-term-calendar",
    label: "View term calendar",
    aliases: ["term view", "this term", "by term"],
    section: "Academics",
    group: "Academic calendar",
    kind: "view",
    gate: { perm: P.BROWSE_CALENDAR },
    run: { to: R.ACADEMIC_CALENDAR.TERM_VIEW },
  },

  // The timetable half. Its own backend key: a reader may hold
  // `academics.calendar.view` and not `academics.timetable.view`, so these five
  // are gated apart from the three above rather than with them.
  {
    id: "view-rooms",
    label: "View rooms",
    aliases: ["classrooms", "venues", "labs", "halls"],
    section: "Academics",
    group: "Timetables",
    kind: "view",
    gate: { perm: P.BROWSE_TIMETABLES },
    run: { to: R.TIMETABLES.ROOMS },
  },
  {
    id: "view-bell-schedule",
    label: "View bell schedule",
    aliases: ["periods", "bells", "lesson times", "school day"],
    section: "Academics",
    group: "Timetables",
    kind: "view",
    gate: { perm: P.BROWSE_TIMETABLES },
    run: { to: R.TIMETABLES.BELL_SCHEDULE },
  },
  {
    id: "view-class-timetables",
    label: "View class timetables",
    aliases: ["timetable", "class schedule", "lesson plan"],
    section: "Academics",
    group: "Timetables",
    kind: "view",
    gate: { perm: P.BROWSE_TIMETABLES },
    run: { to: R.TIMETABLES.CLASSES },
  },
  {
    id: "view-teacher-timetables",
    label: "View teacher timetables",
    aliases: ["staff timetable", "who is free", "teacher schedule"],
    section: "Academics",
    group: "Timetables",
    kind: "view",
    gate: { perm: P.BROWSE_TIMETABLES },
    run: { to: R.TIMETABLES.TEACHERS },
  },
  {
    id: "view-exam-scheduling",
    label: "View exam scheduling",
    aliases: ["exams", "exam timetable", "sittings"],
    section: "Academics",
    group: "Timetables",
    kind: "view",
    gate: { perm: P.BROWSE_TIMETABLES },
    run: { to: R.TIMETABLES.EXAMS },
  },

  // ── Academics: the jobs, not the screens ───────────────────────────────────
  //
  // Each of these lands on a list screen with `?action=new` and the screen pops
  // its create drawer (useActionParam). Two rules hold for every one of them:
  //
  //   - the gate is the SAME key the screen's Add button is wrapped in, so the
  //     palette never offers a job whose button the reader cannot see; and
  //   - the screen re-checks that key on arrival rather than trusting the URL.
  //     A query param is typed as easily as it is clicked, and a create drawer
  //     that opens because the address said so is a way round the screen.
  //
  // A read-only year (a closed session) disables some of these buttons. That is
  // runtime state rather than a capability, so it cannot be a gate here - the
  // landing hook carries it instead, and the action simply does nothing on a
  // year nobody may edit, exactly as the disabled button does.
  {
    id: "add-department",
    label: "Add a department",
    aliases: ["faculty", "new department"],
    section: "Academics",
    group: "Academic structure",
    kind: "do",
    gate: { perm: P.CREATE_STRUCTURE },
    run: { to: `${R.ACADEMIC_STRUCTURE.DEPARTMENTS}?action=new` },
  },
  {
    id: "add-programme",
    label: "Add a programme",
    aliases: ["new level", "year group", "add a level"],
    section: "Academics",
    group: "Academic structure",
    kind: "do",
    gate: { perm: P.CREATE_STRUCTURE },
    run: { to: `${R.ACADEMIC_STRUCTURE.PROGRAMS}?action=new` },
  },
  {
    id: "add-subject",
    label: "Add a subject",
    aliases: ["new course", "put a subject on the curriculum"],
    section: "Academics",
    group: "Academic structure",
    kind: "do",
    gate: { perm: P.CREATE_SUBJECT },
    run: { to: `${R.ACADEMIC_STRUCTURE.SUBJECTS}?action=new` },
  },
  {
    id: "add-class",
    label: "Add a class",
    aliases: ["new arm", "open a class"],
    section: "Academics",
    group: "Academic structure",
    kind: "do",
    gate: { perm: P.CREATE_CLASS },
    run: { to: `${R.ACADEMIC_STRUCTURE.CLASSES}?action=new` },
  },
  {
    id: "add-session",
    label: "Add a session",
    aliases: ["new school year", "start a session", "new term"],
    section: "Academics",
    group: "Academic structure",
    kind: "do",
    gate: { perm: P.CREATE_SESSION },
    run: { to: `${R.ACADEMIC_STRUCTURE.SESSIONS}?action=new` },
  },
  {
    id: "add-event",
    label: "Add an event",
    aliases: ["new holiday", "midterm break", "put a date on the calendar"],
    section: "Academics",
    group: "Academic calendar",
    kind: "do",
    gate: { perm: P.CREATE_CALENDAR_EVENT },
    run: { to: `${R.ACADEMIC_CALENDAR.EVENTS}?action=new` },
  },
  {
    id: "add-room",
    label: "Add a room",
    aliases: ["new classroom", "new venue", "add a lab"],
    section: "Academics",
    group: "Timetables",
    kind: "do",
    gate: { perm: P.CREATE_TIMETABLE_ENTRY },
    run: { to: `${R.TIMETABLES.ROOMS}?action=new` },
  },
  {
    id: "add-period",
    label: "Add a period",
    aliases: ["new bell", "lesson time", "add to the bell schedule"],
    section: "Academics",
    group: "Timetables",
    kind: "do",
    gate: { perm: P.CREATE_TIMETABLE_ENTRY },
    run: { to: `${R.TIMETABLES.BELL_SCHEDULE}?action=new` },
  },

  // ── Onboarding ─────────────────────────────────────────────────────────────
  {
    id: "view-control-room",
    label: "View control room",
    aliases: ["control room", "onboarding", "checklist", "setup"],
    section: "Onboarding",
    group: "Control room",
    kind: "view",
    gate: { perm: P.VIEW_ONBOARDING },
    run: { to: R.ONBOARDING.INDEX },
  },
  {
    id: "view-school-profile",
    label: "View school profile",
    aliases: ["school details", "ownership", "term structure", "currency"],
    section: "Onboarding",
    group: "School profile",
    kind: "view",
    // A branch admin may read the profile and not edit it, so the action is
    // gated on the read key. The screen hides its own Save behind the update
    // key (see school-profile.tsx).
    gate: { perm: P.VIEW_SCHOOL_PROFILE },
    run: { to: R.ONBOARDING.PROFILE },
  },
  {
    id: "view-roles",
    label: "View roles and permissions",
    aliases: ["rbac", "permissions", "role templates"],
    section: "Onboarding",
    group: "Roles and invitations",
    kind: "view",
    // Only school_admin holds school.roles.view. A branch admin holds none of
    // the roles keys and the screen answers them a refusal panel, so the
    // action is hidden rather than offered and then refused.
    gate: { perm: P.VIEW_ROLES },
    run: { to: R.ONBOARDING.ROLES },
  },
  {
    // The same screen as above, opened on its second tab. Two actions rather
    // than one because they are two different permissions and two different
    // jobs: a branch admin can reach the invitations tab and not the roles one.
    id: "view-staff-invitations",
    label: "View staff invitations",
    aliases: ["invite", "invitations", "invite staff", "onboard admin"],
    section: "Onboarding",
    group: "Roles and invitations",
    kind: "view",
    gate: { perm: P.BROWSE_ADMINISTRATORS },
    run: { to: R.ONBOARDING.STAFF },
  },
  {
    id: "upload-datasets",
    label: "Upload datasets",
    aliases: ["import", "csv", "spreadsheet", "bulk upload"],
    section: "Onboarding",
    group: "Upload datasets",
    kind: "do",
    // Matches the control room card's own openPermission: the screen's first
    // request is the template list, and a reader who cannot read that has
    // nothing to choose from.
    gate: { perm: P.VIEW_IMPORT_TEMPLATES },
    run: { to: R.ONBOARDING.IMPORT },
  },
  {
    id: "view-go-live",
    label: "View go-live",
    aliases: ["go live", "launch", "readiness", "request go-live"],
    section: "Onboarding",
    group: "Go-live",
    kind: "view",
    // The sidebar's own gate. Submitting needs REQUEST_GO_LIVE on top, which
    // the screen checks for itself before drawing the form.
    gate: { perm: P.VIEW_GO_LIVE_REQUESTS },
    run: { to: R.ONBOARDING.GO_LIVE },
  },
  {
    // The desk, as opposed to the form. "Get help" below files a ticket; this
    // opens the list of what has already been raised, which is where somebody
    // goes to read an answer rather than to ask a question.
    id: "view-support",
    label: "View support tickets",
    aliases: ["support desk", "my tickets", "raised issues", "helpdesk"],
    section: "Onboarding",
    group: "Help",
    kind: "view",
    // Open to everybody, like the screen. What the desk then lists is the
    // server's answer per reader.
    gate: null,
    run: { to: R.SUPPORT.INDEX },
  },
  {
    id: "get-help",
    label: "Get help",
    aliases: ["support", "raise ticket", "contact codex", "report a problem"],
    section: "Onboarding",
    group: "Help",
    kind: "do",
    // Open to everyone: a person who cannot reach a single other screen is
    // exactly the person who needs to say so.
    gate: null,
    // Opens the header's panel rather than navigating. Support is one surface
    // now that the sidebar has no Help item, and the panel keeps the screen
    // being reported on visible behind it.
    run: { command: "help" },
  },

  // ── Administration ─────────────────────────────────────────────────────────
  // The permanent doors under Administration, matching app-sidebar.tsx. Roles
  // is gated on the same key its sidebar item is; the change-requests queue has
  // no door of its own and is reached from the roles screen, so it is gated on
  // the key that lets a reader act on one.
  {
    id: "view-school-roles",
    label: "View roles and access",
    aliases: ["rbac", "permissions", "who can do what", "access"],
    section: "Settings",
    group: "Administration",
    kind: "view",
    gate: { perm: P.VIEW_ROLES },
    run: { to: R.ROLES.INDEX },
  },
  {
    id: "view-role-change-requests",
    label: "View role change requests",
    aliases: ["maker checker", "role approvals", "pending role changes"],
    section: "Settings",
    group: "Administration",
    kind: "view",
    gate: { perm: P.APPROVE_ROLE_CHANGE },
    run: { to: R.ROLES.CHANGE_REQUESTS },
  },

  // ── Workflow ───────────────────────────────────────────────────────────────
  // The first four carry no gate, exactly as the sidebar's own items do not: an
  // approval queue is the reader's own post, and a key would hide a document
  // waiting on them. Templates are the rule everybody else is judged by, so
  // they are gated on the module the sidebar tests for the same item.
  {
    id: "view-approvals",
    // "View approvals" belongs to the Procurement console, which has an
    // approvals screen of its own at /procurement/approvals. This is the
    // school-wide inbox, so it says inbox; "approvals" stays an alias, and the
    // two results sit under their own section headers when both match.
    label: "View approval inbox",
    aliases: ["approvals", "pending approvals", "waiting on me"],
    section: "Settings",
    group: "Workflow",
    kind: "view",
    gate: null,
    run: { to: R.WORKFLOW.APPROVALS },
  },
  {
    id: "view-my-submissions",
    label: "View my submissions",
    aliases: ["submissions", "what I sent", "waiting on others"],
    section: "Settings",
    group: "Workflow",
    kind: "view",
    gate: null,
    run: { to: R.WORKFLOW.MY_SUBMISSIONS },
  },
  {
    id: "view-delegations",
    label: "View delegations",
    aliases: ["delegate approvals", "cover for me", "out of office"],
    section: "Settings",
    group: "Workflow",
    kind: "view",
    gate: null,
    run: { to: R.WORKFLOW.DELEGATIONS },
  },
  {
    id: "view-approver-groups",
    label: "View approver groups",
    aliases: ["approver pools", "approval groups"],
    section: "Settings",
    group: "Workflow",
    kind: "view",
    gate: null,
    run: { to: R.WORKFLOW.APPROVER_GROUPS },
  },
  {
    // No "create workflow template" beside this one. A school adjusts the
    // approval paths it was given rather than authoring new ones, so the
    // builder is mounted only on EDIT and there is no address to send anybody
    // to - see workflow-routes.tsx and createsWorkflowTemplates in xvs-host.
    id: "view-workflow-templates",
    label: "View workflow templates",
    aliases: ["approval rules", "workflow rules"],
    section: "Settings",
    group: "Workflow",
    kind: "view",
    gate: { module: ["workflow.template."] },
    run: { to: R.WORKFLOW.TEMPLATES },
  },

  // ── Data Imports and the Export Centre ─────────────────────────────────────
  // Both consoles ship in @xvs/finance and are shared with CodeX, but unlike
  // Finance and Procurement they are a handful of screens rather than fifty, and
  // this app mounts them from its own route table rather than from a package
  // sidebar. So they are written out here, and each gate is the key its screen
  // checks on arrival: a school holds none of the template-authoring keys, and
  // those two actions simply never appear rather than appearing and refusing.
  {
    id: "view-import-batches",
    label: "View import batches",
    aliases: ["imports", "batches", "upload history", "data imports"],
    section: "Data",
    group: "Data Imports",
    kind: "view",
    gate: { perm: P.VIEW_IMPORT_BATCHES },
    run: { to: R.DATA_IMPORTS.BATCHES.INDEX },
  },
  {
    id: "upload-import-batch",
    label: "Upload import batch",
    aliases: ["new batch", "bulk upload", "import data", "csv", "spreadsheet"],
    section: "Data",
    group: "Data Imports",
    kind: "do",
    gate: { perm: P.UPLOAD_IMPORT_BATCH },
    run: { to: R.DATA_IMPORTS.BATCHES.NEW },
  },
  {
    id: "view-import-templates",
    label: "View import templates",
    aliases: ["templates", "import templates"],
    section: "Data",
    group: "Data Imports",
    kind: "view",
    gate: { perm: P.VIEW_IMPORT_TEMPLATES },
    run: { to: R.DATA_IMPORTS.TEMPLATES.INDEX },
  },
  {
    // Platform-only. A school picks a template; it does not write one, so
    // nobody here holds import.templates.create and the action stays hidden.
    id: "create-import-template",
    label: "Create import template",
    aliases: ["new template"],
    section: "Data",
    group: "Data Imports",
    kind: "do",
    gate: { perm: P.CREATE_IMPORT_TEMPLATE },
    run: { to: R.DATA_IMPORTS.TEMPLATES.NEW },
  },
  {
    id: "view-saved-exports",
    label: "View exports",
    aliases: ["saved exports", "export definitions", "my export list"],
    section: "Data",
    group: "Export",
    kind: "view",
    gate: { perm: P.VIEW_SAVED_EXPORTS },
    run: { to: R.EXPORT.SAVED },
  },
  {
    id: "create-export",
    label: "Create export",
    aliases: ["new export", "export builder", "build export"],
    section: "Data",
    group: "Export",
    kind: "do",
    gate: { perm: P.CREATE_EXPORT },
    run: { to: R.EXPORT.NEW },
  },
  {
    id: "view-export-files",
    label: "View export files",
    aliases: ["files", "export runs", "generated files"],
    section: "Data",
    group: "Export",
    kind: "view",
    gate: { perm: P.VIEW_EXPORT_RUNS },
    run: { to: R.EXPORT.FILES },
  },
  {
    // No gate, because the screen has none: the queue is the caller's own work,
    // and the server decides from the row's owner whether they may see beyond
    // it. A key here would hide a reader's own exports from them.
    id: "view-export-queues",
    label: "View export queues",
    aliases: ["queues", "my exports", "downloads"],
    section: "Data",
    group: "Export",
    kind: "view",
    gate: null,
    run: { to: R.EXPORT.QUEUES },
  },

  // ── Account ────────────────────────────────────────────────────────────────
  {
    id: "proxy-user",
    label: "Proxy user",
    aliases: ["view as another user", "impersonate", "act as"],
    section: "Account",
    group: "Account",
    kind: "do",
    // The header gates this on the ORIGINAL actor's keys, not the effective
    // ones, so the control stays put during a live proxy session. Phase 4 must
    // feed the palette the same actor permissions (selectActorPermissions) for
    // this gate to agree with the menu it mirrors.
    gate: { perm: P.START_PROXY_SESSION },
    run: { command: "proxy" },
  },
  {
    id: "logout",
    label: "Logout",
    aliases: ["sign out", "log out"],
    section: "Account",
    group: "Account",
    kind: "do",
    gate: null,
    run: { command: "logout" },
  },
];

/**
 * ── The two consoles ─────────────────────────────────────────────────────────
 *
 * `modulePrefix` mirrors the sidebar's own door test: app-sidebar.tsx draws the
 * Finance item on `hasModuleAccess("finance.")` rather than on a named code,
 * because the package's 145 codes gate individual ACTIONS and there is no "may
 * use finance" key to point at. The handful of nav items with no prefixes of
 * their own (both dashboards, and Approvals) inherit that same test.
 */
const CONSOLES = [
  {
    nav: schoolFinanceNav,
    section: "Finance",
    name: "Finance",
    modulePrefix: "finance.",
  },
  {
    nav: schoolProcurementNav,
    section: "Procurement",
    name: "Procurement",
    modulePrefix: "procurement.",
  },
] satisfies ConsoleSource[];

export const CONSOLE_ACTIONS: ActionDef[] = [
  ...consoleActions(CONSOLES),
  // The jobs. Gated on the create key rather than the screen's read prefix:
  // reading invoices and raising one are different capabilities, and the row
  // has to agree with the button.
  ...consoleCreateActions(CONSOLES),
];

export const ACTIONS: ActionDef[] = [...SCHOOL_ACTIONS, ...CONSOLE_ACTIONS];

/**
 * ── Readiness, which is not a permission ─────────────────────────────────────
 *
 * ActionDef has no field for "only before go-live" / "only after", and that is
 * correct: readiness is tenant state, not a capability, and a gate that mixed
 * the two would be a gate nobody could reason about. The distinction still
 * exists in the app, so it is recorded here for the palette UI to apply.
 *
 * LIVE_ONLY_ACTION_IDS is the load-bearing half. A pending school reaches
 * onboarding and a short list of setup screens; DashboardLayout draws the
 * closed wall over everything else and the server answers 403 TENANT_NOT_LIVE
 * behind it. Offering "View students" to a school still being set up sends the
 * reader to that wall, so the palette UI MUST drop these while pending.
 *
 * It is DERIVED from the destination rather than typed out, because the router
 * already answers this per screen and the typed copy was already wrong. The
 * wall is `tenantIsPending && !onboardingRoute && !pendingSurface` (see
 * dashboard-layout.tsx), and `pendingSurface: true` sits on the handle of every
 * screen a school may use before go-live. The old list named Sessions & Terms,
 * Classes & Arms and the academic calendar as live-only. All three are pending
 * surfaces - building the academic structure is a REQUIRED go-live task - so
 * the palette hid three setup screens from precisely the schools that had to
 * finish them, while the sidebar went on offering all three.
 *
 * The prefixes below are those pending surfaces. registry.test.ts checks them
 * against the route tables, so mounting a new pre-live screen and forgetting
 * this list fails a test rather than quietly removing a door.
 */
const PENDING_SURFACE_PREFIXES: readonly string[] = [
  "/onboarding",
  "/notifications",
  // The staff module, minus one screen. Adding colleagues, chasing their
  // invitations and deciding who is based where are all steps on a school's own
  // checklist, and the backend declares `pending_tenant_surface` on each of
  // them. Teaching duties is the exception and is EXCLUDED below: a duty
  // belongs to an academic year and a school being set up has not started one.
  "/staff",
  // A school still being set up is exactly when it needs to ask for help, and
  // needs somewhere to read the answer.
  "/support",
  "/academic-structure",
  "/academic-calendar",
  "/timetables",
];

/**
 * Is this destination one a school may open before go-live?
 *
 * Exported because it is the claim that has to be true, not an implementation
 * detail: registry.test.ts holds it against every path the router mounts, so
 * this answer and `pendingSurface` on the route handle cannot drift apart.
 */
/**
 * Screens under a pending-surface prefix that are nonetheless closed.
 *
 * One entry, and it earns its exception: every other staff screen is open
 * before go-live, so excluding the module wholesale would hide four working
 * doors to spare one. Teaching duties needs an academic year, which a school
 * being set up has not started, and its route handle says the same.
 *
 * Subtracted HERE rather than in the action filter below, because this is the
 * one function that answers "does this path open before go-live" - and the
 * test that checks the answer against every route handle reads it too. Applied
 * anywhere else, the two directions would disagree.
 */
const LIVE_ONLY_PATHS: readonly string[] = ["/staff/teaching"];

export const pathOpensBeforeGoLive = (to: string): boolean =>
  !LIVE_ONLY_PATHS.includes(to) &&
  PENDING_SURFACE_PREFIXES.some(
    (prefix) => to === prefix || to.startsWith(`${prefix}/`),
  );

/** A command has no destination to close, and none of the three are closed. */
const opensBeforeGoLive = (run: ActionRun): boolean =>
  !("to" in run) || pathOpensBeforeGoLive(run.to);

export const LIVE_ONLY_ACTION_IDS: readonly string[] = ACTIONS.filter(
  (action) => !opensBeforeGoLive(action.run),
).map((action) => action.id);

/**
 * PENDING_ONLY_ACTION_IDS is the softer half, and only tidiness. These screens
 * keep working after go-live (the control room becomes a read-only record of
 * the setup, and Get Help is a support form at any time), but the sidebar stops
 * drawing them, so a live school has no other route to them. Today's header
 * search hides them after go-live; whether the palette should is a judgement
 * call for the UI, not a fact about reachability.
 */
export const PENDING_ONLY_ACTION_IDS: readonly string[] = [
  "view-control-room",
  "view-school-profile",
  "view-roles",
  "view-staff-invitations",
  "upload-datasets",
  "view-go-live",
  "get-help",
];
