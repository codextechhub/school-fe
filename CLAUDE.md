# CLAUDE.md - school-fe

## The finance and procurement screens are not this app's to edit

Everything under Finance, Procurement and Workflow comes from `@xvs/finance`
(the `FinPro` repo), shared with the CodeX console. `@/pages/protected/finance/*`
and its siblings are aliased into `node_modules/@xvs/finance`, in both
`vite.config.ts` and `tsconfig.app.json`, so a file that looks local is not.

Two rules follow.

**A fix to a shared screen belongs in FinPro.** Edit it there, cut a version with
its `release.sh`, and let it come back here through the pin. Editing under
`node_modules` changes nothing durable: the next install overwrites it, and
because this app holds a real copy rather than a symlink, the edit is invisible
to the console the whole time it appears to work here.

**A tag that only one application moved onto has released nothing.** The console
symlinks the FinPro working tree, so an edit is live there the moment it is
saved, while this app sees nothing until its pin moves and it reinstalls. The two
apps therefore fail in opposite directions and neither notices alone:

> Finance Settings was offering sections this app does not route. The fix was
> tagged `v0.1.22`, this app was moved onto it, and console-fe was left pinned to
> `v0.1.21`. Both typechecked clean, because the console was compiling against
> its symlink rather than against what it pins. A fresh install anywhere else,
> CI included, would have fetched `v0.1.21` and quietly not had the fix.

So move both applications in the same change, with `release.sh`, and commit both
lockfiles.

**A school-only screen stays here.** Anything the console has no use for - the
fee due policy is the example, because its endpoint is the FAL's and CodeX bills
nobody school fees - lives under `src/pages/protected/school-finance/` and reaches
the package through the host contract in `src/xvs-host.tsx`. It must not go under
`src/pages/protected/finance/`: that path is aliased away to the package, so a
file placed there is unreachable from this app.

## Pre-ship review (`ship-check`)

When I say **`ship-check`** (or "run the ship-check") on a change, answer these
four questions about the code you just wrote - honestly and specifically, not as
a rubber stamp. Point at real files/lines, name concrete risks, and if the answer
to 1 or 2 is "no", say so and propose the fix. Don't claim "secure/efficient"
without naming *what* makes it so.

1. **Did you build this in the most secure way?**
   - `rbac_permission` (or equivalent authz) on every new view, and the right
     verb (view vs create/update/generate). Entity/tenant scoping via the
     standard resolver - can a caller read/write another tenant's rows by
     changing a pk or `?entity=`?
   - What does the serializer expose? Flag raw `JSONField`/metadata, PII,
     secrets, internal ids. Apply FLS where the field is sensitive.
   - Input validation, mass-assignment, and injection surface.

2. **Did you build this in the most efficient way?**
   - Query cost: N+1 (`select_related`/`prefetch_related`), missing indexes for
     the filter/order columns, unbounded querysets, pagination where lists grow.
   - Transactions/locking correct and no wider than needed; no redundant writes.
   - Is there a simpler implementation that does the same job?

3. **What regressions could this introduce?**
   - Migrations (reversible? data-safe?), changed response shapes, permission
     keys that must be seeded/assigned, signals/side-effects, shared services.
   - List the blast radius explicitly; "none" needs justifying.

4. **What tests do we need before we ship it?**
   - Security-critical first: permission-denied (403) and cross-tenant isolation.
   - Then happy path + every filter/branch + the empty-list response shape
     (`success_response` coerces `[]` → `{}`).
   - Name the tests; if you added some, say which cases are still uncovered.

Finish with a one-line **verdict**: ship / fix-first, and the single most
important thing to do before shipping.

## Wrapping up: report in plain words

When you finish a task - a build, an investigation, a document, a round of
decisions - close with a plain-language breakdown rather than a wall of prose.
Short numbered lines, one point each, ordinary words. Assume I am reading it tired.

Use **only** the sections that actually apply, and **skip the ones that don't** -
an empty heading is worse than no heading, and never pad a section to fill it out.

