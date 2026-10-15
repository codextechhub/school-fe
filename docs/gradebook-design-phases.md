# M16 Gradebook: design breakdown and build phases

**Design:** `backend/docs/designs/M16 Gradebook (standalone).html` (bundled
export, 95 KB of markup once unescaped, 92 `sc-if` blocks, all 92 accounted
for, 58 `sc-for` collections, 21 top-level flags and 55 row-scoped ones).
**Backend contract:** `backend/docs/gradebook-api-plan.md`, sections 10 and 12
("As built", builds 1 and 2). Where the design and those sections disagree,
the as-built sections win: they record decisions taken after the design was
drawn. The FRD is `XVS_M16_Gradebook_and_Assessments_Functional_Requirements_Document_v1.0.docx`.
**Seed data:** `python manage.py seed_gradebook_scenarios` builds every state
below in `lagoon-view` (two branches) and `sunrise-academy` (one branch).
**This app today:** nothing. No route, service, permission code, Field Access
resource, palette action or guide for the gradebook.
**Rulings:** what the design leaves undrawn (section 2.2) is designed here, in
the design's own visual language, rather than sent back for a revision. The
one-line items in section 2.3 follow the recommendation given there.

---

## 1. What the design contains

### 1.1 Screens

Size is the markup inside each screen's span (styles and SVG stripped).

| Screen | Size | States inside it | Collections | Writes |
|---|---|---|---|---|
| **Performance analytics** | 9.3 KB | nothing published / data; same subject across arms (only when more than one arm); term-on-term movers / "no earlier term to compare"; top of each class (ranking schools only) | `an.subjectRows`, `an.compareRows` > `c.arms`, `an.movers`, `an.tops` | 2 exports |
| **Report card** (print preview) | 8.1 KB | class figures columns on / off; position line (ranking only); conduct ratings and their key on / off; next-term line when known | `card.facts`, `card.components`, `card.subjects` > `s.cells`, `card.totals`, `card.attendance`, `card.ratings` | print |
| **Score sheet** | 8.0 KB | returned banner (by, note); elective note (takers of roll); status chip; save state (saves as you go / draft saved at / locked since submitted); submit button (N still blank / Submit sheet / Submitted); per cell: input, ABS or Exc marker with clear, "Max N" error, greyed when locked; per row: total, %, grade, remark or "Not entered", obtainable note when a component is excused | `subjectTabs`, `sheet.components`, `sheetRows` > `r.cells` | cell, ABS, Exc, clear, submit, bulk upload |
| **Assessment setup** | 8.0 KB | per programme: structure (lock note when used by a published result, total-of-100 check, Edit / Copy to edit); scale (lock note, gap-and-overlap check, band floor nudge, Reset / Copy to edit); four report card options; principal's remark templates | `setup.structures` > `st.rows`, `setup.scales` > `sc.rows`, `setup.options`, `setup.templates` | 4 toggles, band nudge, edit, copy |
| **A student's results** | 6.8 KB | per term: overall average, position (ranking only), release label, preview; "nothing published yet" calm line; totals and remark on the current term, grades only on past terms; history (amendment, hold placed, hold lifted) only when there is one | `sr.classTabs`, `sr.studentTabs`, `sr.tabs`, `sr.terms` > `t.rows`, `sr.history` | none |
| **Results hub** (admin, principal, finance) | 6.3 KB | branch tabs (several branches only); five KPIs; by-class table with stage chip; late list with reason variants (entered count, account locked with a Staff link, last working day, returned by), Remind / Reminded; "every sheet is in" | `branchTabs`, `kpis`, `classRows`, `lateRows` | remind |
| **Report cards & release** | 4.8 KB | not published / published; held count chip; per row result chip (Not published / Held / Released) and email state (none, held nothing sent, emailed on, no email on file); the guardian email sample | `rel.classTabs`, `releaseRows` | print class |
| **Broadsheet** | 4.5 KB | attendance warning (days with no register); gap note naming each missing subject and its teacher; per cell total, not in yet, or not taking; position column (ranking only); per row Done / No comment; submit (N subjects missing / N comments to write / Submit the class) | `bs.subjects`, `bs.rows` > `r.cells` | print, submit, open compile |
| **Approvals & publishing** | 4.0 KB | per class awaiting / published; held students named; approver only: Return, Principal's comments, Approve & publish; published: Raise an amendment; amendments list (only when there is one) with approve for the approver | `approvalRows`, `amendmentRows` | return, comment, publish, amend, approve amendment |
| **Phone score sheet** | 3.9 KB | one student at a time; ABS and Excused toggles; cell error; total, %, grade; obtainable note; previous / next | `ph.cells` | same as the sheet |
| **Fee holds** | 3.7 KB | balance and oldest unpaid with an as-of time; held (by, date, reason) / not held; finance user: Hold result / Lift hold; released: "cannot be held"; everyone else reads only | `holdRows` | hold, lift |
| **Moderation** | 2.8 KB | per sheet: average, highest and lowest, pass rate, comparison with other arms; Approve / Return only while submitted. The whole screen recedes where the school does not moderate | `modRows` | approve, return |
| **Who takes what** | 2.4 KB | non-core subjects of the class, takers of roll per subject | `wt.subjects`, `wt.rows` > `r.cells` | toggle |
| **Teacher hub** | 2.0 KB | my sheets (entered of roll, exam paper, chip, Enter scores / Open); my duties (class teacher, head of department) only when there are any | `mySheets`, `myDuties` | none |

