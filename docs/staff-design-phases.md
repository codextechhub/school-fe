# Staff Management: design breakdown and build phases

Source: `docs/claude-designs/Staff_Management.html` (bundled export, 759 KB).
Unescaped markup: 323,343 chars, **189 `sc-if` blocks, all 189 accounted for**,
79 `sc-for` collections.

Backend read against `apps/apps/urls.py`, `apps/schools/vs_staff/`,
`apps/vs_rbac/`, `apps/vs_finance/`, `apps/vs_import_data/` and
`apps/schools/vs_calendar/` in the `backend` repo at commit `9f61bb4`.

FRD read: `XVS_M12_Staff_Management_Functional_Requirements_Document_v2.1.docx`.

> **The headline is that this module is already built on the server.**
> `schools.vs_staff` is registered, mounted at `/v1/i/me/staff/`, and ships six
> models, twenty-four routes, a leave approval ladder on the workflow engine, an
> import dataset, media policies, and a three-school scenario seeder. The FRD
> was written the day before the build and says in several places that the
> module "is still not built"; that sentence is stale and so are three of its
> refusals. Section 2 is written against the code, not against the document.
>
> **school-fe has no staff module at all.** No route, no page, no sidebar group,
> no palette action. The only thing that exists is a thin onboarding-era client
> at `src/redux/services/staff/`, and it is **broken against the current
> server** - see 2.1.

---

## 1. What the design contains

### 1.1 Screens

Nine top-level screens. Size is unescaped markup between one screen flag and the
next, which is a fair proxy for how much there is to build.

| # | Screen | Flag | Size | States | Collections |
|---|--------|------|------|--------|-------------|
| 1 | Staff Directory | `isDirectory` | 22.9 KB | 14 | 11 |
| 2 | Staff Profile | `isProfile` | 22.2 KB | 35 | 12 |
| 3 | Add staff | `isAdd` | 20.5 KB | 13 | 10 |
| 4 | Teaching duties | `isAssignments` | 12.5 KB | 11 | 9 |
| 5 | ~~Roles & access~~ **not built** | `isRoles` | 7.8 KB | 6 | 4 |
| 6 | Bulk import (hub) | `isImport` | 6.8 KB | 2 | 2 |
| 7 | Posting & reach | `isPosting` | 6.2 KB | 6 | 4 |
| 8 | Invitations | `isInvited` | 5.4 KB | 3 | 1 |
| 9 | Invitation sent | `isInvitedDone` | 3.1 KB | 1 | 0 |

**Screen 5 is not built** - `/roles` already covers the role catalogue, and
ruling 9 records what goes with it and what does not. Eight screens ship.

The profile is the deepest screen in the design: 35 states over seven tabs, with
an empty state for every tab and two separate status vocabularies in the header.
The directory is the widest: a six-figure header, a four-facet filter panel, a
selection bar, a per-row menu and a windowed paginator.

### 1.2 Overlays

**The drawer bundle is the largest single thing in this design.** At 24.8 KB and
33 states it is bigger than any screen, and it is seven drawers sharing one
shell. None of it appears on a screenshot; five of the nine screens open one.

| Overlay | Flag | Size | States | What is inside |
|---------|------|------|--------|----------------|
| Drawer | `drawerOpen` | 24.8 KB | 33 | Seven drawers: **Change status** (allowed moves only, the account effect in words, effective date, last working day, reason, and the classes that need cover named), **Role preview** (who holds it, what it reaches, withdrawn-from list), **Assign role** (roles held now with revoke, add a role, reach, duplicate detection, pre-live narrowing), **Bulk role** (one role, one reach, several people, with anybody who already holds it named), **Assign duties** (subjects x classes, lead or assistant, duplicate and lead-taken detection, existing rows with promote/demote/remove), **Class teacher**, **Change posting** (one branch or school-wide, a warning, a reason) |
| Import wizard | `importOpen` | 18.2 KB | 20 | 7 steps (Upload, Columns, Validation, Review, Confirm, Import, Done) plus a cancel-confirm |
| Command palette | `paletteOpen` | 3.1 KB | 3 | Cmd/Ctrl+E, destinations plus live staff hits, empty state |
| Confirm modal | `modalOpen` | 2.7 KB | 5 | warn / calm variants, an optional required reason, an optional named list |
| Toast | `toastOpen` | 1.1 KB | 5 | ok / info / warn / bad |

