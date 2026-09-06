import {
  P as FINANCE_CODES,
  FINANCE_PERMISSION_REGISTRY as FINANCE_REGISTRY,
} from "@xvs/finance/permissions";

/**
 * PERMISSION REGISTRY
 *
 * Single source of truth. The backend permission keys ("module.resource.action")
 * exist ONLY inside REGISTRY below - nowhere else in the codebase.
 *
 * P.* names describe what the user is doing in the UI, not how the backend
 * models the permission. A reader of any other file cannot infer the backend
 * key format from the constant name alone.
 *
 * ── Code format: MM RR AA (6 digits) ─────────────────────────────────────────
 *   MM = module group   10=school  20=onboarding  30=academics  40=import
 *                       92=exports (the Export Centre, shared with console-fe)
 *   RR = resource       01 02 03 … (assigned sequentially per module)
 *   AA = action         01=view   02=create  03=update  04=delete
 *                       05=approve 08=manage  09=suspend  10=reactivate
 *                       11=assign  12=start   13=end   14=run   15=execute
 *                       16=publish 17=import  18=export  19=apply
 *                       39=view_sensitive
 *
 * ── Adding a permission ───────────────────────────────────────────────────────
 *   1. Pick the next free code in the right MM RR range.
 *   2. Add  "MMRRAA": "module.resource.action"  to REGISTRY.
 *   3. Add a named constant to P that describes the UI capability.
 *   4. Use P.YOUR_CONSTANT everywhere - never the raw key or the code directly.
 *
 * ── Adding a new module ───────────────────────────────────────────────────────
 *   1. Pick the next free MM.
 *   2. Start RR at 01 and AA at 01 within that range.
 *   3. Add a comment block and constants to P below.
 */