### 1.2 Overlays

| Overlay | Size | Kinds and states |
|---|---|---|
| **Drawer** (`drawer.open`) | 4.6 KB | five kinds. **Return** (a sheet or a class): note required. **Hold / Lift**: Finance summary, reason required to hold, optional to lift. **Amendment**: pick subject and student, reason required. **Principal's comment**: pick a template, then edit. **Compile**: subject totals or "Not in yet", overall average, attendance, ten 1 to 5 ratings (when on), class teacher's comment required, Previous / Next, Save and next. |
| **Confirm** (`modal.open`) | 1.9 KB | **Submit sheet** (copy differs when the sheet goes to moderation). **Publish class**: results released, guardians emailed, no email on file, each held student and who held them. |
| **Toasts** | 0.8 KB | success / info / warning, with or without a body |

### 1.3 Shared chrome

- Sidebar: Gradebook under Academics with eleven sub-items. Moderation recedes
  at a school that does not moderate.
- Branch switcher in the rail for a whole-school reader; a branch-pinned user
  (Mr. Ibrahim Sule, Ikeja) has none and sees only Ikeja's classes.
- Prototype controls (school pills, "Signed in as" pills, the date) are
  scaffolding, not product.

### 1.4 The mock tenants and users, and what they require

| Tenant | Shape | Seeded as |
|---|---|---|
| **Brightfield Schools** | two branches (Lekki, Ikeja); CA 20 + CA 20 + Exam 60; A to F junior, A1 to F9 senior; ranks; conduct ratings; Senior Secondary sciences moderated by a Head of Sciences; French is an elective in JSS1 A | `lagoon-view` |
| **Sunrise Academy** | one branch; CA 40 + Exam 60; one A to F scale; no ranking, no ratings, no moderation | `sunrise-academy` |

**What recedes at Sunrise** (each is a requirement): the Branches nav item,
branch switcher and branch tabs; Moderation (nav item, screen, the head's
duty card, the "goes to moderation" submit copy); every Position column, line
and the Top of each class card; the conduct ratings section and its key; the
branch name in class meta (it reads the programme instead).

**Five users, five views of the same screens:**