### 1.3 Shell

`navExpanded` (12.9 KB) is the collapsible sidebar; every item renders twice.
`branchPillOpen` and `sessionPillOpen` are the two header pills.
`searchWide` / `searchNarrow` swap the header search by viewport width.
Two live count badges hang in the nav: `invitedCount` on Invitations and
`gapCount` on Teaching duties. `multiBranch` and `hasGaps` decide whether the
branch dimension and the gap badge appear at all.

The design's Staff group is five items: Directory, Invitations, Posting & reach,
Teaching duties, Roles & access. **Four ship** - ruling 9 drops the last, which
`/roles` already answers from its own place under Access.

### 1.4 The per-row action model

34 row-scoped flags. This is the difference between rendering a list and
rendering a working screen, and none of it shows on a screenshot:

- **Directory row**: `r.menuOpen`, `r.postedBranch` / `r.postedSchoolWide`,
  `r.showAcctFlag` (the chip that appears only when the account disagrees with
  the employment record).
- **Coverage cell**: `cc.hasLead`, `cc.hasAssistants`, `cc.gap`,
  `cc.showLeadGap` - four states per cell, because a pairing with assistants and
  no lead is a different problem from a pairing nobody teaches.
- **Assignment drawer rows**: `aex.canPromote`, `aex.canDemote`, `aex.showShared`.
- **Grants**: `gr.schoolWide` / `gr.showBranch`, `rgh.schoolWide`,
  `rph.schoolWide` / `rph.branchScoped`.
- **Role catalogue**: `rc.unheld`, `rc.showMore` (four faces then a count).
- **Posting roster rows**: `pr.selectable` (only a posted-here row can be
  moved), `pr.showWhy`, `pr.showLoad`; `pgp.empty` per group.
- **Steppers**: `ls.done` / `ls.showBar` (lifecycle), `ws.current` / `ws.done`
  (wizard).
- **Pills**: `bm.on` / `bm.off`, `sm.on` / `sm.off`.

### 1.5 The mock tenant, and the two the backend adds

The design ships **one** school: Brightfield Schools, Lagos - two branches
(Lekki, Ikeja), live, nine roles of which six the school built for itself, 20+
staff covering all six employment statuses and all five account statuses, three
subjects, four classes, co-taught pairings, a lead gap, and two import batches.
The pre-go-live rule (the role picker narrowing to the two administrator roles)
is exposed as a **prop** rather than as a second tenant, with a comment saying
so.

The backend seeder supplies the tenants the design could not. Twelve people at
each, every one built through the real services:

```bash
python manage.py seed_staff_scenarios
```

- **`holy-cross` - two branches, live. Drive the module against this one.** The
  only live multi-branch school in the cast, which is the shape the module is
  designed for: a posting that means something, a reach that can be wider than
  it, six role templates including `teacher`, and 27 classes over 106 offerings,
  so the coverage grid is 42 cells with 34 gaps and one lead gap rather than a
  handful. Added to `CAST` on 2026-09-06.
- `brightfield-lekki` - two branches, **still onboarding**. The full cast of
  employment and account states. Its role catalogue has no `teacher` in it, so
  every person is granted School Admin by the seeder's fallback: the wrong
  school for reading a role column, the right one for the pre-live narrowing at
  a school with two branches.
- `sunrise-academy` - one branch, live. The recede case: the only place the rule
  that the branch dimension disappears at a one-branch school can be seen.
- `st-monicas` - one branch, still onboarding. The pre-live shape, where the
  role picker narrows and teaching, leave and lifecycle are closed surfaces.

Seeded people accept their invitations with `SchoolStaff@2026`, at
`first.last@<slug>.test`; each school's administrator is
`admin@<slug>.example.com` / `School@2025`. Run `seed_onboarding_scenarios` and
`seed_academic_scenarios` first.

---

## 2. What the backend can serve

### 2.1 Served and wired - one screen, and it is broken

`src/redux/services/staff/staff-api.ts` has three endpoints (list, invite,
resend) and `src/pages/protected/onboarding/components/invitations-panel.tsx`
calls all three.

