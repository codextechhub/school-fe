import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { P, resolvePermissionKey } from "@/permissions";
import {
  useSearchGuardiansQuery,
  useSearchStudentsQuery,
} from "@/redux/services/students/students-api";
import { useSearchStaffQuery } from "@/redux/services/staff/staff-api";
import { useAppSelector } from "@/redux/store";
import {
  selectActorPermissions,
  selectPermissions,
  selectTenantIsPending,
  selectUser,
} from "@/redux/features/auth/auth-slice";
import {
  ACTIONS,
  loadFrecencyScores,
  loadPopularity,
  recordPick,
  type ActionDef,
  type ScoredAction,
} from "@/lib/action-palette";
import {
  ACTION_PALETTE_OPEN_EVENT,
  availableActions,
  buildPaletteView,
  COLLAPSED_COUNT,
  rankActions,
  rankDefaultActions,
} from "./action-palette-model";

/** The one wording for this box: placeholder, aria-label and mobile trigger. */
const SEARCH_LABEL = "Search your workspace";

/** The width at which the header has room for the full field (Tailwind `lg`). */
const DESKTOP_QUERY = "(min-width: 1024px)";

type SearchVariant = "desktop" | "mobile";

/**
 * The header palette: type an action, press Enter, the app does it.
 *
 * It is a real input sitting in the header with an attached dropdown, not a
 * modal - the same shape console-fe uses. That matters beyond looks: a person
 * can see what the box offers without committing to a full-screen takeover,
 * and Escape puts them back on the page they were already reading.
 *
 * **It launches actions, and it finds students.** Students are searched
 * through `/v1/students/search/`: type two characters and matching students
 * appear above the actions, gated on the same key the directory checks. The
 * box must never promise to find a child by name without an endpoint behind
 * it, which would be a lie in the most prominent place on the page.
 *
 * Students come FIRST when they match. Somebody typing "Chiamaka" wants the
 * child, not an action whose description happens to contain those letters, and
 * a name is a far more specific thing to have typed than a verb.
 *
 * What it can offer comes from three filters, each with its own owner:
 * permissions (the registry's gate, same key the screen checks), tenant
 * readiness (a pending school is offered only what a pending school can open),
 * and the typed query (the engine in src/lib/action-palette). Ranking learns
 * from what this user picks, but only ever within a match tier - see
 * rankActions.
 */