| User | Sees |
|---|---|
| School administrator | admin hub, every screen, read-only on holds |
| Principal (a role the school builds; holds `class.publish`) | Return, Principal's comments, Approve & publish, approve amendments |
| Teacher with three hats (subject teacher, class teacher, Head of Sciences) | teacher hub with duties, own sheets, compile own class, moderation queue |
| Finance (the design's "bursar") | Hold result / Lift hold |
| Branch administrator, Ikeja | Ikeja's classes only, no branch switcher |

---

## 2. What the backend can serve

### 2.1 The four buckets

1. **Served and wired:** only the shell (branches, sessions and terms,
   notifications, the action palette).
2. **Served, not wired: every screen.** 40 routes under `/v1/gradebook/`, plus
   three outside it that the gradebook needs:
   `/v1/academics/classes/<id>/electives/` (who takes what),
   `head` on academic departments, and the `RESULTS_DAY` calendar event type.

   | Screen | Endpoints |
   |---|---|
   | Results hub | `GET hub/?term=&branch=`, `POST sheets/<c>/<s>/remind/` |
   | Teacher hub | `GET hub/mine/?term=` |
   | Score sheet and phone | `GET sheets/<c>/<s>/`, `PUT …/scores/`, `POST …/submit/` |
   | Bulk upload | `GET …/template/`, `POST …/import/`, `POST …/import/<token>/confirm/` |
   | Broadsheet, compile | `GET classes/<c>/broadsheet/`, `GET/PUT classes/<c>/students/<st>/compile/`, `POST classes/<c>/submit/` |
   | Moderation | `GET moderation/`, `POST sheets/<c>/<s>/approve/`, `…/return/` |
   | Approvals | `GET approvals/`, `POST classes/<c>/return/`, `GET/PUT classes/<c>/principal-comments/`, `GET classes/<c>/publish/preview/`, `POST classes/publish/` |
   | Amendments | `GET/POST amendments/`, `GET amendments/form/`, `POST amendments/<id>/approve/`, `…/reject/` |
   | Fee holds | `GET/POST holds/`, `POST holds/<id>/lift/` |
   | Release, report cards | `GET release/<c>/`, `GET report-cards/<c>/`, `GET report-cards/<c>/<st>/` |
   | A student's results | `GET students/<st>/results/` |
   | Who takes what | `GET/PUT /v1/academics/classes/<c>/electives/` |
   | Analytics | `GET analytics/`, `GET analytics/export/?table=&export=csv\|xlsx` |
   | Setup | `structures/` and `scales/` (list, create, detail, patch, delete, copy, activate), `GET/PUT remark-templates/`, `GET/PATCH settings/` |

3. **Exists but closed:** none. The gradebook has no `pending_tenant_surface`;
   it is gated by the `gradebook` capability, as attendance is by its own.
4. **Absent:** none at screen level. The only missing server pieces are two
   filters (2.3).

**The critical path is entirely ours.** No phase waits on another module or
on the backend.

### 2.2 Endpoints and fields no screen draws

Each needs a screen element, or a ruling that it stays API-only.

| What the API has | Where the design is silent |
|---|---|
| Amendments carry the corrected marks (`amendments/form/` returns the components and published cells) | the drawer picks a subject and a student and asks only for a reason |
| Reject an amendment with a note | only Approve is drawn |
| Principal's comments are one per remark band per class | the drawer writes one comment for the class |
| Return one subject's sheet to its teacher (B2) | Return goes only to the class teacher |
| Publish several classes at once (B3) | one class at a time |
| Holds filter by class and branch (B6), `finance_available` false | no filter; no "Finance cannot answer" state |
| Bulk upload preview: per cell NEW / SAME / REPLACES and issues, choose rows, confirm; file issues; "sheet changed since the preview" refusal | a toast |
| Structure editor (components, maximums, which is the exam), draft, activate, delete, "Applies to" branch (B4) | Edit is a toast; Copy to edit leads nowhere; no draft or activate state |
| Scale bands saved with `PATCH` | the nudge has no Save, only Reset |
| Remark templates `PUT` | Edit is a toast |
| `moderated_programs` and `rating_traits` settings | not on the setup screen, so a school cannot switch moderation on |
| Cumulative third-term block and promotion line (B1, B5) on card and Results tab | not drawn |
| Report card `version` after an amendment | not drawn |
| Release email state `NOT_SENT` (a send that failed) | not drawn |
| Analytics export as xlsx (B8) | CSV only |
| `head` on academic departments | this app's Departments screen has no head field, so moderation never switches on outside the seed |
| `RESULTS_DAY` calendar event type | this app's calendar does not offer it, so the hub's "results to be released" line never shows outside the seed |
| Who takes what lives in M13 Academics | the design puts it under Gradebook; this app has no screen for it |

### 2.3 Design elements nothing can serve as drawn

One line each, with the recommended ruling.

1. **Student results class and student pills.** Prototype navigation. Build
   the Results tab on the student record, as attendance's tab is, and link to
   it from the release list. Its address needs a student id, so it is no
   palette destination.
2. **"Score sheets" and "Broadsheets" nav items** land on "the first class",
   and the sheet screen has no class picker. Recommend both go to the hub
   (admin) or teacher hub (teacher), where every sheet and class is listed.
3. **Fee holds list shows only students who owe.** The API lists the whole
   roll, paginated, with no "owes fees" filter and no name search. At a
   school of 600 that is 600 rows. Needs a backend `owes=true` filter and
   `search=` (small) or a ruling to show the full roll.
4. **Release and Who-takes-what class tabs** do not scale past a handful of
   classes. Use a class select.
5. **"By the bursar, over fees"** names a role no school has. Copy must not
   name a role: "Over fees".
6. **The guardian email sample** on the release screen is static copy. Keep it
   as static copy; it states a rule (nothing from the result is in the email).
7. **Print A3 broadsheet, print class, print report card** have no document
   endpoint by design: print stylesheets over the served data, as invoices and
   receipts are printed.
8. **Scale band nudge** previews only. Add Save and Discard, or rule it a
   read-only view with Copy to edit.

---

## 3. The phases

Every phase ships: it builds, `npx eslint . --max-warnings 0` and its tests
pass, and each of its screens has been driven against the real API as every
relevant user at 390px and desktop, on both seeded schools. Each phase also
adds its palette actions (`registry.ts`, gated on the screen's own key), its
guide and catalogue route, and its Field Access wiring (end of this section).

### Phase 0: foundations and seed check (no screens)

- Run `seed_gradebook_scenarios` on `lagoon-view` and `sunrise-academy`, map
  each design user to a seeded login, and record which states the seed
  reaches (below).
- Confirm both schools hold the `gradebook` capability.
- The permission codes (`gradebook.*` at MM=32, `academics.electives.*` at
  RR=08), the five Field Access resources, the cache tags, and the shared
  types and term-param helper in `src/redux/services/gradebook/`.
- **Endpoints and the sidebar arrive with the phase that uses them**, as
  attendance's did: an endpoint nothing calls cannot be verified, and a
  sidebar link to a screen that does not exist yet is a broken page.

**Seed check result.** The seeded logins, all at `<slug>.localhost:5174`
(administrators `School@2025`, staff `SchoolStaff@2026`):

| Design user | Lagoon View login | What they reach |
|---|---|---|
| School administrator | `admin@` | every screen; publishes and decides amendments |
| Branch administrator | `branch.admin@` | hub, setup (read), analytics, raises amendments; refused approvals and holds |
| Subject teacher | `hauwa.sanni@` (in progress with blanks, reminded; class teacher of JSS1 B), `bukky.alabi@` (not started; returned by the principal), `kayode.adeniyi@` (returned by the head), `chinedu.okeke@` (submitted and approved, read-only) | teacher hub, own sheets |
| Head of department | `oluwaseun.bakare@` | moderation queue with one sheet to decide |
| Bursar (Finance Admin) | `ngozi.ibekwe@` | fee holds, hold and lift |

Sunrise Academy has `admin@`, `chinedu.okeke@`, `amina.garba@`,
`tolu.fashola@` and `ngozi.ibekwe@`; it has no branch dimension, no ranking,
no ratings and no moderation. Its JSS2 A carries the three late reasons that
name a person, read by `admin@`: Mathematics led by `yetunde.ogunleye@`
(resigned, so "last working day"), English Language led by `emmanuel.okon@`
(suspended, so "cannot sign in", with the staff record link), and Civic
Education with no main teacher. Lagoon View has no free sheet to carry them.

States the seed does **not** reach yet, each to be added to the seeder before
the phase that needs it:

| Missing state | Needed by |
|---|---|
| Two published arms of one subject (the analytics compare card) | Phase 8 |
| An earlier published term (movers, past terms on the Results tab) and a cumulative third-term card | Phases 6 and 8 |
| Admission numbers on any class but SSS1 B (screens must already cope with a blank one) | every phase; the seeder only numbers the class its upload uses |

Three defects found and fixed on the way, in the backend: the local database
had never applied the gradebook's migrations; four seeders printed the school
app's address with port 5199 instead of 5174; and the staff seeder seated every
Bursar as a Teacher, because it looked the Finance Admin role up under one
spelling of its key and could not have granted a restricted role directly
anyway. It now grants it through the role-grant ladder, as a school does.

### Phase 1: score sheet, phone sheet and teacher hub

The everyday screen and the largest drawn one. Grid with autosave (`PUT
scores`, batched cells), ABS and Exc markers, inline "Max N" and whole-mark
errors from the server, computed total, %, grade, remark, obtainable note,
returned banner, elective note, subject tabs, save state, submit gate and
confirm. Below `md`, the one-student-at-a-time form. Teacher hub with sheets
and duties. Read-only views for assistants, class teacher and head. The Bulk
upload button stays out until Phase 9. The Gradebook sidebar group under
Academics starts here, gated on the `gradebook` capability, with only the items
whose screens exist.

**As built.** `/gradebook` is My sheets, `/gradebook/sheets/:classId/:subjectId`
the sheet. Where it differs from the design:

1. Each cell is saved on its own when the cursor leaves it, because the server
   saves a batch all or nothing and one bad cell would hold back the rest. A
   mark that fails the check (over the maximum, below 0, not whole) is never
   sent and says why under the cell.
2. Subject tabs list only the reader's own sheets in that class: no endpoint
   lists a class's subjects to a teacher, and a tab must never open a refusal.
3. The duty cards (compile the class, moderation queue) are information only
   until Phases 3 and 4 build the screens they open.
4. The sidebar offers My sheets only to a reader who can enter scores; an
   administrator reaches results through the hub in Phase 3.
5. The phone view adds a student picker beside Previous and Next.
6. A sheet that is not the reader's says so and links back to My sheets,
   rather than offering Try again.

### Phase 2: setup, and the three things outside the gradebook a real school needs

So a school that is not seeded can run a term. Assessment setup (structures,
scales with Save, report card options, remark templates, and the moderation
and rating-trait settings if ruled in), with copy, draft and activate.
Department head on Academics > Departments. `RESULTS_DAY` in the calendar's
event types. The Who takes what grid on the M13 endpoint.

**As built.** Setup is a Settings console section, `/settings/gradebook`
(Academics group), gated on `gradebook.setup.update` like attendance's, and
linked from the Gradebook sidebar as Assessment setup. Where it differs from
the design:

1. Each programme is a card with its record in use and any drafts. A locked
   record (a published result rests on it) offers Copy to edit, which opens the
   copy in the editor; a draft offers Edit, Put in use and Delete draft.
2. Editing is a drawer with the server's rules checked live (total of 100, one
   examination; no gap, no overlap, a pass band), replacing the design's band
   nudge, which had no Save. A draft may be saved while it fails them.
3. The confirmation says what putting one in use does, and differs by kind: a
   class with marks keeps its structure, but every unpublished result is
   regraded by a new scale (the scale is read live until publication).
4. Switches save as they are turned. Moderation is one switch per programme;
   rating traits have their own editor. "Applies to" is offered only at a
   school with several branches.
5. The department head is a panel in the department's detail view (Name a
   head, Change, Clear) and a Head column in the table, not a field in the
   shared academics drawer.