**It reads fields the server no longer returns.** `SchoolStaffMember` declares
`status: string` and `role: string`; `StaffListSerializer` returns
`account_status`, `employment_status` and `roles: string[]`. The panel renders
`<StatusChip status={person.status} />`, and `StatusChip` falls through to
`status.charAt(0)` - so **any non-empty staff list throws a TypeError and takes
the row render with it.** This is a live break in a screen a school reaches
during onboarding, not a plan item, and it is the first thing to fix.

### 2.2 Served, not wired - the bulk of the module

Every route below exists, is permission-gated, and has no caller in school-fe.
`P` marks a surface open to a school that is still onboarding
(`pending_tenant_surface`); the rest answer 403 `TENANT_NOT_LIVE` before go-live.

| Endpoint | Key | P | Design element |
|----------|-----|---|----------------|
| `GET /v1/i/me/staff/` | `school.teachers.view` | P | Directory rows + the six-count header + `role_options` + `multi_branch`, in one call |
| `POST /v1/i/me/staff/` | `school.teachers.create` | P | Add staff, one transaction over six form sections |
| `GET/PATCH /v1/i/me/staff/<id>/` | `.view` / `.update` | P | Profile; the PATCH has no drawer in the design (see 2.6) |
| `GET /v1/i/me/staff/search/?q=` | `.view` | P | Palette staff hits (`staffHits`), capped at 10, carries no email |
| `GET/POST /v1/i/me/staff/<id>/status/` | `.manage` | | Status drawer. GET returns the allowed moves, the account effect in words, whether a reason and a last working day are required, **and the classes needing cover, named** |
| `GET /v1/i/me/staff/<id>/history/` | `.view` | | History tab: employment events and auth-log account events on one timeline, told apart by `kind` |
| `GET /v1/i/me/staff/<id>/roles/` | `.view` | P | Access tab: grants, revoked grants with who and why, derived reach, and per-user overrides (omitted entirely without `school.user_overrides.view`) |
| `GET/POST /v1/i/me/staff/<id>/qualifications/`, `PATCH/DELETE .../qualifications/<id>/` | `.view` / `.update` | P | Qualifications tab (read only in the design) |
| `GET/POST /v1/i/me/staff/<id>/documents/`, `DELETE .../documents/<id>/` | `.view` / `.update` | P | Documents tab (read only in the design) |
| `GET/POST /v1/i/me/staff/<id>/leave/`, `PATCH/DELETE .../leave/<id>/` | `school.leave.*` | | Leave tab. GET carries `days_taken` and an explicit `balance_note` |
| `GET/POST /v1/i/me/staff/<id>/teaching/` | `.view` / `.assign` | | Profile Teaching duties block; POST is the assign drawer |
| `PATCH/DELETE /v1/i/me/staff/teaching/<id>/` | `.assign` | | Make lead / Step back / Remove |
| `PUT /v1/i/me/staff/teaching/class-teacher/` | `.assign` | | Class teacher drawer (write only - see 2.4) |
| `GET /v1/i/me/staff/teaching/coverage/` | `.view` | | Coverage grid, paginated, with `coverage_gaps`, `lead_gaps` and a `headline` sentence |
| `GET /v1/i/me/staff/roster/?branch=` | `.view` | P | Posting & reach: three labelled groups, only the first movable |
| `POST /v1/i/me/staff/posting/` | `.update` | P | Bulk posting move |
| `POST /v1/i/me/staff/roles/bulk/` | `school.roles.assign` | P | Bulk role drawer |
| `POST /v1/i/me/staff/<id>/resend/` | `.create` | P | Resend, on both Invitations and the profile |
| `POST /v1/i/me/staff/<id>/invitation/revoke/` | `.manage` | | Revoke on Invitations |
| `POST .../account/suspend/`, `/reactivate/`, `/unlock/` | `school.administrators.suspend` / `.reactivate` | | Unlock is the profile's `pShowUnlock` button; suspend and reactivate have no design control (see 2.5) |
| `PATCH .../account/email/` | `school.administrators.update` | | No design control (see 2.5) |
| `GET /v1/rbac/tenants/<slug>/roles/`, `POST .../role-assignments/`, `POST .../role-assignments/<id>/revoke/` | `school.roles.view` / `.assign` | | The assign-role drawer's picker, grant and revoke. The catalogue read that fed screen 5 is not needed - see ruling 9 |
| `/v1/import/...` (dataset `staff`) | `school.students.import` family | | Bulk import. `DatasetTypeChoices.STAFF` is in `TENANT_DATASETS`, the template columns and row handler exist |