const REGISTRY: Record<string, string> = {
  // Shipped with the package's codes: a code with no mapping resolves to ""
  // and the screen then gates on nothing.
  ...FINANCE_REGISTRY,

  // ── school / dashboard  (MM=10, RR=01) ─────────────────────────────────────
  "100101": "school.dashboard.view",

  // ── school / branches  (MM=10, RR=02) ──────────────────────────────────────
  "100201": "school.branches.view",
  "100202": "school.branches.create",
  "100203": "school.branches.update",
  "100208": "school.branches.manage",

  // ── school / students  (MM=10, RR=03) ──────────────────────────────────────
  "100301": "school.students.view",
  "100302": "school.students.create",
  "100303": "school.students.update",
  "100308": "school.students.manage",
  "100317": "school.students.import",
  "100318": "school.students.export",
  "100339": "school.students.view_sensitive",

  // ── school / teachers  (MM=10, RR=04) ──────────────────────────────────────
  // The resource is `teachers` and not `staff`: the key is a primary key that
  // four backend tables point at, so it stays as it is and the description
  // moved instead. These keys govern the bursar and the registrar too.
  "100401": "school.teachers.view",
  "100402": "school.teachers.create",
  "100403": "school.teachers.update",
  "100408": "school.teachers.manage",
  "100411": "school.teachers.assign",

  // ── school / staff leave  (MM=10, RR=10) ───────────────────────────────────
  // A resource of its own rather than more teacher verbs, because who is off
  // sick is not something every colleague may read: `.view` reaches the two
  // admin roles only, while `.apply` reaches teachers as well, since applying
  // for leave is the one thing every member of staff does.
  "101001": "school.leave.view",
  "101008": "school.leave.manage",
  "101019": "school.leave.apply",

  // ── school / administrators  (MM=10, RR=05) ────────────────────────────────
  "100501": "school.administrators.view",
  "100502": "school.administrators.create",
  "100503": "school.administrators.update",
  "100509": "school.administrators.suspend",
  "100510": "school.administrators.reactivate",

  // ── school / fees  (MM=10, RR=06) ──────────────────────────────────────────
  "100601": "school.fees.view",
  "100608": "school.fees.manage",

  // ── school / settings  (MM=10, RR=07) ──────────────────────────────────────
  "100701": "school.settings.view",
  "100708": "school.settings.manage",

  // ── school / profile  (MM=10, RR=12) ───────────────────────────────────────
  // The school's own identity record: ownership type, term structure, currency,
  // address, website, motto, registration id and logo. NOT its name, address or
  // code - CodeX allocates those at creation and they stay on the platform
  // endpoint. `.update` is school_admin only; a branch admin may read.
  "101201": "school.profile.view",
  "101203": "school.profile.update",

  // ── school / roles  (MM=10, RR=08) ─────────────────────────────────────────
  // All five are seeded to school_admin and to NOBODY else - a branch admin
  // holds none of them, which is why the onboarding roles card hides its own
  // button rather than opening a screen that would 403.
  "100801": "school.roles.view",
  "100802": "school.roles.create",
  "100803": "school.roles.update",
  "100804": "school.roles.delete",
  // Approving a role CHANGE, not a role. vs_rbac routes a sensitive edit through
  // maker-checker and reads this key (`ROLE_APPROVE_KEYS` in vs_rbac/views.py);
  // seeded CRITICAL to school_admin only.
  "100805": "school.roles.approve",
  "100811": "school.roles.assign",

  // ── school / impersonation  (MM=10, RR=09) ─────────────────────────────────
  // School-scoped proxy: act as another active user in your OWN school. The
  // backend seeds these to school_admin only (see the backend's
  // seed_school_permissions.py, whose table must stay in lockstep with this
  // registry). Deliberately a separate namespace from platform.impersonation.*
  // - a school key can never reach across tenants.
  "100901": "school.impersonation.view",
  "100912": "school.impersonation.start",
  "100913": "school.impersonation.end",

  // ── school / per-user permission exceptions  (MM=10, RR=13) ────────────────
  // CRITICAL + restricted, school_admin only. `.view` is as restricted as
  // `.manage` on purpose: without it a user must not be able to learn that
  // exceptions exist on their own account. No screen reads these yet - the
  // codes are here so the registry matches what the backend grants.
  "101301": "school.user_overrides.view",
  "101308": "school.user_overrides.manage",

  // ── onboarding / progress  (MM=20, RR=01) ──────────────────────────────────
  // The control room's own keys. Approve, reject and reinstate are deliberately
  // absent: they are CodeX's decisions, taken from the console, and the backend
  // refuses them to any caller outside the platform tenant however the key was
  // acquired.
  "200101": "onboarding.progress.view",

  // ── onboarding / task  (MM=20, RR=02) ──────────────────────────────────────
  "200203": "onboarding.task.update",

  // ── onboarding / go-live  (MM=20, RR=03) ───────────────────────────────────
  "200301": "onboarding.go_live.view",
  "200302": "onboarding.go_live.submit",

  // ── import / templates  (MM=40, RR=01) ─────────────────────────────────────
  // A school reads the template list to choose one. It is NOT offered CodeX's
  // own provisioning templates - the server withholds those, and a school that
  // names one anyway is refused. See backend vs_import_data/datasets.py.
  "400101": "import.templates.view",

  // ── import / batches  (MM=40, RR=02) ───────────────────────────────────────
  "400201": "import.batches.view",
  "400202": "import.batches.create",
  // Two separate verbs on purpose: checking a file is not importing it, and a
  // reader allowed to check may not be the one allowed to commit.
  "400214": "import.batches.run",
  "400215": "import.batches.import",

  // ── import / validations  (MM=40, RR=03) ───────────────────────────────────
  "400301": "import.validations.view",

  // ── import / jobs  (MM=40, RR=04) ──────────────────────────────────────────
  "400401": "import.jobs.view",

  // ── academics / session  (MM=30, RR=01) ────────────────────────────────────
  "300101": "academics.session.view",
  "300102": "academics.session.create",
  "300103": "academics.session.update",
  "300108": "academics.session.manage",

  // ── academics / calendar  (MM=30, RR=02) ───────────────────────────────────
  "300201": "academics.calendar.view",
  "300202": "academics.calendar.create",
  "300203": "academics.calendar.update",
  "300208": "academics.calendar.manage",

  // ── academics / classes  (MM=30, RR=03) ────────────────────────────────────
  "300301": "academics.classes.view",
  "300302": "academics.classes.create",
  "300303": "academics.classes.update",
  "300308": "academics.classes.manage",
  "300311": "academics.classes.assign",

  // ── Export Centre  (MM=92) - vs_exports.constants.ExportPermission ─────────
  // The same codes console-fe uses, because it is the same module and the same
  // keys. NOT held by any school role today: seed_exports_permissions grants
  // these to platform roles on the codex tenant only, so every export surface
  // here is absent rather than refused until that changes. Registered so the
  // gate can be written once and start working the day the key is granted.
  "920101": "exports.catalogue.view",
  "920302": "exports.run.create",
  "920446": "exports.file.download",

  // ── academics / structure  (MM=30, RR=04) ──────────────────────────────────
  // Departments, programs and levels. One resource because they are one screen
  // group and one mental object to a school - see the backend's
  // seed_school_permissions.py, whose table this must stay in lockstep with.
  // `.manage` is the DELETE verb on all three; bulk level creation is `.create`.
  "300401": "academics.structure.view",
  "300402": "academics.structure.create",
  "300403": "academics.structure.update",
  "300408": "academics.structure.manage",

  // ── academics / subject  (MM=30, RR=05) ────────────────────────────────────
  // Subjects and the levels they are offered at. Editing offerings is `.update`,
  // not `.manage` - `.manage` is the DELETE verb.
  "300501": "academics.subject.view",
  "300502": "academics.subject.create",
  "300503": "academics.subject.update",
  "300508": "academics.subject.manage",

  // ── academics / timetable  (MM=30, RR=06) ──────────────────────────────────
  // Rooms, the bell schedule, class timetables and exam scheduling: one
  // resource, because the backend seeds one. NOT four more uses of the calendar
  // keys - adding a public holiday and rebuilding the school's entire timetable
  // are not one act, and merging them would hand `academics.calendar.manage` to
  // anyone who may edit a lesson.
  //
  // `.manage` is the DELETE verb here as everywhere else, and it is also what
  // "Clear this class's timetable" demands. `.publish` is its own action rather
  // than part of `.manage`: a branch admin publishes a timetable and does not
  // delete one, so the two cannot share a key.
  "300601": "academics.timetable.view",
  "300602": "academics.timetable.create",
  "300603": "academics.timetable.update",
  "300608": "academics.timetable.manage",
  "300616": "academics.timetable.publish",

  // ── platform surfaces the shared screens reach  (MM=11) ────────────────────
  // Platform keys, deliberately outside the school namespace at MM=10, and the
  // only two here. The approval screens come from @xvs/finance and read this
  // registry, so a key they name has to resolve even when the resource it
  // guards is not the school's own.
  //
  // The staff directory behind `platform.team.view` is tenant-scoped by the
  // backend: a school admin holding it lists their own school's people and
  // nobody else's, which is what makes it safe to grant here. RR and AA match
  // the console's numbering for the same two resources so the pair can be read
  // side by side; only MM differs, because MM=10 is already this app's own.
  "110301": "platform.team.view",

  // Codex's org chart, and the endpoint behind it answers to CX staff alone. No
  // school role holds this, which is the point: an organogram-sourced approval
  // stage cannot resolve an approver for a school, so the builder must not
  // offer the source at all. A school's own organogram would be its own
  // resource under a `school.organogram.*` key rather than this one.
  "110901": "platform.organogram.view",

  // ── workflow / templates  (MM=60, RR=01) ───────────────────────────────────
  // The approval screens belong to @xvs/finance and read this app's registry,
  // so every workflow code a shared screen names has to resolve here. Only
  // `workflow.template.view` arrives with the package; the rest are this app's
  // to declare. The codes match the console's because they name the same
  // backend keys: a school reading its own approval rules and CodeX reading a
  // school's are one permission.
  "600108": "workflow.template.manage",

  // ── workflow / instances  (MM=60, RR=02) ───────────────────────────────────
  "600201": "workflow.instance.view",
  "600202": "workflow.instance.submit",   // send a document for approval
  "600204": "workflow.instance.cancel",   // terminate a stuck instance

  // ── workflow / actions  (MM=60, RR=03) ─────────────────────────────────────
  "600305": "workflow.action.reverse",    // reverse a recorded decision

  // ── workflow / approver groups  (MM=60, RR=04) ─────────────────────────────
  "600401": "workflow.group.view",
  "600408": "workflow.group.manage",      // create groups and edit membership

};