6. Who takes what lives at `/gradebook/who-takes-what?class=`. Its classes are
   the results hub's for a hub reader, otherwise the class the reader leads;
   each tick saves alone, and removing a student with marks is refused.

### Phase 3: results hub, reminders and moderation

Admin hub with branch tabs, KPIs, by-class table, late list with Remind and the
locked-account link (only when the server sends it). Moderation queue with
approve and the Return drawer.

**As built.** `/gradebook` chooses by role, as attendance's Today does: the
results hub for a reader of `gradebook.hub.view`, the reader's own sheets for
everyone else, which also live at `/gradebook/mine`. Moderation is
`/gradebook/moderation`. Where it differs from the design:

1. Branch tabs are the app's branch lens in the sidebar, not tabs on the page.
2. Each class on the by-class table opens its broadsheet.
3. Remind is withheld on a sheet waiting for its head; a reminded sheet says
   "Reminded today". A teacher who cannot sign in links to their staff record,
   and only a reader who can unlock staff accounts is told.
4. Moderation appears in the sidebar only where it applies: to a hub reader at
   a school that moderates a programme, and to a teacher who heads a
   department. A head's duty card on My sheets opens it.
5. The three late reasons that name a person (last working day, cannot sign
   in, no main teacher) are seeded at Sunrise Academy, JSS2 A (see the Phase 0
   seed check).