**Four permission keys are missing from `src/permissions/index.ts`** and must be
added before any of the gating above can be written: `school.teachers.assign`,
`school.leave.view`, `school.leave.apply`, `school.leave.manage`. The first
takes `100411`; the leave resource takes the next free `RR` under `MM=10` (10 or
11 are unused), and `apply` needs a new `AA` code, since the header block lists
no verb for it.

`DatasetType` in `src/redux/services/dashboard/import-types.ts` also has no
`"staff"` member.

### 2.3 Exists but closed to this caller

| Design element | Where it lives | Why it is closed |
|---|---|---|
| ~~**Salary band** card on the profile Overview tab~~ **Dropped** | `GET /v1/finance/employee-salaries/?entity=<code>` | Gated on `finance.salary.view`. A head teacher holding every `school.teachers.*` key does not hold it, and should not have to. The payload is also the wrong shape: it is the whole roster, filterable by `search=<name>` and not by employee id, and there is **no band concept anywhere** - `EmployeeSalary` carries gross, PAYE and pension in kobo, and `SalaryStructure` is a deduction rule, not a grade. The card is not built; see ruling 3. |
| **Timetable clashes** panel on Teaching duties | `GET /v1/academics/timetable/teachers/` returns `has_clash` per teacher; `GET .../teachers/<user_id>/` returns the warnings | Gated on `academics.timetable.view`. Same problem: a staff reader may hold no timetable key. |
| Teaching, leave, lifecycle and account surfaces **before go-live** | `vs_staff` views without `pending_tenant_surface` | Deliberate. A school still onboarding may add, invite, resend, post, read and bulk-grant; it may not terminate anybody, record leave, or write a teaching duty. The design's `showPreLive` / `rgShowPreLive` already narrow the role picker; the same narrowing has to reach the Teaching step of the Add form. |

### 2.4 Absent

Two, both in the same corner, and both small.

1. **`SchoolClass.class_teacher` is write-only.** The column exists (migration
   `0009_schoolclass_class_teacher`) and `PUT /teaching/class-teacher/` writes
   it. **No serializer anywhere exposes it** -
   `apps/schools/vs_academics/serializers.py:364` omits it. The design needs it
   in three places: the Class teachers panel on Teaching duties
   (`caClassTeachers`, one row per class with its teacher and a Set button), the
   profile's `asgClassTeacherLine`, and the class-teacher drawer's current
   value. **Ours to ask for; one field on one serializer.** Until it lands,
   those three elements can only be written blind.

2. **No by-teacher read for the Teaching duties list lens.** `caTeacherRows`
   (`ct.name`, `ct.loadLabel`, `ct.ownedLabel`, and `ct.rows` of their
   assignments) needs every teacher with their duties. Coverage returns
   class-by-subject cells; the only per-person read is
   `GET /staff/<id>/teaching/`, so the list lens is N+1 across the whole
   teaching staff. **Ours to ask for**: a `?group=teacher` on the coverage
   endpoint, or teacher rows beside the cells.

Nothing else is missing. Every other screen in this design has an endpoint.

### 2.5 Endpoints with no screen

The reverse direction, and it is longer than the forward one. Each of these is
either a gap in the design or an endpoint nobody will call.

- **`PATCH /v1/i/me/staff/<id>/`** - the profile has an **Edit** button and the
  row menu has **Edit record**, and there is **no edit drawer in the design**.
  The drawer bundle is status, role preview, assign role, bulk role, assign
  duties, class teacher and posting. Two controls point at nothing.
- **Qualifications write** - `POST`, `PATCH` and `DELETE` all exist; the
  profile's Qualifications tab is a read-only list with no Add. The only place a
  qualification can be entered in the whole design is step 5 of the Add form,
  so a school can record a degree on the day somebody is hired and never again.
- **Documents write** - `POST` and `DELETE` exist and the media view serves the
  files with a per-file policy; the Documents tab lists name, type and date and
  **does not link the file**. Nothing in the design downloads a staff document.
- **Leave write** - `POST`, `PATCH` and `DELETE` exist, the module provisions a
  `leave-request` workflow template and a `leave-approvers` group per school,
  and the FRD's decision 4 is answered yes: leave is applied for and approved.
  **The design has no Apply, no Record and no decision anywhere.** Its own note
  says "Approval, if it is ever switched on, is the workflow engine's", which
  was true when it was drawn and is not now. Ruling 11 closes this: the two
  write controls are built in phase 2.