- **What you now have** - the finished things, one line each. Only if something was
  produced.
- **What you decided** - decisions taken and locked, one line each. Only if
  decisions were actually made.
- **What we found wrong in the code** - real defects and gaps, grouped under short
  themes once there are more than about four. **Only if there are findings** - if
  nothing is wrong, leave this out entirely rather than writing "nothing found".
- **Where to go next** - the order of the next steps, and which of them are
  unblocked right now.

That list is closed. Do not invent a heading for something that does not fit one
of them: put it under the heading it belongs to, and if it belongs under none of
them, leave it out of the breakdown entirely. A section I did not ask for is one
I have to decode before I can tell whether it needs me.

How to write it:

- Plain words beat precise jargon. "The page breaks on a phone" lands; "flex
  container overflows at the `md` breakpoint" does not.
- Size things honestly in both directions - say when something feared turns out to
  be a one-line fix, and say when something small turns out to be load-bearing.
- Put the worst finding where it cannot be missed, even if that breaks the order.
- Never place resolved problems under a heading that suggests they remain broken.
  When all reported defects were fixed, say so plainly and omit any unresolved-
  findings section.
- Keep file/line references out of the breakdown; they belong in the detail above
  it, not in the summary.
- Don't re-explain what I already know from the conversation.

## Asking, suggesting and disputing: use a real example

When you need a decision from me, **ask the question directly**. Do not bury it in
a paragraph, do not quietly answer it yourself and move on, and do not hand me a
list of considerations in place of the question.

Then **show me the consequence with a real example** - named people, a named
school, a specific sequence of events. The example is what makes a choice
obvious, so it is not decoration and it is not optional.

This applies equally to three things:

- **questions** - what you need me to decide;
- **suggestions** - something you think we should do;
- **disputes** - something you think is wrong, including something I decided.

Write the example the way it would actually happen:

> Bright Star School enrols Tunde and the admin mistypes his mother's address as
> `adaokeye@gmail.com`. That address belongs to a stranger who already has an
> account, because her own daughter attends Greenfield. If an attached link shows
> the full record straight away, she opens her app and sees Tunde's class, his
> fees, his home address and his father's phone number.

Not:

> Attached links may expose PII to an incorrect recipient where the email address
> is mistyped.

The second one is true and nobody can act on it. Abstractions hide the size of a
thing in both directions - they make a small risk sound alarming and a serious one
sound routine. A concrete case is the only way I can weigh it.

Keep it short. One example, the shortest one that still shows the consequence.
Where a choice has two sides, show the bad case **and** the good case, not only
the side you favour.

## Fixing problems: root cause, not symptom

When I ask you to fix a problem, treat the reported issue as one *instance* of
a potentially wider defect - fix it holistically:

1. **Trace it to its source.** Ask why the bug exists - a wrong assumption, a
   missing invariant, a fragile pattern - not just where it surfaced.
2. **Fix the class, not the case.** If the same root cause can bite elsewhere
   (other screens, endpoints, callers of the same helper), fix it at the choke
   point they all share, or sweep the other occurrences in the same change.
3. **Name the root.** In the summary/commit, state the underlying cause and
   where else it applied, so the fix is reviewable as a class-fix, not a patch.

A fix that only silences the reported symptom while the source remains is not
done - that includes suppressing errors, special-casing one caller, or adding
a guard where the real problem is upstream. The goal is that future problems
from the same source never happen.

## Responsive views - every screen must work on phone AND desktop

Every screen you build or change must render well at desktop **and** small
widths - a user switching from PC to phone must never get a broken view.
Horizontal page overflow is a bug, full stop.

House conventions. These hold in this repo and in console-fe, and the two
are kept in step - a fix to one of them belongs in both:
- The DashboardLayout children wrapper is `grid grid-cols-1 min-w-0`, so nowrap
  tables can never stretch a page past the viewport. CustomTable has phone-card
  mode: rows render as stacked label/value cards below `md`, and dense tables
  opt out with `mobile="scroll"`. Both are in place - do not port them again.