### Phase 4: broadsheet and compiling

Broadsheet with gaps, attendance warning, position column, print stylesheet.
Compile drawer with step-through, ratings, comment, Save and next. Submit the
class.

**As built.** The broadsheet is `/gradebook/classes/:classId?term=`, reached
from the hub's by-class table and from the class teacher's duty card on My
sheets. Where it differs from the design:

1. The Submit button names what stops it ("2 subjects missing", "3 comments
   to write") and becomes "Submit the class" only when the server says
   `can_submit`. It is offered to the class teacher while the class is
   entering or compiling; the confirmation says the comments lock.
2. Open on each row is the compile drawer, for the class teacher and for an
   approver; an approver, and the class teacher once the class has gone to
   the principal, reads it with nothing to change.
3. Every save carries the comment (the server requires it), so a role that
   may not write the comment saves nothing, and the ratings read only too.
4. Print hides the gradebook chrome and the Compile column and prints
   landscape with the class and term as a heading.
5. The duty card follows the class's stage: "compile the class", then "with
   the principal", then "results published".
6. The principal's return note shows as a banner while the class is open
   again. Driving it needs Phase 5's Return.

### Phase 5: approvals, publishing and fee holds

Approvals queue. Return to the class teacher or to one subject. Principal's
comments per band. Publish preview and confirm, for one class or several.
Fee holds with Hold and Lift drawers, class and branch filters, and the
"Finance cannot answer" state.

**As built.** Approvals are `/gradebook/approvals` and fee holds
`/gradebook/holds`, both following the branch lens. Where they differ from
the design:

1. Return chooses who the class goes back to: the class teacher, or one
   subject's teacher (picked from the class's subjects with their main
   teachers). The second reopens that sheet as returned.