- **`POST .../account/suspend/` and `/reactivate/`** - reachable only as a side
  effect of an employment transition. There is no account-only control, so a
  school cannot close a login without also recording that the person is
  suspended from their job.
- **`PATCH .../account/email/`** - no control. A mistyped invitation address can
  be resent but not corrected.
- **`days_taken`** on the leave payload, and the two FR-013 directory warnings
  (`data.warnings`: somebody on leave today whose status is not On Leave; a
  resignation whose last working day has passed with the account still open) -
  nothing in the design renders either.

### 2.6 Design elements nothing can serve, and rulings needed

Eleven, three of them decided. Each of the rest needs one line before the phase
that touches it.

1. **"Mark accepted" on Invitations.** Activation is the invited person opening
   a single-use link and setting a password. The button moves the employment
   status alone: Mrs. Okonkwo presses it on 20 October, Mr. Adeyemo reads Active
   on every screen in the school, and he still cannot sign in. FRD 3.4 rules it
   out. **Proposed: drop the button; Resend is the control that helps.**
2. **The status drawer's promise.** It says "The account stays usable until the
   last working day, then closes." Nothing closes it - there is no periodic task
   registry. Mr. Ayanwale's last day is 18 December; on 19 December he can still
   sign in, indefinitely. **Proposed: reword to say an administrator closes it,
   and surface the FR-013 warning on the directory.**
3. **Salary band. DECIDED: dropped.** The card is not built and the profile's
   Overview tab carries no money at all. Reading it would have meant giving a
   head teacher `finance.salary.view` to see one number, pulling the school's
   whole payroll roster to find one row, and printing a band label that exists
   nowhere in the data. Payroll stays where it is: `EmployeeSalary` in the
   finance engine, read on a finance screen by somebody holding a finance key.
   The Overview tab keeps bio, contact and employment rows only.
4. **Timetable clashes panel.** M14 is now built, so this is no longer
   impossible - `has_clash` per teacher is real. It needs a timetable key the
   reader may not hold. **Ruling needed: the empty panel with a line, or the
   reduced live version behind a permission gate.**
5. **Edit / Edit record with no drawer.** **Proposed: build an edit drawer; the
   PATCH exists and `SELF_EDITABLE_FIELDS` already narrows it for self-edits.**
6. **Employment type picker omits Volunteer**, and the design's transition map
   omits On Leave -> Suspended. The backend has both. **Proposed: follow the
   backend; render the options the endpoint returns rather than a local table.**
7. **The coverage grid crosses every class with every subject.** The backend
   crosses `SubjectOffering` with the classes at that level. Indistinguishable
   at four classes and three subjects; wrong at sixty. **Proposed: render what
   the endpoint returns and build no cross product on the client.**
8. **Bulk import as a full screen.** The house ruling for students was the
   opposite: "bulk import is a thing you do TO the directory, not a place you go"
   (`routesPath.ts`), so it is a drawer over the list. This design gives it a
   screen with a template card, guidance and batch history. **Ruling needed.**
9. **Roles & access. DECIDED: not built at all.** The design's screen 5 is out
   of scope. `/roles` already exists - "Roles & Permissions", mounted in the
   sidebar under Access on `P.VIEW_ROLES`, with the role drawer behind it - and
   a second door onto the same catalogue is a second door, whichever way it is
   dressed. Nothing about screen 5 is built: not the screen, not its sidebar
   item, not a palette action, and not the `rlCatalogue`, `rc.faces`,
   `rlRevoked` or `rlStaffOptions` collections.

   **Three things it holds do NOT go with it, because they are per-person and
   live elsewhere in the design.** The profile's **Access tab**
   (`tabAccess` / `noGrants`) is one person's grants, reach and overrides from
   `GET /staff/<id>/roles/` - phase 2, unaffected. The **assign-role drawer**
   (`dwIsRole`) opens from the profile and the directory row menu - phase 4,
   unaffected. And the **role preview drawer** (`dwIsPreview`) has two openers
   in the prototype, the catalogue's Permissions button and the assign-role
   drawer's "See everything it reaches" (`rgPreview`); dropping the screen loses
   the first and keeps the second, so the drawer survives and stays reachable.

   The Staff sidebar group is therefore **four items, not the design's five**:
   Directory, Invitations, Posting & reach, Teaching duties.
