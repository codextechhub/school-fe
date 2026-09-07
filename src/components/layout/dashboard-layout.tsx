import { Separator } from "@/components/ui/separator";
import { ApprovalConfirmDialog } from "@/components/approval-confirm-dialog";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { WorkspaceToaster } from "@/components/ui/sonner";
import { AppSidebar } from "../app-sidebar";
import { ConsoleSidebar } from "@/components/finance-ui/console-sidebar";
import { schoolFinanceNav, schoolProcurementNav } from "./console-nav-for-school";
import { ChevronLeft, Headset, Loader2, LogOut, Undo2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLogout } from "@/hooks/use-logout";
import useToggleModal from "@/hooks/use-toggle";
import PromptModal from "@/components/modal/prompt-modal";
import { Outlet, useLocation, useMatches, useNavigate } from "react-router";
import {
  DashboardHeaderContext,
  resolveHeaderTitle,
  resolveHeaderBack,
  type BackSpec,
  type HeaderOverride,
} from "./dashboard-header";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { useTokenRefresh } from "@/hooks/use-token-refresh";
import { SessionTimeoutModal } from "@/components/session-timeout-modal";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  selectActorPermissions,
  selectImpersonation,
  selectTenantIsPending,
  selectUser,
} from "@/redux/features/auth/auth-slice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NotLiveNotice } from "@/pages/protected/onboarding/components/not-live-notice";
import { OnboardingStatusStrip } from "@/pages/protected/onboarding/components/onboarding-status-strip";
import { AppSearch } from "./app-search";
import { ReadOnlyNotice, type LensChoice } from "./lens-pills";
import { NotificationsBell } from "@/components/custom/notifications-bell";
import { SupportSheet } from "@/components/layout/support-sheet";
import { SUPPORT_OPEN_EVENT } from "@/components/layout/support-open";
import type { EscalationPrefill } from "@/components/custom/support-ticket-form";
import { ProxySessionBanner } from "@/components/proxy-session-banner";
import { ProxyUserDialog } from "@/components/proxy-user-dialog";
import { P, resolvePermissionKey } from "@/permissions";
import { exitProxySession } from "@/utils/proxy-session";

// Per-screen header config, declared on the route rather than passed as props.
// The layout is now an eager LAYOUT ROUTE (see routes/protected/index.tsx), so
// it renders once above the lazy page chunks and can't receive props from the
// page it wraps - the route's `handle` is react-router's channel for exactly
// this kind of static, route-owned metadata.
/** Which sidebar a route wants. Omitted means the school's own. */
export type SidebarKind = "finance" | "procurement";

export type DashboardHandle = {
  /** Header title. Falls back to a generic greeting when omitted. */
  title?: string;
  /**
   * Swap the shell's sidebar for an area's own sub-navigation.
   *
   * The finance and procurement screens come from @xvs/finance and each wraps
   * itself in that package's ConsoleShell, which renders a full sidebar. Without
   * this the school's sidebar and the area's would both mount, nested. The route
   * owns the CHOICE; the area still builds its own nav config.
   */
  sidebar?: SidebarKind;
  /** Show the back affordance, walking the history. */
  hasBack?: boolean;
  /**
   * Show the back affordance and say where it goes: `true` walks the history,
   * a path string navigates there.
   *
   * Preferred over `hasBack` on any screen reachable from outside its own area.
   * A batch opened from the notification bell has no import list behind it, so
   * history-back returns the reader to whatever they were reading before rather
   * than to the list the screen belongs to.
   */
  back?: BackSpec;
  /**
   * Render the shell a school that has not gone live actually gets: the reduced
   * sidebar, the pending status strip, and NO branch switcher.
   *
   * The switcher goes for a reason of its own, not because branches are missing.
   * Onboarding belongs to the school as a whole rather than to one site, so
   * there is nothing to switch and nothing to scope - the same recede rule the
   * contract applies to branch, applied for a different reason.
   */
  onboarding?: boolean;
  /**
   * This screen reads a lens, so show the read-only notice when the year is
   * archived.
   *
   * Note this does NOT control the pills. They live in the sidebar's LensRail
   * and are governed by `lenses` below - which is the flag that finally makes
   * the rule in the next comment true.
   */
  lens?: boolean;
  /**
   * WHICH lenses this screen reads. Defaults to both.
   *
   * A lens belongs to the screens that actually read it. A session pill over
   * the student roster would be a control that changes nothing, and a branch
   * pill on a screen that does not filter by branch is worse: it looks like it
   * narrowed the page.
   *
   * Set `"branch"` on a screen with no session dimension, `"session"` on one
   * with no branch dimension. Omit it and both pills render, which is what
   * every screen written before this flag existed expects.
   */
  lenses?: LensChoice;
  /**
   * This screen is open to a school that has NOT gone live.
   *
   * The frontend mirror of the backend's `pending_tenant_surface`. Without it
   * every non-onboarding route is closed to a pending school, which is right
   * for most of the app and wrong for academic structure: building it is a
   * REQUIRED onboarding task, so a school locked out of it can never go live.
   *
   * Absence means closed, deliberately - a route added later is not admitted by
   * default, which is the same fail-closed rule the backend applies.
   */
  pendingSurface?: boolean;
};

