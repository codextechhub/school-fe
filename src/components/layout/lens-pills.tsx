import { Building2, CalendarRange, Check, ChevronUp, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMatches } from "react-router";

import { cn } from "@/lib/utils";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useSessionLens } from "@/hooks/use-session-lens";

/**
 * Which lenses a route reads. Absent, a route marked `lens: true` reads both and
 * any other route reads neither.
 */
export type LensChoice = "both" | "branch" | "session" | "none";

/**
 * Read `lenses` off the deepest matched route.
 *
 * Same merge order DashboardLayout uses for its own handle, so a nested screen
 * can narrow its parent's lenses without the parent knowing about it.
 */
function useLensHandle(): { lenses?: LensChoice; lens?: boolean } {
  const matches = useMatches();
  return matches.reduce<{ lenses?: LensChoice; lens?: boolean }>(
    (acc, m) => ({ ...acc, ...((m.handle as { lenses?: LensChoice; lens?: boolean } | undefined) ?? {}) }),
    {},
  );
}

/**
 * The two lenses: which branch you are looking at, and which year.
 *
 * They live PINNED TO THE BOTTOM OF THE SIDEBAR, with the nav scrolling above
 * them, which is where the design puts them and it earns the place: a lens is
 * not a page control, it is the state the whole workspace is being read in, so
 * it belongs with the workspace's own furniture rather than with the page's.
 * Being pinned also means it stays put while the nav scrolls, which is the
 * point of a lens you can check at a glance.
 *
 * The menus open UPWARD for the same reason - there is nothing below them.
 *
 * A lens appears only when it is a question the reader can answer, and only on
 * a screen it changes. One option is not a choice, so there is no branch pill
 * for a reader who works in one branch (however many the school runs) and no
 * session pill for a school with one year or none. And a screen that does not
 * read a lens does not get its pill: see `LensChoice`.
 */

const pill =
  "flex h-9.5 w-full items-center gap-2.5 rounded-lg border border-white-02 " +
  "bg-white px-2.5 text-[13px] font-medium text-black-01 " +
  "hover:bg-gray-04 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-primary/30 group-data-[collapsible=icon]:justify-center " +
  "group-data-[collapsible=icon]:px-0";

export function BranchPill({ collapsed }: { collapsed: boolean }) {
  const { canChoose, branch, label, allLabel, choices, setBranch } = useBranchLens();

  if (!canChoose) return null;

  const options: { key: string; value: number | "all"; label: string }[] = [
    { key: "all", value: "all", label: allLabel },
    ...choices.map((b) => ({ key: String(b.id), value: b.id, label: b.name })),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change branch"
          title={label}
          className={pill}
        >
          <Building2 className="size-4 shrink-0 text-gray-06" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              <ChevronUp className="size-3.5 shrink-0 text-gray-06" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      {/* Upward, because the pill is the last thing on the rail: there is no
          room below it and a menu that tried would be clipped by the viewport. */}
      <DropdownMenuContent side="top" align="start" className="w-56">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.key}
            onClick={() => setBranch(o.value)}
            className={cn(branch === o.value && "text-primary")}
          >
            <Check className={cn("size-4", branch !== o.value && "opacity-0")} />
            <span className="truncate">{o.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STATUS_SUFFIX: Record<string, string> = {
  ACTIVE: "active",
  DRAFT: "draft",
  ARCHIVED: "archived",
};

export function SessionPill({ collapsed }: { collapsed: boolean }) {
  const { applies, sessions, current, label, setSession } = useSessionLens();

  if (!applies) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change session"
          title={label}
          className={pill}
        >
          <CalendarRange className="size-4 shrink-0 text-gray-06" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              <ChevronUp className="size-3.5 shrink-0 text-gray-06" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        {sessions.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => setSession(s)}
            className={cn(current?.id === s.id && "text-primary")}
          >
            <Check className={cn("size-4", current?.id !== s.id && "opacity-0")} />
            <span className="truncate">
              {s.name}
              <span className="text-muted-foreground">
                {" · "}
                {STATUS_SUFFIX[s.status] ?? s.status.toLowerCase()}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


/**
 * The lenses, pinned under the nav.
 *
 * Renders nothing at all when neither pill is a real question on this screen,
 * rather than an empty tray.
 */
export function LensRail({ collapsed }: { collapsed: boolean }) {
  const branch = useBranchLens();
  const session = useSessionLens();

  // Which lenses the screen underneath actually reads. A lens belongs to the
  // screens that read it, and a pill over a screen that ignores it is a
  // control that changes nothing while looking as though it narrowed the page:
  // a session pill over the student roster relabels the header and changes not
  // one row (see section 2.0 of docs/students-design-phases.md), and a branch
  // pill over Roles or Support filters nothing at all.
  //
  // So nothing is shown by default. A route marked `lens: true` reads both;
  // `lenses` narrows that to one, or to none.
  const handle = useLensHandle();
  const lenses: LensChoice = handle.lenses ?? (handle.lens ? "both" : "none");
  const wantsBranch = lenses === "both" || lenses === "branch";
  const wantsSession = lenses === "both" || lenses === "session";

  const showBranch = wantsBranch && branch.canChoose;
  const showSession = wantsSession && session.applies;
  if (!showBranch && !showSession) return null;

  return (
    <div className="flex flex-col gap-1.5 border-t border-white-02 px-2 py-2.5">
      {showBranch && <BranchPill collapsed={collapsed} />}
      {showSession && <SessionPill collapsed={collapsed} />}
    </div>
  );
}

/**
 * Read-only, because the year being looked at is archived.
 *
 * Left behind by the lenses on purpose: it is not a control, it is a statement
 * about the page, and it belongs where the page is. The server agrees - every
 * write against an archived year answers SESSION_ARCHIVED_READ_ONLY - so this
 * says the rule before somebody fills in a form that cannot be saved.
 */
export function ReadOnlyNotice() {
  const { current, sessions } = useSessionLens();
  if (current?.status !== "ARCHIVED") return null;
  const activeName = sessions.find((s) => s.status === "ACTIVE")?.name;

  return (
    <div className="border-b border-white-02 bg-white-05 px-3 py-2 lg:px-5">
      <p className="inline-flex min-w-0 items-center gap-1.5 text-xs text-gray-05">
        <Lock className="size-3.5 shrink-0" />
        <span className="min-w-0 text-pretty">
          <span className="font-medium text-black-01">Read-only.</span> You are
          viewing the archived {current?.name} session
          {activeName ? `. Switch to ${activeName} to make changes.` : "."}
        </span>
      </p>
    </div>
  );
}
