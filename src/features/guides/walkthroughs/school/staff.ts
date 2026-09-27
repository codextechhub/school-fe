import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";

import type { Walkthrough } from "../types";

const R = routesPath.PROTECTED;

/**
 * Tours for the staff and roles screens.
 *
 * None of them saves anything. Each stops at the button that would create,
 * invite, assign or grant, and says what that button does instead of pressing
 * it. The one drawer a tour opens is the class subject drawer on Teaching
 * duties, because opening it changes nothing. Its part buttons write
 * straight away and its remove button asks first, and the step that shows
 * them says which is which.
 *
 * The role editor is reached through its own route rather than by clicking
 * Create role, because a step's route decides which screen the tour holds the
 * reader on, and a click that navigates away from it would be sent back.
 */
export const STAFF_WALKTHROUGHS = [
  {
    id: "walkthrough.school.staff.add-staff",
    guideId: "school.staff.add-staff",
    route: R.STAFF.ADD,
    permissions: [P.INVITE_TEACHER],
    prerequisites: [
      "Have the person's name and the email address they will sign in with.",
      "Know which branch they will be based at, if your school has more than one.",
    ],
    version: 1,
    steps: [
      {
        id: "welcome",
        title: "One form, one save",
        body: "This tour walks through each part of the Add staff form. It never fills in a field, and it stops before Create and invite, which is the button that creates the record and sends the invitation.",
        advance: "next",
      },
      {
        id: "bio",
        target: "staff-add.section-bio",
        title: "Bio",
        body: "First name, last name and email address are required. The invitation goes to that email, and it becomes the address they sign in with. Which other personal fields you see depends on your role's field access. If you can edit staff records, you can also add a photograph here.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "employment",
        target: "staff-add.section-employment",
        title: "Employment",
        body: "Staff ID, job title, employment type and hire date are all optional. The staff ID can follow your school's own format, as long as nobody else already has it. Posted to appears when you manage more than one branch, and sets where the person is based.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "role-branch",
        kind: "branch",
        target: "staff-add.section-role",
        whenPresent: "role",
        whenMissing: "teaching-branch",
      },
      {
        id: "role",
        target: "staff-add.section-role",
        title: "Role, while the school is being set up",
        body: "During setup, choose School Admin or Branch Admin. If you manage more than one branch, also choose how far the role reaches, and keep it to their branch unless they genuinely work across the school. Once the school is live this part is gone: everyone starts on the school's starting role, and roles are changed from Roles & Permissions.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "teaching-branch",
        kind: "branch",
        target: "staff-add.section-teaching",
        whenPresent: "teaching",
        whenMissing: "qualifications",
      },
      {
        id: "teaching",
        target: "staff-add.section-teaching",
        title: "Teaching duties, if you want them now",
        body: "Optional. Every subject you pick is assigned in every class you pick, so two subjects and three classes make six duties. They become the main teacher wherever a subject has none, and it can all be changed later from Teaching duties.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "qualifications",
        target: "staff-add.section-qualifications",
        title: "Qualifications",
        body: "Add a row for each qualification, with the institution and year. Blank rows are left out when you save. Nothing checks a qualification, so record it as your school holds it.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "on-save",
        target: "staff-add.on-save",
        title: "Read what happens when you save",
        body: "Create and invite creates the record with the status Invited and sends a single-use link that expires, by email and in the app. Resending later cancels the old link. CVs and certificates go on the Documents tab of their record afterwards.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "complete",
        title: "Create and invite is your step",
        body: "The tour stops here, and nothing was saved. Check the name and email address, then choose Create and invite yourself. If the email is wrong, the invitation goes to somebody else.",
        advance: "next",
      },
    ],
  },
  {
    id: "walkthrough.school.staff.teaching-duties",
    guideId: "school.staff.teaching-duties",
    route: R.STAFF.TEACHING,
    permissions: [P.BROWSE_TEACHERS],
    prerequisites: [
      "The school is live and an academic year is running, with its classes and subjects set up.",
    ],
    version: 2,
    steps: [
      {
        id: "welcome",
        title: "See who teaches what",
        body: "This tour shows how to find class subjects with nobody on them and opens one to show who teaches it. It never adds, moves or removes a teacher.",
        advance: "next",
      },
      {
        id: "year-branch",
        kind: "branch",
        target: "staff-teaching.toolbar",
        whenPresent: "summary",
        whenMissing: "no-year",
      },
      {
        id: "summary",
        target: "staff-teaching.summary",
        title: "The year at a glance",
        body: "Class subjects is every subject each class is expected to take this year. No teacher means nobody is assigned at all. No main teacher means somebody is teaching it, but nobody is set to enter its results.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "toolbar",
        target: "staff-teaching.toolbar",
        title: "Three views of the same year",
        body: "Subject coverage shows who teaches each class subject, Class teachers shows who looks after each class, and Timetable clashes lists teachers placed in two lessons at once. Under Subject coverage, By teacher lists everything one person carries, and Only gaps hides subjects that are fully covered. Stay on Subject coverage for the rest of this tour.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "subjects-branch",
        kind: "branch",
        target: "staff-teaching.subject",
        whenPresent: "coverage",
        whenMissing: "no-subjects",
      },
      {
        id: "coverage",
        target: "staff-teaching.coverage",
        title: "Read each class subject",
        body: "Subjects are grouped by class. A dashed box means nobody teaches it. An amber box has teachers but no main teacher. Otherwise the main teacher is named, with anyone assisting below.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "open-pairing",
        target: "staff-teaching.subject",
        title: "Open a class subject",
        body: "Select this subject to see who teaches it. Opening it changes nothing, and the tour carries on once it is open.",
        placement: "bottom",
        advance: "target-click",
      },
      {
        id: "pairing-current",
        target: "staff-pairing.current",
        title: "Who teaches it now",
        body: "Each person is marked Main teacher or Assisting. The main teacher enters this subject's results for the class, and there is only one. With permission to assign teaching, Make main and Move to assisting act straight away, without a save. The remove button asks you to confirm first. The tour does not touch any of them.",
        placement: "left",
        advance: "manual",
      },
      {
        id: "add-branch",
        kind: "branch",
        target: "staff-pairing.add",
        whenPresent: "pairing-add",
        whenMissing: "complete",
      },
      {
        id: "pairing-add",
        target: "staff-pairing.add",
        title: "Add a teacher",
        body: "Search for the teacher, then choose their part. A class subject that already has a main teacher only takes another person as assisting, so move the current one first if the role is changing hands. Add them saves straight away, and the tour stops before it.",
        placement: "left",
        advance: "manual",
      },
      {
        id: "pairing-rejoin",
        kind: "branch",
        target: "staff-teaching.toolbar",
        whenPresent: "complete",
        whenMissing: "no-year",
      },
      {
        id: "no-subjects",
        title: "No class subject to open",
        body: "The list is empty when the year has no classes and subjects yet, which are built in Academic Structure, or when Only gaps is on and every subject is covered. By teacher, Class teachers and Timetable clashes show no subjects either.",
        advance: "next",
      },
      {
        id: "subjects-rejoin",
        kind: "branch",
        target: "staff-teaching.toolbar",
        whenPresent: "complete",
        whenMissing: "no-year",
      },
      {
        id: "no-year",
        title: "There is no year to show duties for",
        body: "Teaching duties belong to an academic year. The screen opens once the school is live and a year is running.",
        advance: "next",
      },
      {
        id: "complete",
        title: "Staffing a subject is your decision",
        body: "Nothing was changed. Add or move teachers yourself once you know who takes each subject and who enters its results.",
        advance: "next",
      },
    ],
  },
  {
    id: "walkthrough.school.roles.create-and-edit-role",
    guideId: "school.roles.create-and-edit-role",
    route: R.ROLES.INDEX,
    permissions: [P.VIEW_ROLES, P.CREATE_ROLE],
    prerequisites: [
      "Know the job the role is for, and which branches it should reach.",
      "Know the actions that job needs, and nothing more.",
    ],
    version: 1,
    steps: [
      {
        id: "welcome",
        title: "Roles decide who can do what",
        body: "This tour reads the role directory, then opens the Create Role form to show its parts. It never types a name, ticks a permission or creates a role.",
        advance: "next",
      },
      {
        id: "summary",
        target: "roles.summary",
        title: "The school's roles in numbers",
        body: "Total roles, how many your school added itself, and how many role assignments are in use across all of them.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "directory",
        target: "roles.directory",
        title: "School roles and custom roles",
        body: "School roles are the ones every school starts with, and custom roles are the ones your school made. Each row shows how many people hold the role, how many permissions it grants, which branches it reaches and whether it is in use. Select a row to open the role, where Edit role, its people and its permissions are.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "new",
        target: "roles.new",
        title: "Start a new role",
        body: "Create role opens an empty form. Choose Next and the tour opens it for you; opening it creates nothing.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "details",
        route: R.ROLES.NEW,
        target: "roles-editor.details",
        title: "Name the job",
        body: "Give the role a name people will recognise when assigning it, such as Assistant Bursar, and say what it is for in the description.",
        placement: "right",
        advance: "manual",
      },
      {
        id: "reach-branch",
        kind: "branch",
        target: "roles-editor.branch-reach",
        whenPresent: "reach",
        whenMissing: "reason",
      },
      {
        id: "reach",
        target: "roles-editor.branch-reach",
        title: "Choose the branch reach",
        body: "School-wide reaches every branch, including ones opened later. Selected branches reaches only the ones you tick. Everybody given the role gets its full reach, so choose the narrowest one the job needs.",
        placement: "right",
        advance: "manual",
      },
      {
        id: "reason",
        target: "roles-editor.reason",
        title: "Say why",
        body: "A new role needs a reason, and so does any later change to its permissions or reach. It stays with the change, and it becomes the justification when a restricted permission is sent for approval.",
        placement: "right",
        advance: "manual",
      },
      {
        id: "permissions",
        target: "roles-editor.permissions",
        title: "Grant only what the job needs",
        body: "Choose a module, then a resource, then tick its permissions. Ticks are kept as you move between resources, and the count shows how many are selected. A restricted permission is not granted by the save: the role is saved and that permission waits for approval.",
        placement: "left",
        advance: "manual",
      },
      {
        id: "actions",
        target: "roles-editor.actions",
        title: "Create role is your step",
        body: "Create role saves the role and opens its record, where you give it to people. Cancel goes back to the directory without saving. The tour does not select either.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "complete",
        title: "Nothing was created",
        body: "Check the name, reach and permissions against the job, then choose Create role yourself. To change an existing role later, open it from the directory and choose Edit role.",
        advance: "next",
      },
    ],
  },
] as const satisfies readonly Walkthrough[];