export default function DashboardLayout() {
  const navigate = useNavigate();

  // Deepest matched route wins, so a nested screen can override its parent's
  // header without the parent knowing about it.
  const matches = useMatches();
  const {
    title: handleTitle,
    hasBack = false,
    back: handleBack,
    onboarding: onboardingRoute = false,
    lens: showLens = false,
    pendingSurface = false,
    sidebar,
  } = matches.reduce<DashboardHandle>(
    (acc, m) => ({ ...acc, ...((m.handle as DashboardHandle | undefined) ?? {}) }),
    {},
  );

  // The runtime title channel. The finance and procurement areas are dozens of
  // screens under one route parent, so `handle.title` can only ever say
  // "Finance" for all of them; @xvs/finance names the actual screen through
  // useDashboardTitle and it arrives here. The override carries the location it
  // was set under, so it dies the moment the caller navigates away rather than
  // bleeding into the next screen.
  const location = useLocation();
  const [override, setOverride] = useState<HeaderOverride | null>(null);
  const setTitle = useCallback(
    (next?: string) =>
      setOverride((current) => {
        // Cleanup fires after the next screen has already set its own title.
        // Without this guard the unmount of the screen being left would clear
        // the incoming one, and the header would blank on every navigation.
        if (next === undefined && current && current.key !== location.key) return current;
        return { key: location.key, title: next };
      }),
    [location.key],
  );
  const setBack = useCallback(
    (next?: () => void) =>
      setOverride((current) => {
        // Same guard as setTitle: the screen being left unmounts after the
        // incoming one has registered, so a blind clear would wipe the new
        // screen's own destination.
        if (next === undefined && current && current.key !== location.key) return current;
        return { ...current, key: location.key, back: next };
      }),
    [location.key],
  );
  const headerApi = useMemo(() => ({ setTitle, setBack }), [setTitle, setBack]);
  const title = resolveHeaderTitle(handleTitle, override, location.key);
  // `hasBack` is the older spelling and means history-back, which is what
  // `back: true` means, so the two fold into one resolved destination.
  const back = resolveHeaderBack(
    handleBack ?? (hasBack ? true : undefined),
    override,
    location.key,
  );

  const dispatch = useAppDispatch();

  // A school that has not gone live may reach onboarding and nothing else. The
  // server enforces this and answers 403 TENANT_NOT_LIVE - but only to a screen
  // that asks it something, and most of this app's pages do not yet make a
  // request at all, so they would render as though they worked. The tenant
  // status arrives with the session, so the question is answered here before
  // the page paints and without a round trip.
  const tenantIsPending = useAppSelector(selectTenantIsPending);

  // The shell follows the school, not the route. A pending school gets the
  // reduced sidebar everywhere - including on a page it is not allowed to open,
  // where a full sidebar would offer it eleven more doors that are also shut.
  // A LIVE school gets the whole app back even on the control room, which after
  // go-live is a read-only record rather than home base.
  const onboarding = tenantIsPending;
  const pageIsClosed = tenantIsPending && !onboardingRoute && !pendingSurface;

  useTokenRefresh();
  const { handleLogout, isLoggingOut } = useLogout();
  const { isOpen: openLogout, toggleClick: toggleLogout } = useToggleModal(false);

  const { open, secondsLeft, isExpired, onContinue, onLogout, goToLogin } =
    useSessionTimeout();

  const user = useAppSelector(selectUser);
  const fullName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const roleLabel = humanizeRole(user?.role);
  const avatarFallback = initials(fullName);

  // The bell badge. A failed count shows no badge, which is what zero shows
  // anyway, so this never needs an error state of its own.
  // Proxy ("view as another user"). The capability is checked against the
  // ORIGINAL actor's grants: while a session is active `permissions` holds the
  // TARGET's keys, so gating on those would hide the exit from the very admin
  // who needs it.
  const impersonation = useAppSelector(selectImpersonation);
  const actorPermissions = useAppSelector(selectActorPermissions);
  const canProxy = actorPermissions.includes(
    resolvePermissionKey(P.START_PROXY_SESSION)
  );
  const [proxyDialogOpen, setProxyDialogOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportPrefill, setSupportPrefill] = useState<EscalationPrefill>({});

  // Any screen can ask for the panel. See support-open.ts for why this is an
  // event rather than a prop threaded through half the app.
  useEffect(() => {
    const open = (event: Event) => {
      setSupportPrefill(
        (event as CustomEvent<EscalationPrefill>).detail ?? {},
      );
      setSupportOpen(true);
    };
    window.addEventListener(SUPPORT_OPEN_EVENT, open);
    return () => window.removeEventListener(SUPPORT_OPEN_EVENT, open);
  }, []);
  const [isExitingProxy, setIsExitingProxy] = useState(false);

  const exitProxy = async () => {
    if (!impersonation || isExitingProxy) return;
    setIsExitingProxy(true);
    await exitProxySession({ dispatch, navigate }, impersonation);
    setIsExitingProxy(false);
  };

  return (
    <DashboardHeaderContext.Provider value={headerApi}>
      <SessionTimeoutModal
        open={open}
        secondsLeft={secondsLeft}
        isExpired={isExpired}
        onContinue={onContinue}
        onLogout={onLogout}
        goToLogin={goToLogin}
      />
      <SidebarProvider>
        <DashboardToaster />
        {sidebar === "finance"
          ? <ConsoleSidebar title="Finance" nav={schoolFinanceNav} />
          : sidebar === "procurement"
            ? <ConsoleSidebar title="Procurement" nav={schoolProcurementNav} />
            : <AppSidebar onboarding={onboarding} />}
        <SidebarInset className="bg-white-05 min-w-0 w-auto">
          {/* Banner + header pin together: two independently sticky bars at
              top-0 would overlap as soon as the page scrolls. */}
          <div className="sticky top-0 z-10 shrink-0">
          <ProxySessionBanner />
          {/* `relative`: the search box is centred on the header itself rather
              than laid out between its neighbours, and on a phone it expands
              over the header. Both are absolute children of this element. */}
          <header className="relative flex h-15 shrink-0 items-center gap-3 px-3 lg:gap-4 lg:px-5 bg-white border border-l-0 border-white-02">
            {/* Left: the toggle, the back affordance and the page title. It
                takes the slack so the controls stay pinned right, and stops
                short of the centred search box on wide screens rather than
                sliding under it. */}
            <div className="inline-flex min-w-0 flex-1 items-center gap-2.5 lg:max-w-[calc(50%-15rem)]">
              <SidebarTrigger className="size-7 rounded-full border border-white-02 text-gray-06 hover:text-primary" />
              {back !== undefined && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof back === "function") back();
                      else if (typeof back === "string") navigate(back);
                      else navigate(-1);
                    }}
                    className="uppercase font-light text-gray-01 text-sm inline-flex items-center cursor-pointer"
                  >
                    <ChevronLeft className="text-inherit size-5 mr-1" />
                    Back
                  </button>
                  <Separator
                    orientation="vertical"
                    className="rotate-10 w-[1.2px] bg-black-01 data-[orientation=vertical]:h-7"
                  />
                </>
              )}

              {/* No fallback string. Every route declares its title, and a
                  greeting standing in for a missing one reads as deliberate -
                  so the route that forgot ships looking finished. An empty
                  header is the one thing nobody mistakes for a name. */}
              <h6 className="min-w-0 truncate text-base uppercase font-semibold text-black-01">
                {title}
              </h6>
            </div>

            {/* ml-auto, not a flex-1 spacer: the search box between these two
                clusters is out of flow now, so nothing else absorbs the slack
                and the controls would otherwise sit against the title. */}
            <div className="ml-auto inline-flex shrink-0 items-center gap-2.5">

              {/* The action palette. It launches actions and jumps to screens;
                  there is no search endpoint to find records with. The field
                  itself is centred on the header (absolute, so it is not a
                  member of this row); what sits here in the flow is the phone
                  icon that expands it. The two account actions it can run
                  (proxy, logout) belong to this header, so it is handed the
                  same openers the account menu uses rather than mounting a
                  second dialog of its own. See AppSearch. */}
              <AppSearch
                onProxy={() => setProxyDialogOpen(true)}
                onLogout={toggleLogout}
                onHelp={() => {
                  setSupportPrefill({});
                  setSupportOpen(true);
                }}
              />

              <NotificationsBell />

              {/* Support sits beside the bell in the design. It opens the
                  ticket form IN PLACE rather than navigating, the way
                  console-fe's does: somebody raises a ticket because a screen
                  is misbehaving, and navigating away takes that screen off
                  their display. No longer limited to onboarding routes - a
                  school that has just gone live is exactly when something
                  breaks. */}
              <button
                type="button"
                aria-label="Get help"
                title="Raise an issue with CodeX"
                onClick={() => {
                  setSupportPrefill({});
                  setSupportOpen(true);
                }}
                className="size-8.5 rounded-full bg-gray-04 grid place-content-center text-gray-01 hover:bg-pry-01 hover:text-primary"
              >
                <Headset className="size-4.5 stroke-[2.15]" />
              </button>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-7"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open account menu"
                    className="grid size-9 shrink-0 place-content-center rounded-full bg-pry-01 font-mont text-[13px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    {avatarFallback}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate font-medium text-black-01">
                      {fullName}
                    </span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user?.email || roleLabel}
                    </span>
                  </DropdownMenuLabel>
                  {canProxy && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setProxyDialogOpen(true)}>
                        <UsersRound className="size-4" />
                        {impersonation ? "Proxy as someone else" : "Proxy user"}
                      </DropdownMenuItem>
                      {impersonation && (
                        <DropdownMenuItem
                          disabled={isExitingProxy}
                          onClick={exitProxy}
                        >
                          {isExitingProxy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Undo2 className="size-4" />
                          )}
                          Exit proxy
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={toggleLogout}>
                    <LogOut className="size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          </div>

          {/* Deliberately below the sticky block, not inside it: the strip plus
              the expiry warning can run to three lines on a phone, and pinning
              all of that would eat the fold on every onboarding screen. */}
          {/* Only while the school is still being set up. The strip reports
              checklist progress, and telling a school that went live in March
              that "onboarding is closed" is the app narrating a phase nobody is
              in - on the notification centre, which carries the onboarding flag
              purely to stay open before go-live, it was pure noise. The
              onboarding screen itself still says so, in its own words, to the
              school reading its own record. */}
          {onboardingRoute && tenantIsPending && <OnboardingStatusStrip />}

          {/* The lenses themselves live at the foot of the sidebar - see
              lens-pills. What stays here is the statement that follows from
              one of them: an archived year is read-only, and that is a fact
              about the PAGE rather than a control. */}
          {showLens && !pageIsClosed && <ReadOnlyNotice />}

          {canProxy && (
            <ProxyUserDialog
              open={proxyDialogOpen}
              onOpenChange={setProxyDialogOpen}
            />
          )}

          <SupportSheet
            open={supportOpen}
            onOpenChange={setSupportOpen}
            prefill={supportPrefill}
          />

          <PromptModal
            isOpen={openLogout}
            onClose={toggleLogout}
            onConfirm={handleLogout}
            title="Log Out?"
            description="Are you sure you want to log out of your account?"
            containerClass="min-h-[320px] lg:w-[390px]"
            srcClass="size-25"
            src="/image/caution.png"
            onConfirmText="Log Out"
            canCancel
            loading={isLoggingOut}
            onConfirmClass="bg-error-01 text-white shadow-xs hover:bg-error-01/90 focus-visible:ring-error-01/20"
          />
          {/* grid-cols-1 (minmax(0,1fr)) zeroes the track's min-content floor so a
              page's <main> can never be stretched past the viewport by wide
              nowrap content (tables) - each page's own overflow-x-auto then
              clips it. Ported from console-fe; do not remove (CLAUDE.md
              §Responsive). */}
          <div className="grid grid-cols-1 min-w-0 flex-1 pt-0">
            {pageIsClosed ? <NotLiveNotice /> : <Outlet />}
          </div>
        </SidebarInset>
        <ApprovalConfirmDialog />
      </SidebarProvider>
    </DashboardHeaderContext.Provider>
  );
}

// The toasts have to know how wide the sidebar currently is to centre
// themselves over the page content, and `useSidebar` only works inside the
// provider - hence a child component rather than a hook call in DashboardLayout.
function DashboardToaster() {
  const { state } = useSidebar();

  return <WorkspaceToaster sidebarState={state} />;
}

// Turn a backend role token ("SCHOOL_ADMIN", "branch_admin") into a display
// label ("School Admin"). Empty string when nothing is set.
function humanizeRole(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Derive up to two uppercase initials from a full name for the avatar fallback.
function initials(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}