- **Every page's `<main>` is `PageShell`** (`src/components/layout/page-shell.tsx`),
  never a hand-written class string. It owns the page padding, `min-w-0`, and
  the grid guard; rhythm (`gap-*`, `space-y-*`), alignment and colour stay with
  the page.
  The guard is the reason it exists. The wrapper above protects a BLOCK main and
  cannot protect a second grid declared inside it, and a grid column with no
  width is sized to its min-content - so one nowrap table drags the whole page
  off the right of the screen. **There is therefore no `grid` class to pass:
  there is a `grid` prop, and it always emits `grid grid-cols-1 min-w-0`.**
- **Scrolling boxes use `ScrollArea`** (`src/components/ui/scroll-area.tsx`),
  not `overflow-y-auto` on the box itself. A native scrollbar takes its width
  out of the element, so a table shifts its columns the moment it becomes
  scrollable, and how much it takes depends on the reader's operating system and
  pointing device - a layout checked on a Mac trackpad was never checked on
  Windows with a mouse. ScrollArea floats a thin thumb over the content instead.
  `Table` already routes through it, so every table gets this for free.
  **The page itself keeps its native scroll**, deliberately: replacing the
  window's scroller breaks anchor links, `scrollIntoView`, sticky headers and
  the browser's scroll restoration. `index.css` styles that one thin so the two
  look like the same scrollbar.
- Toolbars/action rows get `flex-wrap`; tab strips `max-w-full
  overflow-x-auto` with `whitespace-nowrap` buttons; form grids
  `grid-cols-1 sm:grid-cols-N`; count-KPI strips `grid-cols-2 … lg:grid-cols-4`
  (long money values stay 1-col on phones); drawers `w-full sm:max-w-[…]`;
  fixed side rails/sidebars stack below `md`
  (`grid-cols-1 md:grid-cols-[260px_1fr]`).
- In a flex row, a `flex-1` wrapper needs `min-w-0` or descendant `truncate`
  silently stops working.

**Verify, don't assume.** After any screen work run the overflow probe:
`cd .claude && BASE_URL=<vite-url> ROUTES="/your/routes" node ./mobile-audit.mjs`
(one-time: `cd .claude && npm init -y && npm i playwright`). **Pass EMAIL and
PASSWORD**: the script's defaults are console-fe's seeded operator, so without
them it fails at the login form on this app and reports nothing. It drives each route logged-in at 390px (phone)
and 820px (tablet), screenshots both to `/tmp/verify-design/shots-responsive/`,
and reports page-level horizontal overflow with the offending elements. **Look
at the phone screenshots** - zero overflow with a crushed side-by-side layout
is still a fail. Desktop remains the design source of truth; phone adapts
(stack, wrap, cards) - never hide or truncate data away.

**Depth policy - phones are view + simple actions, not full parity.** Phone
users browse, read details, approve, and fill simple forms - those flows must
be genuinely good. Complex multi-line creation/editing (fee structures, bulk
editors, multi-row forms) stays desktop-first: on a phone it must be *usable*
(no overflow, nothing broken or unreachable), but don't spend effort
optimizing it or redesigning it phone-first, and never degrade the desktop
experience to make it fit.

## Comments: short inline, the story in the doc block

An inline comment is a label, not an explanation. Keep it to one short line that
names what the next line or block does. If the point takes more than that to
make, it does not belong inline: move it into the JSDoc block (`/** ... */`)
above the component, hook, function, type or slice it concerns, or into a block
at the top of the file when it describes the file as a whole.

The doc block is where the reasoning lives. Write it there once, properly, and
let the code below stay clean.

### Write for a stranger reading it years from now

Every comment and doc block is permanent documentation. It has to read the same
way to somebody who has never seen this branch, this milestone or this
conversation. Describe the code as it is, in the present tense, and let it
stand on its own.

That rules out:

- milestone, sprint, wave and ticket names - `M16`, `wave 3`, `the RBAC sprint`;
- change narration - "added", "changed", "moved here", "now returns", "used to";
- notes aimed at a reviewer - "note that", "as discussed", "for now",
  "temporary until we", "so you can see it working";
