# AGENTS.md - school-fe

## Field Access is part of every feature contract

Every new or changed user-visible business field must receive an explicit
Field Access decision in the same change. This includes fields in forms,
drawers, detail panels, tables, cards, exports, imports, documents, emails and
derived summaries. A screen permission answers whether somebody may open the
resource; it does not answer which fields inside that resource they may read or
change.

Default to including the field. Give a stored or submitted field separate Read
and Write control. Give a computed, generated, status, audit or other
server-owned field Read control and mark it non-writable. Do not create switches
for transport-only values such as internal IDs, pagination data or protocol
metadata, but make sure a display label, nested object or derived value cannot
leak a hidden field under another response name.

When the correct boundary is genuinely unclear, ask the user directly before
building it. Show one concrete case and ask whether the fields should have
separate switches or one deliberately grouped switch. For example: "Bright
Star School records an inter-branch transfer from Ikeja Branch to Lekki Branch.
Should Amount, Purpose and the two bank accounts each have their own switches,
or should the bank accounts share one Banking details switch?" Do not silently
exclude a field because it seems harmless.

Field Access work is end-to-end:

- Register and enforce the backend field in the same product change. A hidden
  control in this app is not access control.
- Make each school-only screen use the shared Field Access hook: remove hidden
  fields completely, grey read-only fields, omit them from submitted bodies and
  remove paired table headers and empty sections.
- Shared finance, procurement and workflow screens belong in FinPro. Change the
  package, release it, and move both school-fe and console-fe to the same tag.
- Add regression coverage for hidden, read-only and writable states, including
  aliases, nested values, exports and imports as applicable.
- Update the school Field Access guide and coverage record when choices, labels,
  grouping or affected screens change.

Before finishing any product change, report `Field Access impact:` followed by
the fields added, changed or reviewed. If there is no impact, say
`Field Access impact: none` and give the reason. Documentation-only and Git-only
requests do not require this statement.

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
- **What was fixed** - resolved defects, written in the past tense. Include only
  when knowing the original cause is useful and it has not already been explained.
- **What still needs attention** - only defects, risks, or incomplete work that
  remain after the task. Omit this section entirely when nothing remains.
- **Where to go next** - the order of the next steps, and which of them are
  unblocked right now.

That list is closed. Do not invent a heading for something that does not fit one
of them: put it under the heading it belongs to, and if it belongs under none of
them, leave it out of the breakdown entirely. A section the user did not ask for
is one they must decode before they can tell whether it needs them.

How to write it:

- Plain words beat precise jargon. "Purchases can approve themselves" lands;
  "`skip_if_no_approvers` permits terminal auto-approval" does not.
- Size things honestly in both directions - say when something feared turns out to
  be a one-line fix, and say when something small turns out to be load-bearing.
- Put the worst finding where it cannot be missed, even if that breaks the order.
- Never place resolved problems under a heading that suggests they remain broken.
  When all reported defects were fixed, say so plainly and omit any unresolved-
  findings section.
- Keep file/line references out of the breakdown; they belong in `todo.md` and in
  the detail above it.
- Don't re-explain what I already know from the conversation.

## Asking, suggesting and disputing: use a real example

When you need a decision from the user, **ask the question directly**. Do not bury
it in a paragraph, do not quietly answer it yourself and move on, and do not hand
over a list of considerations in place of the question.

Then **show the consequence with a real example** - named people, a named school,
a specific sequence of events. The example is what makes a choice obvious, so it
is not decoration and it is not optional.

This applies equally to three things:

- **questions** - what needs deciding;
- **suggestions** - something you think should be done;
- **disputes** - something you think is wrong, including a decision already taken.

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
sound routine. A concrete case is the only way it can be weighed.

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

House conventions (proven app-wide in console-fe; apply them here):
- The DashboardLayout children wrapper needs `grid grid-cols-1 min-w-0` so
  nowrap tables can never stretch a page past the viewport. **Known gap:**
  this repo's `dashboard-layout.tsx` does NOT have that wrapper yet - port it
  from console-fe (`src/components/layout/dashboard-layout.tsx`) on the first
  responsive pass, along with CustomTable's phone-card mode (rows render as
  stacked label/value cards below `md`; dense tables opt out with
  `mobile="scroll"`).
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
(one-time: `cd .claude && npm init -y && npm i playwright`; pass EMAIL/PASSWORD
for this app's seeded login). It drives each route logged-in at 390px (phone)
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