/**
 * Public constants
 * Names describe UI capabilities - not backend keys or permission structure.
 */
export const P = {
  // Owned by @xvs/finance, because they gate that package's screens. Spread in
  // rather than transcribed: this app must not hold a second copy of a code
  // that decides whether a bursar can raise a bill.
  ...FINANCE_CODES,

  // ── School Dashboard ───────────────────────────────────────────────────────
  VIEW_SCHOOL_DASHBOARD:   "100101",  // view the school admin dashboard metrics

  // ── Branch Management ──────────────────────────────────────────────────────
  BROWSE_BRANCHES:         "100201",  // view the school's branches list and detail
  ADD_BRANCH:              "100202",  // add a new branch to the school
  MODIFY_BRANCH:           "100203",  // edit branch details
  MANAGE_BRANCH:           "100208",  // transition branch lifecycle / configuration

  // ── Student Management ─────────────────────────────────────────────────────
  BROWSE_STUDENTS:         "100301",  // view the student roster and profiles
  ENROLL_STUDENT:          "100302",  // enroll / add a new student
  MODIFY_STUDENT:          "100303",  // edit an existing student's record
  MANAGE_STUDENTS:         "100308",  // student lifecycle: transfer, withdraw, graduate
  // Both are real backend keys (vs_students/constants.py) seeded onto school
  // roles, and neither had a code here - so the import wizard and the export
  // button had no way to be gated at all.
  IMPORT_STUDENTS:         "100317",  // load a roll from a spreadsheet
  EXPORT_STUDENTS:         "100318",  // export the directory as it is filtered
  VIEW_STUDENT_SENSITIVE:  "100339",  // read FLS-gated sensitive student fields

  // ── Staff Management ───────────────────────────────────────────────────────
  // The backend resource is still `teachers`, and these keys govern every
  // member of staff: the bursar and the registrar as much as the teacher.
  BROWSE_TEACHERS:         "100401",  // read the staff directory and profiles
  INVITE_TEACHER:          "100402",  // add somebody and invite them
  MODIFY_TEACHER:          "100403",  // edit a record, its records and its posting
  MANAGE_TEACHERS:         "100408",  // employment transitions and deletions
  ASSIGN_TEACHING:         "100411",  // write a teaching duty, set a class teacher

  // ── Staff Leave ────────────────────────────────────────────────────────────
  VIEW_LEAVE:              "101001",  // read somebody else's leave
  MANAGE_LEAVE:            "101008",  // file, correct or cancel it on their behalf
  APPLY_FOR_LEAVE:         "101019",  // apply for your own

  // ── Administrator Management ───────────────────────────────────────────────
  BROWSE_ADMINISTRATORS:   "100501",  // view school administrators
  INVITE_ADMINISTRATOR:    "100502",  // invite a new school administrator
  MODIFY_ADMINISTRATOR:    "100503",  // edit an administrator's profile
  SUSPEND_ADMINISTRATOR:   "100509",  // suspend an administrator account
  REACTIVATE_ADMINISTRATOR:"100510",  // reactivate a suspended administrator

  // ── Fees ───────────────────────────────────────────────────────────────────
  VIEW_FEES:               "100601",  // view fee structures and balances
  MANAGE_FEES:             "100608",  // create/edit fee structures and adjustments

  // ── Settings ───────────────────────────────────────────────────────────────
  VIEW_SETTINGS:           "100701",  // view school-level settings
  MANAGE_SETTINGS:         "100708",  // edit school-level settings and configuration

  // ── School Profile ─────────────────────────────────────────────────────────
  VIEW_SCHOOL_PROFILE:     "101201",  // read the school's own identity record
  UPDATE_SCHOOL_PROFILE:   "101203",  // edit ownership, term structure, currency, branding

  // ── Roles ──────────────────────────────────────────────────────────────────
  VIEW_ROLES:              "100801",  // view school roles and assignments
  CREATE_ROLE:             "100802",  // add a custom role of the school's own
  MODIFY_ROLE:             "100803",  // change what a role can reach
  DELETE_ROLE:             "100804",  // remove a custom role
  APPROVE_ROLE_CHANGE:     "100805",  // approve a role edit routed through maker-checker
  ASSIGN_ROLE:             "100811",  // assign or revoke roles from school users

  // Named the console's way because the shared approval screens name them that
  // way, and carrying their own codes because the registry is a bijection: one
  // code per name, one key per code. Sharing a number with a school permission
  // does not alias the two, it hands this name the other one's meaning.
  ACCESS_TEAM_PANEL:       "110301",  // list this school's people, to pick an approver
  VIEW_ORGANOGRAM:         "110901",  // read Codex's org chart, which no school role may

  // ── Workflow & Approvals ───────────────────────────────────────────────────
  // The shared approval screens gate on these, and they carry the SAME codes as
  // the console because they name the same backend keys: a school reading its
  // own approval rules and CodeX reading a school's are the same permission.
  VIEW_WORKFLOW_TEMPLATES:   "600101",  // read the approval rules that govern this school
  MANAGE_WORKFLOW_TEMPLATES: "600108",  // publish or edit an approval rule
  VIEW_WORKFLOW_INSTANCES:   "600201",  // read documents in flight
  SUBMIT_WORKFLOW:           "600202",  // send a document for approval
  CANCEL_WORKFLOW:           "600204",  // cancel a stuck instance
  REVERSE_WORKFLOW_ACTION:   "600305",  // reverse a recorded decision
  VIEW_APPROVER_GROUPS:      "600401",  // browse the named approver pools
  MANAGE_APPROVER_GROUPS:    "600408",  // create groups, add or remove members

  // ── Proxy (view the app as another user in this school) ────────────────────
  VIEW_PROXY_SESSIONS:     "100901",  // read the proxy session history / trail
  START_PROXY_SESSION:     "100912",  // search users and start viewing as one
  END_PROXY_SESSION:       "100913",  // end any proxy session in this school

  // ── Per-user permission exceptions ─────────────────────────────────────────
  // No screen reads these yet. Registered so the app can name every key the
  // backend grants a school admin.
  VIEW_USER_OVERRIDES:     "101301",  // see that a user has permission exceptions
  MANAGE_USER_OVERRIDES:   "101308",  // grant or revoke a per-user exception

  // ── School Onboarding (the control room, before go-live) ───────────────────
  VIEW_ONBOARDING:         "200101",  // read the control room: checklist, counts, gate
  UPDATE_ONBOARDING_TASK:  "200203",  // mark a step done, skip it, or reopen it
  VIEW_GO_LIVE_REQUESTS:   "200301",  // read this school's go-live request history
  REQUEST_GO_LIVE:         "200302",  // ask CodeX to take the school live

  // ── Data Import ────────────────────────────────────────────────────────────
  BROWSE_IMPORT_TEMPLATES: "400101",  // see which datasets this school may load
  BROWSE_IMPORTS:          "400201",  // read this school's upload history
  START_IMPORT:            "400202",  // upload a file against a template
  CHECK_IMPORT_FILE:       "400214",  // validate an upload without committing it
  COMMIT_IMPORT:           "400215",  // commit a checked upload into real rows
  VIEW_IMPORT_PROBLEMS:    "400301",  // read the row-by-row problems in a file
  VIEW_IMPORT_PROGRESS:    "400401",  // watch a running import finish

  // ── Academic Sessions ──────────────────────────────────────────────────────
  BROWSE_SESSIONS:         "300101",  // view academic sessions / terms
  CREATE_SESSION:          "300102",  // create a new academic session
  MODIFY_SESSION:          "300103",  // edit an academic session
  MANAGE_SESSIONS:         "300108",  // session lifecycle: activate, archive, close

  // ── Academic Calendar ──────────────────────────────────────────────────────
  BROWSE_CALENDAR:         "300201",  // view the academic calendar and events
  CREATE_CALENDAR_EVENT:   "300202",  // add a calendar event
  MODIFY_CALENDAR_EVENT:   "300203",  // edit a calendar event
  MANAGE_CALENDAR:         "300208",  // manage calendar configuration and bulk events

  // ── Classes ────────────────────────────────────────────────────────────────
  BROWSE_CLASSES:          "300301",  // view classes and their rosters
  CREATE_CLASS:            "300302",  // create a new class
  MODIFY_CLASS:            "300303",  // edit a class
  MANAGE_CLASSES:          "300308",  // class lifecycle and configuration
  ASSIGN_CLASS:            "300311",  // assign teachers/students to a class

  // ── Academic Structure (departments, programs, levels) ─────────────────────
  BROWSE_STRUCTURE:        "300401",  // view departments, programs and levels
  CREATE_STRUCTURE:        "300402",  // add a department, program or level (incl. bulk levels)
  MODIFY_STRUCTURE:        "300403",  // edit a department, program or level
  MANAGE_STRUCTURE:        "300408",  // delete a department, program or level

  // ── Subjects ───────────────────────────────────────────────────────────────
  BROWSE_SUBJECTS:         "300501",  // view subjects and where they are offered
  CREATE_SUBJECT:          "300502",  // add a subject
  MODIFY_SUBJECT:          "300503",  // edit a subject, incl. the levels it is offered at
  MANAGE_SUBJECTS:         "300508",  // delete a subject

  // ── Rooms, Bell Schedule, Timetables and Exams ─────────────────────────────
  BROWSE_TIMETABLES:       "300601",  // view rooms, bells, class/teacher grids, exams
  CREATE_TIMETABLE_ENTRY:  "300602",  // add a room, a period, a lesson or an exam paper
  MODIFY_TIMETABLE_ENTRY:  "300603",  // edit one, and duplicate a class's week into another
  MANAGE_TIMETABLES:       "300608",  // delete a room/period/paper, and clear a whole grid
  PUBLISH_TIMETABLE:       "300616",  // publish a class timetable or an exam timetable

  // ── Export Centre ──────────────────────────────────────────────────────────
  // No school role holds these yet - see the registry note.
  BROWSE_EXPORT_CATALOGUE: "920101",  // see what this school may export
  RUN_EXPORT:              "920302",  // run an export of a filtered screen
  DOWNLOAD_EXPORT:         "920446",  // download a produced file

} as const;

export type PermissionCode = (typeof P)[keyof typeof P];

// Internal resolver - used only by usePermissions and PermissionGate.
export function resolvePermissionKey(code: PermissionCode): string {
  return REGISTRY[code] ?? "";
}
