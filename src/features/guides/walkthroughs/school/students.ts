import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";

import type { Walkthrough } from "../types";

const R = routesPath.PROTECTED;

/**
 * The tours for the Students screens: enrolling one student, finding and
 * reading a record, and a year-end promotion.
 *
 * None of them saves anything. The enrol and promotion tours move through
 * their screens' own steps with the screens' own Next buttons, which only
 * check the step or preview the result, and each stops on a manual step that
 * points at the final button (Enrol student, Run promotion) without pressing
 * it.
 *
 * The directory tour reaches a profile by the reader selecting a student's
 * name. That step is `target-click`, and the profile steps name the pattern
 * route `/students/:id`, since no step can name a record's id. With nobody
 * listed, a fallback card describes the profile instead. The fallback and
 * closing cards inherit the pattern route, which the runtime never navigates
 * to, so each stays on whichever screen the reader is on.
 *
 * A step whose element depends on the school or the reader (no year to
 * promote into, an empty roll, a hidden admission number field, a missing run
 * permission) is routed around with a `branch` step. Fallback cards sit just
 * before `complete`, and a branch whose two outcomes are the same step jumps
 * the main path over them.
 */
export const STUDENTS_WALKTHROUGHS = [
  {
    id: "walkthrough.school.students.enrol-student",
    guideId: "school.students.enrol-student",
    route: R.STUDENTS.ENROL,
    permissions: [P.ENROLL_STUDENT, P.ASSIGN_CLASS],
    prerequisites: [
      "Have the student's name, date of birth and entry class to hand.",
      "Know at least one guardian's name, phone number and relationship to the student.",
    ],
    version: 2,
    steps: [
      {
        id: "welcome",
        title: "Enrol one student, a step at a time",
        body: "This tour walks through the enrol form. You fill in each step yourself and the tour moves on when the form does. It stops before the final save, so nothing is saved for you.",
        advance: "next",
      },
      {
        id: "shape",
        target: "student-enrol.shape",
        title: "Choose what you are creating",
        body: "Enrol a student puts them on the roll now and takes a seat in a class. Save as an applicant records someone waiting on a decision: they take no seat, and the next steps ask for the level applied for instead of a class.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "steps",
        target: "student-enrol.steps",
        title: "Five steps, ending in Review",
        body: "Student, Placement, Guardians, Details and Review. Any step you have already reached can be selected again, and one you left short of something shows how many details are missing. On a phone, a step counter shows where you are.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "student",
        target: "student-enrol.step-student",
        title: "Who the student is",
        body: "First name, last name, date of birth and gender are required, and so is anything else your school requires; the rest say optional. A date of birth outside your school's age range, 2 to 25 unless it has set its own, is refused as a likely typing mistake. Your school's field access settings decide which of these fields you see.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "student-next",
        target: "student-enrol.next",
        title: "Fill in the step, then select Next",
        body: "Next checks only the step you are on and marks anything missing beside its field. The count on the left is what the whole form still needs. Nothing is saved when you move between steps.",
        placement: "top",
        advance: "target-click",
      },
      {
        id: "placement",
        target: "student-enrol.step-placement",
        title: "Where the student sits",
        body: "At a school with more than one branch, choose the branch first; if you are working in one branch, it is set for you. Each entry class shows its seats used against its capacity. A full class can be chosen unless your school never goes over capacity, in which case the form asks for another class. An applicant records the level applied for instead.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "admission-number-branch",
        kind: "branch",
        target: "student-enrol.admission-number",
        whenPresent: "admission-number",
        whenMissing: "placement-next",
      },
      {
        id: "admission-number",
        target: "student-enrol.admission-number",
        title: "The admission number is the school's",
        body: "It is required only if your school says so. The hint under it shows your school's format or a suggested next number, which you can change. Left blank, the next number is issued on save where your school numbers automatically, or can be added later from the student's record.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "placement-next",
        target: "student-enrol.next",
        title: "Select Next for the guardians",
        body: "Choose the class or level, then select Next.",
        placement: "top",
        advance: "target-click",
      },
      {
        id: "guardians",
        target: "student-enrol.step-guardians",
        title: "Who the school calls",
        body: "Every student needs at least one guardian, each with a relationship, and exactly one primary contact. Find an existing guardian first, so a parent who already has a child at the school keeps one record. Add a new one, where offered, creates a guardian from a name and phone number.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "guardians-next",
        target: "student-enrol.next",
        title: "Select Next for the details",
        body: "Link the guardians and mark the primary contact, then select Next.",
        placement: "top",
        advance: "target-click",
      },
      {
        id: "details",
        target: "student-enrol.step-details",
        title: "Contact and medical details",
        body: "Home address, the student's own phone and email, and below them medical details and an emergency contact. They are optional unless your school requires some of them, and a required one is marked. Your school decides which roles can read the medical details back.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "details-next",
        target: "student-enrol.next",
        title: "Select Skip or Next to reach Review",
        body: "The button reads Skip while nothing on this step is required, and Next when your school requires something here. Anything you typed is kept.",
        placement: "top",
        advance: "target-click",
      },
      {
        id: "review",
        target: "student-enrol.step-review",
        title: "Check it before it is saved",
        body: "Each block repeats what will be saved: the branch, the class or level, whether an admission number is issued, and which guardian the school will call first. Edit on a block takes you back to its step.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "save",
        target: "student-enrol.save",
        title: "The tour stops here",
        body: "Enrol student (Save applicant for an applicant) saves the record, and an enrolment takes the class seat. If the school may already have this child, you are asked whether it is a different child. If the class is full, the first save is usually refused with a warning and the button becomes Enrol anyway; a school that never goes over capacity stops at the Placement step instead.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "complete",
        title: "Saving is your decision",
        body: "Select Enrol student yourself when the review is right. An enrolment opens the new student's profile, and an applicant is listed under Applicants. Nothing was saved by this tour.",
        advance: "next",
      },
    ],
  },
  {
    id: "walkthrough.school.students.find-student-record",
    guideId: "school.students.find-student-record",
    route: R.STUDENTS.INDEX,
    permissions: [P.BROWSE_STUDENTS],
    prerequisites: [
      "Know the student's name or admission number, or the class they are in.",
    ],
    version: 2,
    steps: [
      {
        id: "welcome",
        title: "Find a student and read their record",
        body: "This tour shows what the Student Directory tells you and how to narrow it to one student. It never changes a record.",
        advance: "next",
      },
      {
        id: "summary",
        target: "students-directory.summary",
        title: "The roll at a glance",
        body: "Counts for the branch and year chosen in the sidebar. Select Active or Applicants to filter the list to that status. Needs attention adds the applications waiting to the students on the roll with no class.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "work-queue",
        target: "students-directory.work-queue",
        title: "What needs someone today",
        body: "Each row names a record and what to do: a student with no class to place, applications to review, or a class over its limit. Selecting a row opens the place to act, such as the class drawer or Applicants. When nothing is waiting, it says so.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "search",
        target: "students-directory.search",
        title: "Search by name or admission number",
        body: "Type part of a name or an admission number. The list narrows as you type and goes back to its first page.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "filters",
        target: "students-directory.filters",
        title: "Narrow the list",
        body: "Filters narrows by class, level or status, or to students with no class. The number on the button counts the filters that are on, and each one shows as a chip under the search box, with Clear all to remove them.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "row-branch",
        kind: "branch",
        target: "students-directory.row",
        whenPresent: "row",
        whenMissing: "no-rows",
      },
      {
        id: "row",
        target: "students-directory.row",
        title: "Open a student's record",
        body: "Each row shows level and status, admission number, class (Unassigned when there is none), primary guardian, and Record: Ready, or how many details are missing. Select a student's name to open their profile. Opening it changes nothing.",
        placement: "bottom",
        advance: "target-click",
      },
      {
        id: "profile-header",
        route: R.STUDENTS.PROFILE,
        target: "student-profile.header",
        title: "Who this is, and where they sit",
        body: "Name and status, then admission number, class, level, branch and year, in amber where something is missing. The buttons under them appear only for roles allowed to change the record. The strip below shows where the student is on Applicant, Enrolled, Active.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "profile-completeness",
        target: "student-profile.completeness",
        title: "How complete the record is",
        body: "The ring counts the expected details and required documents on record. Complete profile, for roles that may edit, jumps to the list of what is missing on the Overview tab.",
        placement: "left",
        advance: "manual",
      },
      {
        id: "as-at",
        target: "as-at-control",
        title: "See the record on an earlier day",
        body: "Pick a day and the whole page, every tab included, shows the record as it stood at the end of that day. Nothing can be changed while you look at the past. Days before the record's history starts cannot be picked; choose today to go back.",
        placement: "left",
        advance: "manual",
      },
      {
        id: "tabs",
        target: "student-profile.tabs",
        title: "Everything else is a tab",
        body: "Overview has personal and school details and what is missing. Guardians, Academic (class history and subjects), Medical, Documents and History hold the rest. The tab is part of the address, so a link you send a colleague opens the same tab.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "profile-jump",
        kind: "branch",
        target: "student-profile.tabs",
        whenPresent: "complete",
        whenMissing: "complete",
      },
      {
        id: "no-rows",
        title: "No student is listed",
        body: "Either the school has no students yet in this branch and year, or the search and filters match nobody. Clear them to see the whole roll.",
        advance: "next",
      },
      {
        id: "profile-described",
        title: "What a profile holds",
        body: "Selecting a student opens their profile: their details and status, how complete the record is, an As at date to see an earlier day, and tabs for Overview, Guardians, Academic, Medical, Documents and History.",
        advance: "next",
      },
      {
        id: "complete",
        title: "Find, open, read",
        body: "Search or filter for the student, open their row, and read the tab you need. Nothing was changed by this tour.",
        advance: "next",
      },
    ],
  },
  {
    id: "walkthrough.school.students.promote-students",
    guideId: "school.students.promote-students",
    route: R.STUDENTS.PROMOTION,
    permissions: [P.PROMOTE_STUDENTS],
    prerequisites: [
      "Create next year in Academic Structure and copy this year's classes into it.",
      "Know which students are repeating, graduating or being held back.",
    ],
    version: 2,
    steps: [
      {
        id: "welcome",
        title: "Walk through a promotion without running it",
        body: "This tour goes as far as the final confirmation. Choosing a year and reviewing students only preview the result. The tour never runs the promotion.",
        advance: "next",
      },
      {
        id: "year-branch",
        kind: "branch",
        target: "promotion.sessions",
        whenPresent: "sessions",
        whenMissing: "no-target-year",
      },
      {
        id: "sessions",
        target: "promotion.sessions",
        title: "Choose the year to promote into",
        body: "From is the year running now. Into lists the years that have not started yet. Choose one and the level mapping loads below; it is a preview and writes nothing. If you are working in one branch, only that branch is promoted. Then select Next.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "mapping-branch",
        kind: "branch",
        target: "promotion.level-mapping",
        whenPresent: "mapping",
        whenMissing: "not-previewed",
      },
      {
        id: "mapping",
        target: "promotion.level-mapping",
        title: "Check where each class goes",
        body: "Each class and the class its students move into. A Terminal level graduates and leaves the roll. A class shown in amber is not moving up, and the exceptions on the next screen say why. The count below is how many students are candidates.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "nothing-branch",
        kind: "branch",
        target: "promotion.nothing-to-move",
        whenPresent: "nothing-to-move",
        whenMissing: "review-open",
      },
      {
        id: "review-open",
        target: "promotion.review-open",
        title: "Select Review students",
        body: "It shows every student's outcome. It previews again and changes nothing.",
        placement: "top",
        advance: "target-click",
      },
      {
        id: "review-summary",
        target: "promotion.review-summary",
        title: "The running totals",
        body: "How many students are promoted, repeating, graduating and held. The totals follow your changes. Pick a class here to show only that class.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "class-groups",
        target: "promotion.class-groups",
        title: "Decide the exceptions",
        body: "Each class opens to its students. Promote, Repeat, Graduate or Hold sets one student; All up (All graduate for a terminal class) or All held sets the whole class. These choices stay on this screen until the promotion is run.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "exceptions-branch",
        kind: "branch",
        target: "promotion.exceptions",
        whenPresent: "exceptions",
        whenMissing: "confirm-open",
      },
      {
        id: "exceptions",
        target: "promotion.exceptions",
        title: "What cannot simply move up",
        body: "A class-wide cause appears once, with a link to fix it in Academic Structure where that is where the fix belongs. A student needing a decision has their own row and a link to their profile.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "confirm-open",
        target: "promotion.confirm-open",
        title: "Select Preview and confirm",
        body: "It recalculates with your choices and shows the final counts. Nothing is written yet.",
        placement: "top",
        advance: "target-click",
      },
      {
        id: "confirm",
        target: "promotion.confirm",
        title: "Check the final counts",
        body: "How many students each outcome covers and how many move into the new year. Students left out stay in the current year. If a class would go over capacity it is listed here, and Run promotion waits until you tick to go ahead. A school that never goes over capacity has no tick: raise the capacity, add an arm or hold some pupils back, then preview again.",
        placement: "bottom",
        advance: "manual",
      },
      {
        id: "run-branch",
        kind: "branch",
        target: "promotion.run",
        whenPresent: "run",
        whenMissing: "complete",
      },
      {
        id: "run",
        target: "promotion.run",
        title: "The tour stops here",
        body: "Run promotion asks you to confirm, then moves every student in one action. It cannot be undone from here, and graduates leave the roll.",
        placement: "top",
        advance: "manual",
      },
      {
        id: "run-jump",
        kind: "branch",
        target: "promotion.run",
        whenPresent: "complete",
        whenMissing: "complete",
      },
      {
        id: "no-target-year",
        title: "There is no year to promote into",
        body: "A promotion moves students into a year that has not started yet. Create next year in Academic Structure, copy this year's classes into it, and come back.",
        advance: "next",
      },
      {
        id: "no-target-year-jump",
        kind: "branch",
        target: "promotion.sessions",
        whenPresent: "complete",
        whenMissing: "complete",
      },
      {
        id: "not-previewed",
        title: "No year was chosen",
        body: "The tour will not choose one for you. Choose the year to promote into and wait for the level mapping, then start the tour again. If the mapping could not be loaded, select Try again.",
        advance: "next",
      },
      {
        id: "not-previewed-jump",
        kind: "branch",
        target: "promotion.level-mapping",
        whenPresent: "complete",
        whenMissing: "complete",
      },
      {
        id: "nothing-to-move",
        title: "Nobody is a candidate",
        body: "No student in the current year can be promoted, so Review students stays unavailable. Check the roll and the class placements before trying again.",
        advance: "next",
      },
      {
        id: "complete",
        title: "Running it is your decision",
        body: "Nothing was run. Run the promotion yourself only when the counts and exceptions match what the school agreed. Every move is then recorded in each student's history.",
        advance: "next",
      },
    ],
  },
] as const satisfies readonly Walkthrough[];