- time references - "recently", "since the redesign", "will be removed later".

Not this:

```tsx
// M16 flag added here so the preview tab shows up for Corona
const canPreview = useFeatureFlag("notification_preview");
```

This:

```tsx
/**
 * Template preview panel.
 *
 * Branding and locale resolve from the active tenant rather than from the
 * signed-in user, so an admin checking a template sees what the recipient
 * will see.
 */
export function TemplatePreview({ template }: TemplatePreviewProps) {
  const canPreview = useFeatureFlag("notification_preview");
```

The second version says more, and it stays true and useful long after the
milestone that prompted it is forgotten.

### What a doc block should carry

Say what the thing is for, and what a caller needs to know that the signature
and prop types do not already tell them: the invariant it keeps, the scope it
applies to, the condition that makes it render or behave differently, the reason
behind a choice that looks odd. Do not restate the props in prose, and do not
turn the doc block into a history of the file.

This applies to every comment written anywhere in the codebase, tests included,
and to every comment already sitting beside code being changed: bring it up to
this standard rather than leaving it as found.

## A new screen is not finished until the search box can reach it

The header search box is the action palette, and it is the fastest route to
anything in the app. It is also the one that goes stale silently: a screen ships,
the sidebar gets its link, and the box never hears of it. That is how it ended up
offering nineteen actions for an app of ninety screens.

So treat it as part of building the screen, not as a follow-up:

- **Mounted a route?** Add an action in `src/lib/action-palette/registry.ts`.
  Label leads with a verb (`View subjects`), because the matcher expands the
  leading verb through its synonym groups - "open subjects" and "list subjects"
  come free, a bare noun matches none of them. Gate it on the **same permission
  key the screen itself checks**, never a looser one.
- **Added a create drawer?** Wire `useActionParam("new", <the gate>, open)` on the
  screen and add a `kind: "do"` action pointing at `<path>?action=new`. The gate
  argument is required, and it must be the same expression that wraps the Add
  button - including any read-only-year check. A query param is typed as easily
  as it is clicked, so a drawer that opens on sight of the address is a way round
  the screen's own rules.
- **Genuinely not a destination?** Say so, in `NOT_A_DESTINATION` in
  `src/lib/action-palette/coverage.test.ts`, with the reason. A redirect or a
  screen a refusal lands on is a fine answer. "Nobody thought about it" is not.

`coverage.test.ts` enforces all three and names the exact path or file when it
fails, so you do not have to remember any of this - but reading it here is
cheaper than discovering it from a red suite.

Two things are exempt and stay that way. Finance and Procurement **view** actions
are derived from those consoles' own sidebars, so they cannot fall behind. And
screens whose address needs an id (`/students/:id`) are nobody's palette
destination, because there is no id to name from a search box.

## Writing punctuation

Do not use em dashes (Unicode U+2014) anywhere in source code, comments,
documentation, tests, or user-facing copy. Use a comma, colon, parentheses, or
an ordinary hyphen (`-`), whichever reads most naturally.

## Vocabulary: it is a **branch**, never a campus

A school site is a **branch**. That is the word the data model uses
(`Branch`, `branch_id`, `branch__isnull=True`), the word the API returns
(`branch`, `branch_name`, `scope_label`), and the word the product uses on
screen.

Never write "campus" - not in UI copy, not in comments, not in variable names,
not in commit messages, not in docs. A design prototype or a mockup that says
"campus" is using the wrong word: translate it to branch as you build. The same
goes for "site" and "location" when a branch is meant.

| Say | Not |
| --- | --- |
| Ikeja Branch | Ikeja Campus |
| All branches | All campuses |
| School-wide | Applies to the whole school (fine), "every campus" (not) |
| This branch runs the class | This campus runs the class |
| Branch admin | Campus admin |

The one exception is quoted third-party text - an error message from an
external system, or a school's own words in a support ticket. Quote those
verbatim and do not silently correct them.
