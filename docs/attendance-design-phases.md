# M15 Attendance: design breakdown and build phases

**Design:** `backend/docs/designs/M15 Attendance (standalone).html` (bundled
export, 155 KB of markup once unescaped, 66 `sc-if` blocks, all 66 accounted
for, 50 `sc-for` collections).
**Backend contract:** `backend/docs/attendance-api-plan.md`, sections 9-11 ("As
built"). Where the design and those sections disagree, the as-built sections
win: they record decisions taken after the design was drawn.
**This app today:** nothing. No route, service, permission code, Field Access
resource, palette action or guide for attendance.

---

## 1. What the design contains

### 1.1 Screens

Size is the markup inside each screen's span (styles and SVG stripped), a fair
proxy for how much there is to build.

| Screen | Size | States inside it | Collections | Writes |
|---|---|---|---|---|
| **Summaries & reports** | 14.8 KB | term tabs; chronic list / nobody below threshold; not taken / every register taken; lessons missed (only when lesson marking is on) | `rep.sessionTabs`, `rep.trend`, `rep.classRows`, `rep.levelRows`, `rep.chronic`, `rep.notTaken`, `rep.lessons` | 3 exports |
| **Today, administrator hub** | 11.8 KB | not yet taken / every register taken; absent today / nobody absent; missed a lesson (lesson marking on); corrections waiting; branch tabs (several branches only); 6 KPIs, 7 with lesson marking | `kpis`, `branchTabs`, `notTakenRows`, `missedLessonRows`, `absentRows`, `pendingPreview` | Remind |
| **Student record, Attendance tab** | 7.1 KB | term tabs; absences / none; lesson absences (lesson marking on); history / none | `stu.tabs`, `stu.sessionTabs`, `stu.counts`, `stu.months` > `m.cells`, `stu.absences`, `stu.lessonAbs`, `stu.history` | none |
| **Daily register** (also the lesson register) | 6.2 KB | in progress / ready / submitted / closed day; taken by, or on behalf of a teacher on leave; toolbar while rows are unmarked; submit bar until submitted; history after a change; empty roster; per row: suspended lock, mark buttons, read-only chip with Request correction, note line, morning mark (lesson only) | `regRows` > `r.btns`, `reg.history` | mark, fill present, submit |
| **Phone frames** (register and absent list) | 5.7 KB | same states as the register; submitted / unmarked submit label | `phoneRows` > `r.phoneBtns`, `absentRows` | same as register |
| **Attendance settings** | 5.2 KB | per-level lesson switch with a note when on; reason codes in use / retired; notices on / off; threshold | `set.programmes` > `p.levels`, `set.codes`, `set.thresholdOptions` | 4 settings, add / retire / restore a code |
| **Corrections** | 3.7 KB | waiting / none waiting; decided list | `pendingRows`, `decidedRows` | approve, reject |
| **Staff register** | 3.5 KB | groups per branch plus School-wide; per row: on-leave lock with a leave link, note line, mark buttons | `staffGroups` > `g.rows` > `r.btns` | mark, fill present, submit |
| **Lesson registers list** | 3.0 KB | only when lesson marking is on | `lessonRows` | none |
| **Today, teacher hub** | 1.6 KB | class register card; lesson cards for a subject teacher; "lesson marking is off" note | `myRegisters` | none |
| **Holiday view** | 0.5 KB | replaces every day-scoped screen on a closed day | none | none |

### 1.2 Overlays

| Overlay | Size | States |
|---|---|---|
| **Mark drawer** (`drawer.open`) | 3.5 KB | three kinds. **Late**: arrival time. **Excused**: reason code, note required for Other, save disabled until valid. **Request a correction**: proposed mark, reason code, note. Each has a hint line and an inline reason error. |
| **Submit confirmation** (`modal.open`) | 1.4 KB | the description changes with the outcome: notices off; nobody absent; nobody with an email; N guardians will be emailed |
| **Toasts** | small | success / info / warning, with or without a body |

### 1.3 Shared chrome and row models

- Sidebar: Attendance under Academics, eight sub-items, a pending-corrections
  badge. Branch switcher and term label in the rail.
- Row-scoped flags (31) are the per-row action model: `r.locked`,
  `r.showButtons`, `r.showReadonly`, `r.showMorning`, `r.showNote`,
  `reg.showTakenBy`, `reg.showToolbar`, `reg.showSubmitBar`, `reg.showHistory`,
  `reg.empty`, `g.isSchoolWide`, `lv.showNote`, `stu.has*`, `rep.has*` /
  `rep.no*`, `drawer.show*`, `drawer.reasonError`, `t.hasBody`, and the nav's
  `it.showBadge` / `it.showChevron` / `it.showSubs`.

### 1.4 The mock tenants, and what they require

| Tenant | Shape | What it proves |
|---|---|---|
| **Brightfield Schools** | two branches (Lekki, Ikeja), lesson marking on for SSS | branch tabs on the hub, a Branch column everywhere, lesson registers, missed-a-lesson, a School-wide staff group |
| **Sunrise Academy** | one branch, no lessons | **what recedes:** no branch switcher, the Branch column reads **Level**, no Lesson registers sub-item, no missed-lesson KPI or card, guardian notices off ("Notices off" on every absent row) |

Four signed-in users: the school administrator, the registrar (takes Primary 4 A
on behalf of a teacher on maternity leave), a class teacher (Mr. Eze, JSS1 A,
no lessons), and a subject teacher (Mr. Achebe, lessons only). Three dates:
today, yesterday (closed, so read-only with corrections), and a public holiday.

The seeder `seed_attendance_scenarios` builds the same cast in **lagoon-view**
(two branches, lessons on) and **sunrise-academy** (one branch).

---

## 2. What the backend can serve

All routes sit under `/v1/attendance/`, mounted in `apps/urls.py`.

### 2.1 The four buckets

| Bucket | Screens |
|---|---|
| **1. Served and wired** | none |
| **2. Served, not wired** | **every screen.** Today admin (`today/`), Today teacher (`today/mine/`), daily register (`registers/<class>/<date>/` plus `marks/<student>/`, `fill-present/`, `submit/`, `remind/`), lesson list (`lessons/`), lesson register (`lessons/<slot>/<date>/` plus its three writes), corrections (`corrections/?status=pending\|decided`, `approve/`, `reject/`, `POST corrections/`), staff register (`staff-registers/<date>/` plus `<branch>/<date>/marks/<staff>/`, `fill-present/`, `submit/`), student tab (`students/<id>/?term=`), reports (`reports/?term=&branch=`, `reports/export/?table=&export=`), settings (`settings/` GET / PATCH, `reason-codes/` GET / POST, `<id>/` PATCH, `retire/`, `restore/`). The holiday view is the `closed` block every day-scoped response carries. |
| **3. Exists but closed** | none. Every route answers `TENANT_NOT_LIVE` to a school still onboarding, which is the intended rule, not a closed surface: the routes stay closed before go-live. |
| **4. Absent** | no screen. Four small elements, listed in 2.3. |

**The backend is not pushed.** Both attendance commits sit in local `main`,
five commits ahead of `origin/main`. Nothing here can pass CI or a fresh
checkout until they are.

### 2.2 Endpoints and fields no screen uses (reverse audit)

None is dead API. Each is a control the design never drew:

1. `PATCH reason-codes/<id>/`: rename a code, set `requires_note` and
   `counts_as_authorised`. The design has no rename and no flags.
2. `settings.edit_window_days` (0 to 14): how long a submitted register stays
   changeable. No control in the design. **Ruled 12 October 2026:** a setting beside the
   threshold.
3. `reports/export/` serves CSV, Excel and PDF. The design offers CSV only.
4. `decision_note` on approve and reject. The design's reject toast says "your
   note is kept", but there is no input for it. **Ruled 12 October 2026:** an
   optional note on both.
5. `arrived_at` on a correction to Late is **required** by the backend. The
   design's correction drawer has no time field.
6. `classes_without_branch` on the hub: classes at a school with several
   branches that cannot take a register until they are given one. Nothing in
   the design shows it.
7. `no_home_branch` on the staff register: a locked group. The design draws a
   markable "School-wide" group instead; the approved decision (plan, decision
   2) overrides it.

### 2.3 Elements nothing can serve as drawn (each needs a ruling)

1. **Date navigation. Ruled 12 October 2026:** a date picker on Today and on
   the register, past days and today only, and every day cell on a student's
   Attendance tab links to that day's register. The backend takes `?date=`
   everywhere; it refuses a future date on a write but answers a read with an
   unstarted register, so the picker itself stops at today.
2. **"Class registers". Ruled 12 October 2026:** a page listing every class
   for the chosen day with its register's status, built from the academics
   class list; each row opens that class's register.
3. **"A student's record" sub-item** jumps to one hard-coded student. A record
   needs an id, so it cannot be a nav destination.
4. **"Attendance settings". Ruled 12 October 2026:** a section of the Settings
   console (Academics group, beside Calendar and timetables), rather than a
   screen of the module's own. Ruled 14 October 2026: the Attendance sidebar
   carries no link to it; Settings is its one home.
5. **Arrival time. Ruled 12 October 2026:** a time field that starts at the
   current time, not the design's four fixed chips.
6. **Threshold. Ruled 12 October 2026:** a number box, 50 to 100.
7. **"Add a code". Ruled 12 October 2026:** a small drawer with the name and
   "needs a note"; "counts as authorised" stays off screen until a screen uses it.
8. **Export. Ruled 12 October 2026:** CSV, Excel and PDF from one menu, downloaded
   straight away.
9. **Missed-lesson card "Present · 8:05 am".** The morning mark is served, the
   8:05 time is not. Show the mark alone.
10. **Staff note "Account locked after three failed sign-ins"**: not served,
    deliberately (plan D1). Dropped.
11. **"View leave record"** has no leave detail route. The nearest target is
    `/staff/:id?tab=leave`, and the backend sends the leave only to a holder of
    `school.leave.view`; without it the row reads "On leave" with no link.
12. **Header search.** Backend search places cover Today, My registers,
    Corrections, Reports, Reason codes and Settings, but not Lesson registers or
    the Staff register. A two-entry backend addition, or accept the gap.
13. **Nav badge.** The pending count arrives inside the administrator hub's
    payload. For the badge on every screen, `corrections/?status=pending` is
    served and cheaper than the hub.

---

## 3. The phases

Every phase builds, passes `npx eslint . --max-warnings 0` and the suite
(including `coverage.test.ts` and the guide catalogue test), and has its screens
driven against the seeded backend at 390px and desktop with the overflow probe.
Every mounted route ships with its palette action (or a `NOT_A_DESTINATION`
reason), its guide and its catalogue entry in the same phase, because the
coverage tests fail otherwise.

Every screen uses `useFieldAccess` against the four backend resources
(`attendance.register`, `attendance.correction`, `attendance.lesson`,
`attendance.staff`). The backend already drops hidden keys and whole blocks; the
screens must treat a missing key as "hidden", remove the column or section, and
never render it blank.

### Phase 0: seed and readiness (no screens)

- Run the seeders in order (`seed_all_permissions`, onboarding, academic,
  student, staff, then `seed_attendance_scenarios`) for lagoon-view and
  sunrise-academy. Record the printed logins: whole-school admin, branch admin,
  and the cast's teachers.
- Confirm by API, per tenant, that each state in section 1 has a row: on-behalf
  register, suspended pupil, reminded / not reminded, NO_EMAIL child, closed day
  and branch-only closure, three corrections, retired code, lessons and a missed
  lesson (lagoon-view), staff on leave / resigning / no home branch.
- States the seeder does not build and the screens can reach by hand: notices
  off (Settings), every register taken, nobody absent. Note which, so the
  verification in later phases does not hunt for them.

**Done 12 October 2026.** The seeder was already applied (a re-run created
nothing) and every state above answered by API in both schools. Useful
handles:

| What | lagoon-view | sunrise-academy |
|---|---|---|
| Class teacher with a lesson | `kunle.adebayo@lagoon-view.example.com`, JSS1 A (class 82), lesson slot 22 | `chukwuemeka.eze@sunrise-academy.test`, JSS1 A (class 66) |
| On-behalf register | SSS1 A (86) on 2026-10-09 | SSS1 B (71) on 2026-10-09 |
| Closed day | 2026-10-05 school-wide, 2026-09-30 Annex only | 2026-10-05 |
| Past day, window shut | 2026-10-09 | 2026-10-09 |
| Class with no teacher | JSS1 B (83), Annex | JSS1 B (67) |

Teachers sign in with the staff seeder's password, administrators with the dev
fixture password. Seeded students carry no admission number, so that column
reads blank throughout.

### Phase 1: foundation and the two Today screens

- Permission codes for the eleven `attendance.*` keys in `permissions/index.ts`;
  four `FIELD_RESOURCE` entries; an `attendance` RTK service with types and
  tags.
- `routes/protected/attendance-routes.tsx`, branch lens on, closed before
  go-live.
- Sidebar: Attendance under Academics with sub-items gated per key.
- **Today**: the administrator hub when the caller holds `mark_any` or
  `correction.approve`, otherwise the teacher hub. KPIs (missed-a-lesson only
  when sent), not-taken table with Remind (`remind` key) and Take register,
  absent-today table (phone cards), missed-lesson cards, corrections preview,
  `classes_without_branch` notice, holiday view, Branch / Level column swap.
- Teacher hub: class cards and lesson cards, the lesson-marking-off note.
- The date control from ruling 1, if approved.

**Built 12 October 2026, not committed.** Driven against the seeded backend:
lagoon-view admin (today, the school-wide closure of 5 October, and 9 October)
at desktop and 390px with no horizontal overflow, and sunrise-academy for the
Level column and the absent branch selector. Not yet seen rendered: the teacher
hub (its response was checked by API). Deliberate gaps until Phase 2 and 3:
"Take register", the teacher's cards and "Open queue" link nowhere because
their screens do not exist yet, so they are not drawn. The design's on-page
branch tabs are not drawn either: the sidebar's branch selector already narrows
the page, and two controls for one filter would disagree.

### Phase 2: the daily register

The heaviest build: one screen, the drawer, the confirmation and a phone-first
layout.

- Register screen at `/attendance/registers/:classId/:date`: roster rows with
  P / L / A / E, suspended lock, note line, taken-by and on-behalf lines (with
  the leave reason when sent), toolbar with "Everyone else present", submit bar,
  submit confirmation from `submit_preview`, history, empty roster, closed-day
  read-only rows with Request correction, `edit_window_open`.
- Late drawer (arrival time), Excused drawer (live reason codes, note required
  when the code says so), Correction drawer (proposed mark, reason, note, and an
  arrival time when the proposed mark is Late).
- Phone: one student per row, four large targets, submit bar pinned to the foot.
- Every refusal the backend names (`UNMARKED_ROWS`, `ALREADY_SUBMITTED`,
  `STUDENT_SUSPENDED`, `ONLY_SUBMITTER_MAY_CHANGE`, `CLASS_HAS_NO_BRANCH`,
  `DATE_IN_FUTURE`, `CORRECTION_ALREADY_PENDING`, ...) shown as its sentence on
  the row or drawer it belongs to.
- The class picker from ruling 2, if approved.

**Built 12 October 2026, not committed.** The register lives at
`/attendance/registers/:classId` with the day in `?date=` (as Today keeps it),
rather than a date path segment. Class registers (`/attendance/registers`)
lists the active classes from the academics API and asks each class's own
register for its status, because only the register knows a branch-only
closure or an empty class: on 30 September 2026 at lagoon-view the Annex
classes read "Closed" while the hub alone would have counted them taken. That
is one request per class; a bulk `registers/?date=` read on the backend would
make it one. Driven against the seeded backend: marking Present, Late (time
starts at now), Excused (Other refuses to save without a note), submit with the
notice wording, a same-day change landing in the history, and the correction
drawer on a closed register (arrival time appears for Late and starts empty).
The test submitted JSS2 B (lagoon-view, 12 October 2026).

### Phase 3: corrections and the student's Attendance tab

- Corrections at `/attendance/corrections`: a paginated Pending or Decided
  queue beside one selected request review, with approve and reject (and the
  decision note from 2.2 item 4, if writable),
  `CORRECTION_STALE` and `SELF_DECISION` refusals, a requester's own-only view.
- Correction summary counts use server pagination totals. Approved and rejected
  counts are described only for the loaded page because the endpoint does not
  return a global decision split. Search also labels itself as page-only.
- The correction workspace applies `attendance.correction` Field Access to the
  recorded mark, requested mark, arrival time, reason, request note, requester,
  request time, decider, decision time and decision note. A hidden field leaves
  the queue and review; a read-only decision note is never submitted.
- Nav badge from `corrections/?status=pending` for approvers.
- Student profile gains an **Attendance** tab (`?tab=attendance`), gated on
  `attendance.register.view`: term pills from `terms`, five counts, the
  month-by-month day grid driven by `state` (marked / not taken / closed /
  suspended / not on roll), absences with reason and notice state, lesson
  absences, history mixing same-day changes and corrections.
- Hub absent rows and the chronic list link here.

**Built 12 October 2026.** Two backend changes came with it, each committed
on its own: every day on the student tab now carries `class_id`, so a day
opens the register of the class the pupil was in that day (a pupil who moved
class mid-term would otherwise have every day linked to their new class); and
"corrections waiting on you" (the Today count, its preview and the new
`?awaiting=me` list filter behind the sidebar badge) leaves out the reader's
own requests, which only another administrator may decide. Driven against the
seeded backend: rejecting with a note (the note shows in the queue and on the
student's history), requesting a correction from a register opened from the
student's day grid, the "yours: another administrator decides" state, and both
screens at 390px.

### Phase 4: settings and reports

- Settings console section **Attendance** (academics group), whole-school
  reach to write: lesson marking per level with the
  `has_published_timetable` note, reason codes (add, retire, restore, and rename
  if approved), guardian notices, threshold, edit window (if approved).
- Reports at `/attendance/reports`: term pills, range note, weekly trend,
  by class, by level, chronic, not taken, lessons missed (when sent), and the
  three downloads through `downloadAuthorisedFile`.

**Built 12 October 2026.** Settings is a section of the Settings console
(`/settings/attendance`, Academics group), opened on the key that saves it
(`attendance.settings.update`) and the attendance plan. The Attendance sidebar
does not link to it. Retire and restore act at once; the four rules save
together. The design's sample guardian email is not drawn: the real email is a
notification template this app does not hold, and a sample that drifted from it
would mislead. Reports (`/attendance/reports`) draw the weekly trend as one
series of bars scaled from a little under the lowest week, empty weeks as a
grey dash, fitting a phone without scrolling; the not-taken list pages 15 at a
time on screen. Driven against the seeded backend: a retire and restore round
trip, the threshold refusing 40, every report section, and all three file types
from the export address the menu builds.

### Phase 5: lesson registers

- Lesson list at `/attendance/lessons` for `mark_any` holders, shown only when
  `lesson_marking_on`.
- Lesson register at `/attendance/lessons/:slotId/:date`: the Phase 2 register
  in P / L / A, morning mark beside each row, no Excused, no correction, frozen
  after the window (`LESSON_DAY_CLOSED`), `NOT_YOUR_LESSON`,
  `TIMETABLE_NOT_PUBLISHED`, `LESSON_MARKING_OFF`.
- Teacher hub lesson cards open it.

**Built 12 October 2026.** The lesson list (`/attendance/lessons`) shows only
to readers who take any class's register, and its sidebar door recedes at a
school where no level marks lessons, as the design asks of Sunrise. The lesson
register (`/attendance/lessons/:slotId?date=`) reuses the class register's row
and Late drawer with the lesson's own Field Access resource. The backend's
search places gained `attendance.lessons`. Found while driving it: every
submission and notice time was printed as a bare time, so a register
submitted on a later day ("Marked 8:42 am" under Friday, submitted Monday)
read as taken on time; `timeOnDay` now adds the date whenever the day differs,
on every attendance screen. Driven against the seeded backend: the list on a
past day and today, a final lesson with its morning marks, today's open lesson
in marking mode with its Late drawer (not saved, to keep the seeded unmarked
lesson), and both screens at 390px.

**Directory redesigned 15 October 2026.** The daily lesson list is a searchable
All, Needs action or Submitted queue with status summary cards and one focused
lesson preview. The preview fetches only the selected register, rather than
loading every lesson's student rows, and keeps marking in the full register.
`attendance.lesson` Field Access controls status, submitted time, counts,
lesson marks and morning marks across the queue and preview.

### Phase 6: the staff register

- `/attendance/staff`: a group per branch, the locked "No home branch" group for
  a whole-school reader at a school with several branches, P / L / A with an
  arrival time for Late, on-leave lock with the leave link (ruling 11), exit
  note, fill present and submit per branch, `EMPTY_STAFF_REGISTER`,
  `STAFF_DAY_CLOSED`, `ON_LEAVE`.

**Built 13 October 2026.** The staff register (`/attendance/staff`) shows a
register per branch, each marked and submitted on its own, the locked "No
home branch" group for a whole-school reader, and a leave lock that links to
the person's leave record only for a reader who may read leave. Today gains
the design's "Staff register" button. The shared register row takes its own
lock wording, so a child reads "Suspended" and a member of staff "On leave"
or "No home branch". Three backend changes came with it, each committed on
its own: the staff register's search place; a class teacher's role line no
longer says "Class Teacher · Class teacher · SSS1 B"; and the scenario
seeder, which stopped with "No mark for pupil None" when run on a later day
because its corrections counted their days back from today, now keeps the
corrections it already filed. Driven against the seeded backend after the
seeder topped up 13 October: both branches, the leave and leaving rows, the
no-home-branch group, an Absent and back to Present round trip at the Annex,
and the page at 390px.

All six phases are built.

### Responsive redesign and Field Access coverage

**Built 15 October 2026.** Attendance now uses one heading and content
hierarchy across Today, Class registers, Corrections, Lesson registers, Staff
register and Reports. Today keeps its daily figures above the work queue and
opens the selected pending class in a focused register beside the queue on a
wide screen, or immediately below it on a narrower screen. The focused roster
scrolls inside its panel, uses the same row controls and cache as the full
register, and retains the link to the full register.

The focused register reuses `attendance.register` Field Access for `counts`,
`status`, `mark`, `arrived_at`, `reason_code`, `note` and `notice_state`. Hidden
counts remove progress and totals, hidden status removes its status, a hidden
or read-only mark removes write controls, Late requires a writable arrival
time, and Excused requires a writable reason. No new field or grouping was
introduced. Regression coverage locks hidden, read-only and writable states.
The six top-level routes were driven at 390px and 820px with no page-level
horizontal overflow; tables use stacked cards when the sidebar leaves too
little room for readable columns.

Class registers uses the same register fields in a directory and selected-class
preview. Counts control the completion bars and count tiles, status controls
the summary cards, filters and badges, and mark controls the student preview's
mark labels. Class, teacher and branch details remain the catalogue fields the
previous directory already displayed. The directory summary states when a
figure covers the current catalogue page rather than implying a school-wide
total. Today keeps its colored card washes and removes the colored dots beside
the metric labels.

---

## 4. Order, and why

1. **Phase 0 first** because every later phase is verified against seeded
   states, and the seeder already exists: this is a run and a check, not a build.
2. **No refits come first** because no attendance screen exists to refit.
3. **No phase is blocked.** Every endpoint is built, so the usual
   closed-surface and absent-API ordering does not apply. The order follows use
   instead: the Today screens and the register are what a school touches every
   morning; corrections and the student tab close the loop the register's
   closed day opens; settings and reports are weekly; lessons and staff are the
   second build on the backend as well.
4. **Phases 1 and 2 could swap.** Phase 1 goes first because it lays the
   foundation (keys, service, routes, nav) and its screens are read-mostly, so
   the plumbing is proved before the register's writes.
5. **The critical path is entirely ours.** The one outside dependency is
   pushing the five backend commits; the small backend gap in 2.3 item 12 is
   optional.