2. The principal's comments are one per remark band, as the API holds them.
   Each band starts from the school's remark ("Use the school's remark"),
   only changed bands are sent, a band left blank prints the school's remark,
   and a written comment can be changed but not emptied (the server refuses a
   blank one). A published class's comments open read-only.
3. Where two or more classes await a decision they can be ticked and
   published together. The confirmation reads each class's preview fresh,
   and the toast names any class refused and why; the others still go out.
4. "Raise an amendment" on a published class waits for Phase 7.
5. The holds list opens on families who owe and anyone held (a held family
   that has paid must stay findable to be lifted), with a switch to the whole
   roll, a class select and a search by name or admission number. The backend
   gained `owes=true` and `search=` (ruling 2.3.3), plus `term` and `classes`
   on the list so the screen needs no other read: `owes` is ignored for a
   reader who may not read balances, and not applied while Finance is down
   (`owes_applied` says which).
6. The lift drawer cannot know whether the class is already published, so
   it names both outcomes and the toast says which happened.
7. Seed gap: no Lagoon View family owes Finance anything, so a non-zero
   balance and "oldest unpaid" are covered by tests only.

### Phase 6: release, report cards and the student's Results tab

Release list with result and email states. Report card render and print, with
the class-figures, position, ratings and next-term variations, the cumulative
block, promotion line and version. Print class. Results tab on the student
record with terms, calm line and history.