export function AppSearch({
  onProxy,
  onLogout,
  onHelp,
  className,
}: {
  /** Open the header's "view as another user" dialog. */
  onProxy: () => void;
  /** Open the header's logout confirmation. */
  onLogout: () => void;
  /** Opens the header's support panel. */
  onHelp: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  // A broad query ("v") can match most of the registry, so the list starts
  // collapsed and the rest waits behind a keyboard-reachable "show all" row.
  const [expanded, setExpanded] = useState(false);
  const [activeRow, setActiveRow] = useState(0);
  // Below lg the header has no room for a 430px field beside a title and four
  // controls, so the box lives behind an icon and expands over the header.
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const shortcutLabel = useMemo(
    () => (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘ E" : "Ctrl E"),
    [],
  );

  // The shortcut and the window event do the same thing: put the cursor in
  // whichever field this width actually shows, selecting any text already
  // there so the user can continue it or type straight over it.
  const focusSearch = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      desktopInputRef.current?.focus();
      desktopInputRef.current?.select();
      return;
    }
    setMobileOpen(true);
    requestAnimationFrame(() => {
      mobileInputRef.current?.focus();
      mobileInputRef.current?.select();
    });
  }, []);
  useSearchFocusTriggers(focusSearch);

  const tenantIsPending = useAppSelector(selectTenantIsPending);
  const permissions = useAppSelector(selectPermissions);
  const actorPermissions = useAppSelector(selectActorPermissions);
  const user = useAppSelector(selectUser);
  const userId = user?.id == null ? undefined : String(user.id);

  const available = useMemo(
    () => availableActions(ACTIONS, { permissions, actorPermissions }, tenantIsPending),
    [permissions, actorPermissions, tenantIsPending],
  );

  // Popularity is re-read while the dropdown is open rather than held in
  // state: it lives in localStorage, it is two small JSON blobs, and a second
  // tab that learned something should be reflected the next time this list is
  // opened.
  const trimmed = query.trim();
  const ranked = useMemo(
    () => (resultsOpen ? rankActions(available, trimmed, loadPopularity(userId)) : []),
    [available, trimmed, userId, resultsOpen],
  );
  const defaults = useMemo(
    () => (resultsOpen ? rankDefaultActions(available, loadFrecencyScores(userId)) : []),
    [available, userId, resultsOpen],
  );

  const results = trimmed ? ranked : defaults;
  const view = useMemo(() => buildPaletteView(results, expanded), [results, expanded]);

  // Students, when the caller may read them and has typed enough to mean it.
  // One character is a keystroke rather than a search, which is also the rule
  // the endpoint itself applies.
  //
  // `tenantIsPending` belongs in this skip for the same reason it decides which
  // actions are offered: the student module is closed until go-live, and asking
  // it anyway does not merely fail. The endpoint answers 403 TENANT_NOT_LIVE,
  // which base-api treats as "this school opened a door that is shut" and
  // redirects the whole app to /onboarding/not-live. That redirect stands down
  // while the reader is already under /onboarding - and a pending school is not
  // always there. Standing on Academic Structure, which it IS allowed to use
  // and must finish before it can go live, typing "adeyemi" into the header
  // threw it off the page at the second character.
  const canSeeStudents = permissions.includes(
    resolvePermissionKey(P.BROWSE_STUDENTS),
  );
  const canSeeStaff = permissions.includes(resolvePermissionKey(P.BROWSE_TEACHERS));
  const longEnough = trimmed.length >= 2;
  const askable = resultsOpen && !tenantIsPending && longEnough;

  const { data: studentHits } = useSearchStudentsQuery(trimmed, {
    skip: !askable || !canSeeStudents,
  });
  const { data: staffHits } = useSearchStaffQuery(trimmed, {
    skip: !askable || !canSeeStaff,
  });
  // Guardians hang off students: a school that may not open a child's record has
  // no business finding the household behind it, and there is no guardian key of
  // its own to ask for.
  const { data: guardianHits } = useSearchGuardiansQuery(trimmed, {
    skip: !askable || !canSeeStudents,
  });

  /**
   * The people found, in the order their sections appear.
   *
   * One list rather than three counts. Every offset below - the arrow-key
   * indices, the action rows' displacement, the "show all" position - is
   * derived from it, so adding a fourth kind of record cannot leave one of them
   * behind. It was a single `studentCount` threaded through five places, which
   * is a shape that holds for exactly as long as there is one kind of record.
   */
  const recordGroups = useMemo(() => {
    const cap = <T,>(rows: T[] | undefined) =>
      longEnough ? (rows ?? []).slice(0, 5) : [];
    return [
      {
        key: "students" as const,
        heading: "Students",
        rows: cap(studentHits?.data).map((row) => ({
          id: row.id,
          name: row.full_name,
          detail: [row.student_number || "No admission number", row.class_name]
            .filter(Boolean).join(" · "),
          to: routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.id),
        })),
      },
      {
        key: "staff" as const,
        heading: "Staff",
        rows: cap(staffHits?.data).map((row) => ({
          id: row.id,
          name: row.name,
          detail: row.meta,
          to: routesPath.PROTECTED.STAFF.PROFILE_ID(row.id),
        })),
      },
      {
        key: "guardians" as const,
        heading: "Guardians",
        rows: cap(guardianHits?.data).map((row) => ({
          id: row.id,
          name: row.full_name,
          // Which children, because two guardians share a surname far more often
          // than two children do. Empty when the caller covers none of them.
          detail: row.ward_names.join(", ") || "No wards at your branches",
          to: routesPath.PROTECTED.STUDENTS.GUARDIAN_DETAILS_ID(row.id),
        })),
      },
    ].filter((group) => group.rows.length > 0);
  }, [studentHits, staffHits, guardianHits, longEnough]);

  /** Flattened in render order, which is the order the arrow keys walk. */
  const recordRows = useMemo(
    () => recordGroups.flatMap((group) => group.rows),
    [recordGroups],
  );
  const recordCount = recordRows.length;
  /** Every navigable row: people first, then the actions. */
  const totalRows = recordCount + view.rows.length;

  // Where each action sits in the flat row order, so a rendered row can label
  // itself with the index the arrow keys use.
  const rowIndexByActionId = useMemo(() => {
    const index = new Map<string, number>();
    view.rows.forEach((row, position) => {
      // Offset by the people rows above, so a rendered action labels itself
      // with the index the arrow keys actually use.
      if (row.kind === "action") index.set(row.result.action.id, position + recordCount);
    });
    return index;
  }, [view.rows, recordCount]);
  const showAllIndex = view.truncated ? recordCount + view.rows.length - 1 : -1;

  // Before a character is typed the list is this user's own most-reached
  // actions. With no history yet every score is zero and registry order stands
  // in, so the heading should not claim to know anything about them.
  const heading = trimmed
    ? "Best matches"
    : results.some((result) => result.popularity > 0)
      ? "Most used"
      : "Start here";

  const closeSearch = () => {
    setQuery("");
    setResultsOpen(false);
    setExpanded(false);
    setActiveRow(0);
    setMobileOpen(false);
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    setExpanded(false); // a new query collapses back to the top matches
    setActiveRow(0);
    setResultsOpen(true);
  };

  const expandResults = () => {
    setExpanded(true);
    setActiveRow(0);
  };

  /**
   * Open somebody's record - a child, a colleague, a guardian.
   *
   * Deliberately NOT recorded as a pick: the frecency store learns which
   * ACTIONS this person reaches for, and feeding it one row per person would
   * teach it nothing and grow without bound.
   */
  const openRecord = (to: string) => {
    closeSearch();
    setMobileOpen(false);
    navigate(to);
  };

  const run = (action: ActionDef) => {
    // Remember the pick FIRST, while `query` still holds what was typed: that
    // pairing ("s" means View students to this person) is the whole adaptive
    // signal, and clearing the box loses it.
    recordPick(userId, action.id, query);
    closeSearch();
    if ("command" in action.run) {
      // Two things only the header can do. It owns the proxy dialog and the
      // logout confirmation (both mounted in DashboardLayout), so the palette
      // asks it rather than mounting a second copy of either.
      if (action.run.command === "proxy") onProxy();
      else if (action.run.command === "help") onHelp();
      else onLogout();
      return;
    }
    navigate(action.run.to);
  };

  // Arrow keys move the highlight (wrapping over the "show all" row too), Enter
  // activates it. preventDefault stops the browser scrolling the page instead.
  // With the dropdown closed (after Escape), arrows reopen it and Enter is inert.
  const handleResultNavigation = (
    event: React.KeyboardEvent<HTMLInputElement>,
    variant: SearchVariant,
  ) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!resultsOpen) {
        setResultsOpen(true);
        return;
      }
      const count = totalRows;
      if (!count) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveRow((index) => (index + step + count) % count);
      return;
    }
    if (event.key === "Enter" && resultsOpen) {
      // Acting on a result is the whole point of this Enter, so cancel the
      // key's default action. Without this, launching anything that mounts a
      // focusable control in the same keystroke (the logout confirm, the proxy
      // dialog) hands the browser a new focus target before it runs Enter's
      // default, which then arrives as a click on whatever Radix just focused:
      // the confirmation opened and its Cancel button was pressed by the same
      // keypress, so it appeared to flash and vanish.
      event.preventDefault();
      if (activeRow < recordCount) {
        openRecord(recordRows[activeRow].to);
        return;
      }
      const target = view.rows[activeRow - recordCount] ?? view.rows[0];
      if (!target) return;
      if (target.kind === "show-all") expandResults();
      else run(target.result.action);
      return;
    }
    if (event.key === "Escape") {
      setResultsOpen(false);
      // On a phone the field itself is the overlay, so Escape has to give the
      // header back rather than leaving an empty bar over the page title.
      if (variant === "mobile") setMobileOpen(false);
    }
  };

  const comboboxProps = (variant: SearchVariant) => ({
    role: "combobox" as const,
    "aria-expanded": resultsOpen,
    "aria-controls": `app-search-listbox-${variant}`,
    "aria-activedescendant":
      resultsOpen && activeRow < totalRows
        ? `app-search-option-${variant}-${activeRow}`
        : undefined,
    onFocus: () => setResultsOpen(true),
    // Click-away keeps the typed query (the "resume later" path) but drops the
    // highlight: the row it pointed at may not exist by the time the list is
    // reopened, and a stale index would highlight a different action.
    onBlur: () => {
      setResultsOpen(false);
      setActiveRow(0);
    },
    "aria-label": SEARCH_LABEL,
    "aria-keyshortcuts": "Control+E Meta+E",
    placeholder: SEARCH_LABEL,
    value: query,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateQuery(event.target.value),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) =>
      handleResultNavigation(event, variant),
  });

  // One result row. The ref keeps the highlighted row in view as the arrows
  // walk past the bottom of the scrollable box. onMouseDown is cancelled so
  // the input's blur does not close the dropdown before the click lands.
  const renderRow = (result: ScoredAction, index: number, variant: SearchVariant) => {
    const { action } = result;
    return (
      <button
        key={action.id}
        id={`app-search-option-${variant}-${index}`}
        ref={index === activeRow ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
        type="button"
        role="option"
        aria-selected={index === activeRow}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActiveRow(index)}
        onClick={() => run(action)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left",
          index === activeRow && "bg-gray-50",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-black-01">{action.label}</span>
          <span className="block truncate text-[11px] text-gray-400">{action.group}</span>
        </span>
        {action.kind === "do" ? (
          <span className="ml-2 shrink-0 rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Action
          </span>
        ) : (
          <ChevronRight className="ml-2 size-4 shrink-0 text-gray-300" />
        )}
      </button>
    );
  };

  const renderSectionHeader = (id: string, label: string) => (
    <p id={id} className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
      {label}
    </p>
  );

  const renderResults = (variant: SearchVariant) => (
    <div
      id={`app-search-listbox-${variant}`}
      role="listbox"
      aria-label={`${SEARCH_LABEL} results`}
      className={cn(
        "absolute left-0 z-50 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl",
        variant === "desktop" ? "top-11" : "top-12",
      )}
    >
      <div className="max-h-[min(60vh,26rem)] overflow-y-auto">
        {recordGroups.map((group) => (
          <section
            key={group.key}
            aria-labelledby={`app-search-${variant}-${group.key}`}
          >
            {renderSectionHeader(
              `app-search-${variant}-${group.key}`, group.heading,
            )}
            {group.rows.map((person) => {
              // Its position in the FLAT list, which is what the arrow keys
              // walk. Looked up rather than taken from the inner map's index,
              // which restarts at zero for every section.
              const index = recordRows.indexOf(person);
              return (
                <button
                  key={`${group.key}-${person.id}`}
                  id={`app-search-option-${variant}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeRow === index}
                  // Mouse-down would blur the input and close the list before
                  // the click landed, so the row could never be clicked at all.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveRow(index)}
                  onClick={() => openRecord(person.to)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left",
                    activeRow === index && "bg-gray-50",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-black-01">
                      {person.name}
                    </span>
                    <span className="block truncate text-xs text-gray-400">
                      {person.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}

        {view.rows.length === 0 && recordCount === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-400">
            {canSeeStudents && trimmed.length === 1
              ? "Keep typing to search students."
              : "Nothing matches - no action, screen or student by that name."}
          </p>
        ) : view.groups ? (
          view.groups.map((group) => (
            <section key={group.section} aria-labelledby={`app-search-${variant}-${group.section}`}>
              {renderSectionHeader(`app-search-${variant}-${group.section}`, group.section)}
              {group.items.map((result) =>
                renderRow(result, rowIndexByActionId.get(result.action.id) ?? -1, variant),
              )}
            </section>
          ))
        ) : (
          <section aria-labelledby={`app-search-${variant}-heading`}>
            {renderSectionHeader(`app-search-${variant}-heading`, heading)}
            {view.rows.map((row, index) =>
              // Offset past the student rows, or two rows would claim the
              // same index and the arrow keys would highlight both.
              row.kind === "action"
                ? renderRow(row.result, index + recordCount, variant)
                : null,
            )}
          </section>
        )}

        {view.truncated && (
          <button
            id={`app-search-option-${variant}-${showAllIndex}`}
            type="button"
            role="option"
            aria-selected={activeRow === showAllIndex}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveRow(showAllIndex)}
            onClick={expandResults}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-primary",
              activeRow === showAllIndex && "bg-gray-50",
            )}
          >
            <span>
              Showing top {COLLAPSED_COUNT} of {view.total}
            </span>
            <span className="inline-flex items-center gap-0.5">
              Show all <ChevronRight className="size-3.5" />
            </span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Absolutely centred in the header, so the box sits mid-screen however
          long the page title is. Out of flow, so it is exempt from the
          header's flex gaps and cannot push the account controls off. */}
      <div
        className={cn(
          "absolute left-1/2 top-1/2 hidden w-[min(38vw,430px)] -translate-x-1/2 -translate-y-1/2 lg:block",
          className,
        )}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={desktopInputRef}
          {...comboboxProps("desktop")}
          className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-9 pr-17 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary/35 focus:bg-white focus:ring-3 focus:ring-primary/8"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-wide text-gray-400 shadow-sm">
          {shortcutLabel}
        </kbd>
        {resultsOpen && renderResults("desktop")}
      </div>

      {/* The phone affordance: an icon beside the other header controls. */}
      <button
        type="button"
        aria-label={SEARCH_LABEL}
        aria-expanded={mobileOpen}
        onClick={() => (mobileOpen ? closeSearch() : focusSearch())}
        className="grid size-8.5 shrink-0 place-content-center rounded-full bg-gray-04 text-gray-01 hover:bg-pry-01 hover:text-primary lg:hidden"
      >
        <Search className="size-4.5 stroke-[2.15]" />
      </button>

      {/* Expanded, the field covers the header rather than adding a row to it:
          a taller header would shove every screen down the moment somebody
          searches, and the title it hides is a line the searcher just left. */}
      {mobileOpen && (
        <div className="absolute inset-x-0 top-0 z-40 flex h-15 items-center gap-2 bg-white px-3 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={mobileInputRef}
              autoFocus
              {...comboboxProps("mobile")}
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary/35 focus:bg-white focus:ring-3 focus:ring-primary/8"
            />
            {resultsOpen && renderResults("mobile")}
          </div>
          <button
            type="button"
            aria-label="Close search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={closeSearch}
            className="grid size-8.5 shrink-0 place-content-center rounded-full bg-gray-04 text-gray-01 hover:bg-pry-01 hover:text-primary"
          >
            <X className="size-4.5" />
          </button>
        </div>
      )}
    </>
  );
}

/**
 * The two ways the box takes focus without being clicked: ⌘E / Ctrl+E (the
 * shortcut printed inside it), and a window event any screen can fire so a
 * "more actions" affordance elsewhere never has to reach into the header.
 *
 * Neither opens anything. The input is already on the page, so the shortcut's
 * job is only to put the cursor in it.
 */
function useSearchFocusTriggers(onFocusRequested: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // `code` rather than `key`, so the shortcut survives a layout where the
      // E key types something else; `key` keeps it working where the browser
      // reports no code.
      const isE = event.code === "KeyE" || event.key.toLowerCase() === "e";
      if (!isE) return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      onFocusRequested();
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(ACTION_PALETTE_OPEN_EVENT, onFocusRequested);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(ACTION_PALETTE_OPEN_EVENT, onFocusRequested);
    };
  }, [onFocusRequested]);
}