10. **`/academic-structure/assignments`** is a placeholder that says class
    teachers open "once at least one member of staff exists". They exist now.
    **Ruling needed: redirect it to Teaching duties, or fill it.**
11. **Leave. DECIDED: wire up Apply and Record in phase 2.** The tab gains two
    controls and stops being a list nothing can add to. **Apply** is a person
    filing their own, under `school.leave.apply`, which every member of staff
    holds; **Record** is an administrator filing on somebody's behalf, under
    `school.leave.manage`. The endpoint is the same `POST`, and the server
    picks the key from whether the record is the caller's own, so the two
    controls are one form behind two gates rather than two forms.

    The decision half needs no new screen. `workflow-routes.tsx` already mounts
    the whole ladder from `@xvs/finance`: Approvals, Approval detail, My
    Submissions, Delegations, Approver Groups and Templates. So a filed request
    lands in a queue that exists, the person tracks it in My Submissions, and
    the empty `leave-approvers` group is fixable on Approver Groups without
    anybody writing a screen. **Two things to check while building rather than
    assume**: that the generic approval detail renders a `schools.leave_request`
    payload legibly - those screens were drawn for finance documents - and that
    a school whose group is still empty is told its request has parked rather
    than being left to wonder.

---

## 3. The phases

Every phase builds, passes its tests, adds its palette actions and coverage-test
entries, and is driven in a browser against the real API at 390px and desktop
before it is called done.

### Phase 1 - Fix the break, and lay the seam

The only phase with no new screen, and it ships a screen anyway: the onboarding
Invitations panel, working again.

- Fix `StaffListSerializer` drift in `staff-types.ts` and
  `invitations-panel.tsx`: `status` -> `account_status`, `role` -> `roles[0]`,
  and make `StatusChip` safe against an absent value.
- Replace `staff-api.ts` with the full client: 24 endpoints, typed against the
  serializers, `silent: true` on the ones whose refusals are field errors.
- Add the four missing permission keys and the `"staff"` `DatasetType`.
- Add `routesPath.PROTECTED.STAFF`; the sidebar group, **four items** with its
  two live badges (ruling 9 drops the fifth); and the palette actions, each
  gated on the same key its screen checks. `View staff`, `View invitations`,
  `View postings`, `View teaching duties`, and one `kind: "do"` for
  `/staff?action=new`.

### Phase 2 - Directory and Profile — SHIPPED

Driven against `holy-cross` at desktop, 390px and 820px. No console errors, no
horizontal overflow, phone falls into card mode.

**Two things changed from the plan while building, both for the same reason.**
The selection bar is NOT here: it was scoped for this phase with its two actions
landing in phase 4, and a selection bar whose buttons do nothing is the control
the house rules exist to forbid. It arrives whole, in phase 4. And the profile
header shows the two statuses **labelled** - "Employment Active, Account Locked"
- rather than as two bare chips beside the name: both read Active for most
people, and two identical green chips say nothing and hide which is which.

**One defect found and fixed in passing.** The leave chip printed `APPROVED` in
grey. `LeaveRequest.display_status` is derived rather than looked up, so it
carries a CODE and no `*_label` comes with it, and the tone map was keyed on
title case - so every status fell through to the neutral default. The type now
names the five codes it can be, and the wording lives on the screen.

**What the phase's own plan said it would build, below.**


The two biggest screens, and between them 49 of the design's 189 states.

- **Directory**: the six-count header with the side breakdown that switches from
  branch to role at a one-branch school; the four-facet filter panel with the
  account-status separation spelled out; chips; the selection bar (its two
  actions land in phase 4); the row menu; the windowed paginator; empty,
  no-match and single-person states.
- **Profile**: header with both status chips, the account flag, Unlock and
  Resend; the lifecycle strip and its off-path note; seven tabs with an empty
  state each; the Overview bio / contact / employment rows.
- **Status drawer**, including the named cover list.
- **Edit drawer** - new, not in the design (ruling 5).
- No salary card (ruling 3).
- **Leave tab, writable** (ruling 11): Apply for a person's own leave, Record on
  somebody's behalf, cancel a pending request, `days_taken` shown with the
  server's own `balance_note` beside it so nobody reads it as a balance, and a
  link into My Submissions for a request that is still being decided.