**As built.** Report cards and release is `/gradebook/release?class=`, one
card is `/gradebook/report-cards/:classId/:studentId` and printing a class is
`/gradebook/report-cards/:classId`. The Results tab sits on the student
record (`?tab=results`) for readers of student results at a school with the
gradebook. Where it differs from the design:

1. The class is a select, not tabs (ruling 2.3.4). It reads a new backend
   list, `GET release/`, under the release key, so a role with the release
   key and nothing else still has classes to choose from.
2. The guardian email sample is static copy with "[First name]" (ruling
   2.3.6); NOT_SENT reads "Not sent", never "Emailed".
3. Cards print through the app's print stylesheet (ruling 2.3.7): A4
   portrait, one to a page, while the rest of the app prints landscape. The
   report card screens name the page on the document root, because a named
   page set inside the layout's grid is ignored and a page switch part-way
   adds a blank page. On paper the card is set smaller and tighter, and a
   card of fifteen subjects and ten ratings fits one page. Not yet proved:
   a last-term card with the year block and fifteen subjects (the seed has
   no earlier term).
4. A held card says so on screen and never on paper. Printing the class
   leaves held students out and names them above the cards.
5. Student names on the release list open the student's Results tab, where
   each published term has "Preview and print".

### Phase 7: amendments

Raise with the corrected marks (`amendments/form/`), the amendments list,
approve and reject, and the history entries. Mostly undrawn (2.2).

### Phase 8: analytics and exports

The four analytics cards and both exports, CSV and xlsx.

### Phase 9: bulk upload

Template download, the preview with per-cell outcomes and issues, choosing
rows, confirm, and the "sheet changed" refusal. Entirely undrawn.

### Field Access, phase by phase

The backend registers 21 switches across five resources. Each phase uses the
shared Field Access hook on its screens: a hidden field is removed with its
table header and any empty section, a read-only field is greyed and left out
of the body sent. Notable cases to cover with tests: `position` removes the
Position column, line and Top of each class; `class_stats` removes class
average, highest, lowest and the compare card; `balance` removes the balance
column and the as-of line; `guardian` follows the stricter of its own switch
and the Student Management name and email switches; a hidden `mark` makes the
sheet unreadable, not blank. The school Field Access guide and coverage record
gain a Gradebook section in Phase 0 and grow each phase.

---

## 4. Order, and why

1. **Phase 0 first** because a screen that cannot be put into its states
   cannot be verified. The seeder exists; the work is proving it reaches every
   state for the right user.
2. **Phase 1 before setup** because the seeded schools are already set up, the
   sheet is the screen used most and drawn most fully, and every later screen
   reads what it writes.
3. **Phase 2 next** because without it the module works only in seeded
   schools: a new school has no structure, no department head and no way to
   say who takes French.
4. **Phases 3 to 6 follow the results chain** (sheet, moderation, class,
   approval, release), so each phase's screens have real upstream data.
5. **Phases 7 and 9 last** because they are the least drawn: building them
   needs a ruling on how undrawn screens are designed (2.2), and nothing
   upstream depends on them.

Nothing is blocked or parked.