### Phase 3 - Add staff, and Invitations — SHIPPED

Driven against `holy-cross` at desktop, 390px and 820px, including a real
create: form validation, the POST, the confirmation screen, the sidebar badge
moving 1 → 2, and the withdraw flow taking it back to 1. No console errors, no
overflow.

**Documents moved off the Add form.** The plan had them collected there and
uploaded after the create returned an id. Built that way, a record is created
and one attachment fails, and there is nowhere to retry: the Documents tab is
read-only. So the form says plainly that documents are added on the record, and
the upload control belongs on that tab.

**The teaching step is gated more loosely than the design's.** The prototype
matches the role name against `"Teacher"` and `"Lead Teacher"` exactly; this
matches the word "teach" in either the name or the key, which also catches a
Teaching Assistant, and the form says duties can be assigned later whether the
step appears or not - so a school that calls its teachers something else loses a
shortcut rather than a capability.

**One palette collision, worth knowing about.** `view-staff-invitations` was
already taken by the onboarding checklist's invitations tab, which is a
different screen on a different key. The module's action is
`view-pending-invitations`, and both are legitimately reachable while a school is
being set up, so they are told apart by label and section rather than by hiding
one.

**What the phase's own plan said it would build, below.**


- The six-section Add form as one transaction, with the photograph, the
  suggested staff number, the pre-live role narrowing, the role reach summary,
  and the teaching step gated on the role. **Documents upload after the create
  returns an id** - the create serializer takes qualifications, subjects and
  classes but not documents.
- The Invitation sent screen and its four exits.
- The Invitations list: resend, revoke, view. No Mark accepted (ruling 1).

### Phase 4 - Posting & reach, and the three role drawers — SHIPPED

Driven against `holy-cross` at desktop, 390px and 820px, including real writes:
a role granted through the single drawer and withdrawn again, a role granted
through the bulk drawer and withdrawn again, and both verified back through the
API to confirm the seeded school was left as it was found. No console errors, no
overflow.

**The role preview shows sentences, not keys.** It was built printing what the
role payload carries - `payments.virtual_account.view` - which is not something
a head teacher reads before handing somebody the money. The keys are joined
against the permission catalogue, which is the one place they have labels, and
a key the catalogue does not carry falls back to monospace so it reads as an
identifier rather than as broken copy.

**Posting is a pending surface after all.** The route was written closed on the
reasoning that moving somebody between branches is an operation of a running
school. The backend disagrees: both the roster read and the bulk move declare
`pending_tenant_surface`, and the palette's readiness test caught the
disagreement. The app mirrors the server; a route closed here over an endpoint
that answers is a door locked from the inside.

**What the phase's own plan said it would build, below.**


Ruling 9 took a screen out of this phase, so what is left is the Posting screen
plus the controls that finish phase 2's directory selection bar and the profile's
Assign role button. Everything here is open before go-live.

- **Posting & reach**: the three roster groups with only the first selectable,
  the bulk move, and the sentence that keeps posting and reach apart.
- **Assign-role drawer**: roles held now with revoke, add a role, reach, the
  duplicate check, and the pre-live narrowing to the two administrator roles.
- **Bulk-role drawer**: one role, one reach, several people, with anybody who
  already holds it named rather than silently skipped.
- **Role preview drawer**, reached from the assign-role drawer's "See everything
  it reaches". Its holder list needs
  `role-assignments/?role=<key>&assignment_status=ACTIVE`, which is one call for
  one role - the expensive shape was the catalogue's, and the catalogue is gone.

### Phase 5 - Teaching duties — SHIPPED, and no longer blocked

Driven against `holy-cross` at desktop, 390px and 820px: all four cell states on
screen at once, the duties drawer opening from a covered cell with the pairing
pre-selected and its duplicate warning firing, the class-teacher drawer, and the
nav badge reading 34. No console errors, no overflow.

**The dependency was closed rather than worked around.**
`SchoolClass.class_teacher` is now readable - one serializer field, the join
added to the list queryset, and two tests. So the Class teachers panel is live
rather than written blind. Backend commit `fefab12`.

**Ruling 4 taken, and it can be reversed cheaply.** M14 shipped after the FRD
declared the clash panel impossible, so `has_clash` per teacher is now real. The
panel shows the teachers the timetable has double-booked to a reader holding
`academics.timetable.view`, and to a reader without one it says where clashes
will appear rather than showing an empty list that reads as "there are none". It
still computes nothing: a clash is a fact about two timetable slots, and which
two lessons collide is on the teacher's own grid, which is where the link goes.

**Ruling 10 is untouched.** `/academic-structure/assignments` still says class
teachers open "once at least one member of staff exists". They exist, and that
screen is another module's, so it waits for the ruling rather than being
redirected on the way past.

**What the phase's own plan said it would build, below.**


**Blocked on one backend field.** The coverage grid, the assign drawer and the
clash panel are all unblocked; the Class teachers panel and the profile's class-
teacher line need `class_teacher` on the class serializer (2.4). Build the rest
and land that panel when the field arrives; it is a one-field change, not a
module.

- Coverage grid with four cell states, the only-gaps filter, the headline
  sentence, and the two gap counts kept apart.
- Assign duties drawer: lead / assistant, duplicate and lead-taken detection,
  existing rows with promote, demote and remove.
- By-teacher lens - and if the grouped read of 2.4 does not land, say plainly in
  the phase notes that it is N+1 rather than shipping it quietly.
- Clash panel per ruling 4.

### Phase 6 - Bulk import — SHIPPED

Driven against `holy-cross` at desktop, 390px and 820px, with a real file taken
all the way through: upload, a full header match, validation, confirm, import.
Two rows written, the directory moving 13 → 15 behind the drawer, and a
deliberately bad row refused by name. No console errors, no overflow.

**Ruling 8 taken: drawer to import, history on the directory.** The wizard opens
over the rows the staff will land in, matching the students ruling. The record
of an import - which file, how many rows, who was skipped and why - sits in a
folded panel above the header, because "was the caretaker ever added?" is asked
months later and without a file in hand.

**The template card the ruling worried about had somewhere to go after all.**
It is step 1 of the wizard already: name, code, 12 columns, 4 required, the
download, the instructions and a preview of the file's first rows. Nothing was
lost by dropping the separate screen.

**Two defects found and fixed, both on the backend.** The staff import could not
import anybody (`3051f62`), and the template seeder leaves a renamed template
active alongside its replacement (`406b072`). Both are described in section 5.

**One thing the design promises that the engine does not do.** The design says
"rows with errors are skipped with a reason, never guessed at", implying the
good rows still import. The engine refuses the whole batch while any error
stands: "Correct those rows and upload the file again. The wizard will not
publish only part of the file." That is the shared engine's behaviour, the same
one console and the student import get, and changing it is not this module's to
do. The screen says what actually happens.

**What the phase's own plan said it would build, below.**


Mostly assembly: `import-wizard.tsx` already has all seven steps and
`bulk-import-drawer.tsx` already wraps it. What is new is the staff dataset, the
template card with its typed columns and required flags, the three
before-you-upload notes, and the batch history with its four outcome chips.
Shape per ruling 8.

---

## 4. Order, and why

1. **Phase 1 first because something is broken.** An onboarding school hits the
   Invitations panel today and the row render throws. Everything else in the
   phase is seam work that every later phase needs anyway.
2. **No seed phase.** The usual rule is that scenario data comes before the
   screens that need it. It was already done: `seed_staff_scenarios` builds
   every tenant through the real services, so a state that cannot be reached
   honestly fails in the seeder rather than being written directly and believed
   on a screen. This is the single biggest reason the plan is short. Phase 1
   added `holy-cross` to its cast, because the three schools it shipped with had
   no live multi-branch school between them.
3. **Directory and Profile before everything else** - highest visibility, fully
   served, and the two screens every other screen links into.
4. **Add and Invitations next** because they close the person lifecycle, and
   because the Add form is the only place a qualification can currently be
   entered.
5. **Posting and the role drawers before Teaching** because they are open before
   go-live, they read surfaces that already work, and they close the two
   controls phase 2 leaves stubbed on the directory selection bar. Teaching is
   the one phase with a backend dependency.
6. **Import last** because it is assembly over a wizard that already exists, and
   because its shape depends on a ruling rather than on code.

**The critical path you control runs to the end of phase 6.** The one external
dependency - `class_teacher` on the class serializer - blocks one panel inside
phase 5 and nothing else. No phase is parked.
