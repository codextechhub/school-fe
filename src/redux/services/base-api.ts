import {
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import {
  resetAuth,
  setAuthContext,
  setImpersonation,
  setToken,
  updatePermissions,
  updateTenant,
} from "../features/auth/auth-slice";
import type { ActiveImpersonation, TenantInfo } from "../features/auth/auth-types";
import { getTenantSlug } from "@/utils/tenant-context";
import { toast } from "sonner";
import { askToPostWithoutApproval } from "@/lib/approval-confirm";
import Cookies from "js-cookie";
import { routesPath } from "@/routes/routesPath";
import { refreshTokenSingleFlight } from "@/utils/token-refresh";
import { endSession } from "@/utils/end-session";
import { captureReturnTo } from "@/utils/return-to";
import {
  AUTH_ENDPOINTS,
  TENANT_EXEMPT_ENDPOINTS,
  blockedDuringIdentitySwap,
  sendsImpersonationHeader,
} from "./api-endpoints";
import { isIdentitySwapInProgress, runWithIdentitySwap } from "@/utils/identity-swap";
import { FINANCE_TAG_TYPES } from "@xvs/finance/redux/tag-types";

const getAccessToken = () => {
  const token = Cookies.get("token");
  return token && token !== "undefined" ? token : "";
};

const baseUrl = import.meta.env.VITE_BACKEND_URL;

// The endpoint-name sets (auth / tenant-exempt / impersonation) live in
// ./api-endpoints - see that module for why and how to extend them.

// Read the active proxy session straight off the live store. Typed loosely
// because the base query only ever receives the root state as `unknown`.
const readImpersonation = (getState: () => unknown): ActiveImpersonation | null =>
  (getState() as { auth?: { impersonation?: ActiveImpersonation | null } })?.auth
    ?.impersonation ?? null;

// True when the request already asserts a tenant, so central injection leaves
// it untouched (handles both string and object arg forms).
const hasTenantParam = (args: string | FetchArgs): boolean => {
  if (typeof args === "string") return /[?&]tenant=/.test(args);
  if (typeof args.url === "string" && /[?&]tenant=/.test(args.url)) return true;
  const params = (args as FetchArgs).params as Record<string, unknown> | undefined;
  return !!params && params.tenant != null && params.tenant !== "";
};

// Append ?tenant=<slug> unless the endpoint is exempt or already asserts one.
const injectTenant = (args: string | FetchArgs, endpoint: string): string | FetchArgs => {
  if (TENANT_EXEMPT_ENDPOINTS.has(endpoint) || hasTenantParam(args)) return args;
  const slug = getTenantSlug();
  if (!slug) return args; // pre-login / legacy token - backend 400s, auth flow handles it
  if (typeof args === "string") {
    const sep = args.includes("?") ? "&" : "?";
    return `${args}${sep}tenant=${encodeURIComponent(slug)}`;
  }
  return { ...args, params: { ...(args.params as object), tenant: slug } };
};

export const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { endpoint, getState }) => {
    const accessToken = getAccessToken();
    if (accessToken && !AUTH_ENDPOINTS.has(endpoint)) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    // While a proxy session is active every data call rides with the session
    // header, so the backend resolves the request - and evaluates RBAC - as the
    // target user. The auth routes, logout and the impersonation management
    // endpoints themselves are exempt: they must act as the original actor.
    const impersonation = readImpersonation(getState);
    if (impersonation && sendsImpersonationHeader(endpoint)) {
      headers.set("X-Impersonation-Session", String(impersonation.id));
    }
    headers.set("accept", "application/json");
    return headers;
  },
});

let sessionRecoveryInProgress = false;

const forceLogoutAndRedirect = (api: Parameters<BaseQueryFn>[1]) => {
  if (sessionRecoveryInProgress) return;
  sessionRecoveryInProgress = true;
  api.dispatch(resetAuth());
  endSession();
  // Preserve the page they were on so login can return them there. Must run
  // AFTER endSession (which clears sessionStorage).
  captureReturnTo();
  window.location.href = routesPath.AUTH.LOGIN;
};

// /user/auth/me/ is tenant-exempt, so this raw fetch needs no ?tenant=. It
// refreshes both the permission set and the cached tenant context.
const fetchFreshMe = async (
  accessToken: string,
  impersonation: ActiveImpersonation | null,
): Promise<{ permissions: string[] | null; tenant: TenantInfo | null }> => {
  try {
    const response = await fetch(`${baseUrl}/user/auth/me/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        // Raw fetch, so it bypasses prepareHeaders - the proxy header has to be
        // replayed by hand or a post-refresh /me would hydrate the ACTOR's
        // permissions while the rest of the app still runs as the target.
        ...(impersonation
          ? { "X-Impersonation-Session": String(impersonation.id) }
          : {}),
      },
    });
    if (!response.ok) return { permissions: null, tenant: null };
    const data = await response.json();
    return {
      permissions: data?.data?.permissions ?? null,
      tenant: data?.data?.tenant ?? null,
    };
  } catch {
    return { permissions: null, tenant: null };
  }
};

/**
 * Return to the original identity after the server ended the proxy session
 * behind our back (idle timeout, target logged out, target deactivated).
 *
 * The retained actor snapshot makes this instant and offline-safe - no network
 * call is needed to know who the admin really is. Runs inside the identity-swap
 * gate so the target's still-mounted screens cannot refire under the restored
 * actor, and resets the cache only after the gate lifts.
 */
const restoreActorAfterCollapse = async (
  api: Parameters<BaseQueryFn>[1],
  impersonation: ActiveImpersonation,
) => {
  await runWithIdentitySwap(async () => {
    api.dispatch(setImpersonation(null));
    api.dispatch(setAuthContext(impersonation.actor));
    // Lazily imported: the route table imports pages that import this module,
    // so a static import would be circular.
    const { router } = await import("@/routes");
    await router.navigate(routesPath.PROTECTED.OVERVIEW.INDEX, { replace: true });
  });
  api.dispatch(baseApi.util.resetApiState());
  toast.info("Your proxy session ended. You are back in your own account.");
};

/**
 * Send the caller to the one "opens at go-live" screen.
 *
 * Lazily imported for the same reason `restoreActorAfterCollapse` does it: the
 * route table imports pages that import this module, so a static import would
 * be circular. Guarded on the current path so a screen that fires several
 * closed requests at once navigates once, not once per request.
 */
const redirectToOnboardingNotLive = () => {
  const target = routesPath.PROTECTED.ONBOARDING.NOT_LIVE;
  if (window.location.pathname === target) return;
  if (window.location.pathname.startsWith(routesPath.PROTECTED.ONBOARDING.INDEX)) {
    // Already somewhere in onboarding. A closed call from here is a background
    // request, not the user opening a door - do not yank them off the page.
    return;
  }
  void import("@/routes").then(({ router }) =>
    router.navigate(target, { replace: true }),
  );
};

const extractFirstDetailError = (detail: unknown): string | null => {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return typeof detail[0] === "string" ? detail[0] : null;
  if (typeof detail === "object") {
    for (const key of Object.keys(detail as Record<string, unknown>)) {
      const found = extractFirstDetailError((detail as Record<string, unknown>)[key]);
      if (found) return found;
    }
  }
  return null;
};

const AUTH_URLS = [
  "login",
  "reset-password",
  "password/reset",
  "forgot-password",
  "activate",
];

const isAuthRoute = (args: string | FetchArgs): boolean => {
  const url =
    typeof args === "string"
      ? args
      : typeof args === "object" && "url" in args && typeof args.url === "string"
        ? args.url
        : "";
  return AUTH_URLS.some((u) => url.includes(u));
};

export const baseQueryInterceptor: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Identity-swap gate: a proxy start/exit replaces the effective user while
  // the old identity's screens are still mounted. Drop their in-flight refires
  // here so they never reach the backend under the wrong identity. The error
  // shape matches an abort, which the suppression below already keeps silent.
  if (isIdentitySwapInProgress() && blockedDuringIdentitySwap(api.endpoint)) {
    return {
      error: {
        status: "FETCH_ERROR",
        error: "AbortError: identity swap in progress",
      } as FetchBaseQueryError,
    };
  }

  // Central tenant assertion: every authenticated, non-exempt request carries
  // ?tenant=<the caller's slug> unless it already asserts one.
  const tenantArgs = injectTenant(args, api.endpoint);
  const result = await baseQuery(tenantArgs, api, extraOptions);
  if (!result?.error) return result;

  // Background requests (e.g. polls that resume the instant the tab regains
  // focus) pass `{ silent: true }` so a transient 5xx never interrupts the
  // user with a global error toast - they just retry on the next cycle. The
  // refresh/retry and force-logout machinery still runs.
  const silent = !!(extraOptions as { silent?: boolean } | undefined)?.silent;
  const notify = (message: string) => {
    if (!silent) toast.error(message);
  };

  // FetchBaseQueryError uses a string status for transport-level failures
  // and a number for HTTP responses, so narrow access via `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = result.error;

  // The school holds a workflow template with no stages, so this document would
  // go out unreviewed. Not an error to report - a question to ask. Answered
  // yes, the very same request is sent again carrying the confirmation and the
  // reader's reason, and its result becomes this call's result: the screen that
  // posted knows nothing about any of it and simply succeeds. Answered no, the
  // refusal is returned untouched and its own message explains itself.
  if (res?.status === 409 && res?.data?.error?.code === "APPROVAL_NOT_CONFIGURED") {
    const reason = await askToPostWithoutApproval(
      String(res?.data?.message ?? "Nobody will review this document."),
    );
    if (reason === null) return result;

    const retried = { ...(tenantArgs as FetchArgs) };
    retried.body = {
      ...((retried.body as Record<string, unknown>) ?? {}),
      confirm_without_approval: true,
      reason,
    };
    return baseQuery(retried, api, extraOptions);
  }

  // Cache resets and the identity-swap gate intentionally abort requests during
  // an identity change. They are not connectivity failures and must never
  // produce a burst of misleading "Could not reach the server" toasts.
  if (
    res?.status === "FETCH_ERROR" &&
    /abort|aborted/i.test(String(res?.error ?? ""))
  ) {
    return result;
  }

  if (res?.status === 400 || res?.status === 422) {
    // Auth routes (login, reset, activate…) own their own inline/panel error
    // UX and route the message through humanizeAuthError, so never fire a global
    // toast here - doing so leaks the raw backend detail (and even machine
    // codes like INVITATION_NOT_FOUND) into the UI beside the friendly panel.
    if (!isAuthRoute(args)) {
      const message =
        extractFirstDetailError(res?.data?.error?.detail) ||
        extractFirstDetailError(res?.data?.error) ||
        res?.data?.message;
      if (message) notify(message);
    }
    return result;
  }

  if (res?.status === 401) {
    // A 401 on an auth route (login, reset, activate…) means bad credentials or
    // an expired link - not a recoverable session. Never run the refresh/retry
    // machinery here - doing otherwise would attempt a token refresh and retry
    // the login itself. No toast either: the page owns the error UI (it routes
    // the caught error through humanizeAuthError), so a global toast here would
    // duplicate the inline message.
    if (isAuthRoute(args)) {
      return result;
    }

    const refreshed = await refreshTokenSingleFlight();

    if (refreshed.ok) {
      // The singleton already updated cookies. Mirror access into Redux so any
      // selector reading state.auth.access stays consistent.
      api.dispatch(setToken(refreshed.access));

      // Role may have changed since last login - keep permissions + tenant fresh.
      const activeImpersonation = readImpersonation(api.getState);
      const fresh = await fetchFreshMe(refreshed.access, activeImpersonation);
      if (fresh.permissions) api.dispatch(updatePermissions(fresh.permissions));
      if (fresh.tenant) api.dispatch(updateTenant(fresh.tenant));

      const retry = await baseQuery(tenantArgs, api, extraOptions);
      if (retry?.error?.status === 401) {
        if (activeImpersonation) {
          // The actor's token was just refreshed successfully, so a second 401
          // while proxying is the PROXY session dying, not the login session:
          // the server ends it on idle timeout (30 min), target logout or
          // target deactivation. Logging the admin out here would be wrong -
          // restore their own identity instead of leaving a broken screen.
          await restoreActorAfterCollapse(api, activeImpersonation);
        } else {
          forceLogoutAndRedirect(api);
        }
      }
      return retry;
    }

    if (refreshed.reason === "token_invalid") {
      forceLogoutAndRedirect(api);
      return result;
    }

    // network_error, server_error, no_token - transient. Keep the user signed
    // in; the failing query surfaces its own error. Do not show the misleading
    // "session could not be restored" toast.
    return result;
  }

  if (res?.status === 403) {
    // TENANT_NOT_LIVE is not a permission failure and must not read as one: the
    // school authenticated fine and owns the tenant it asserted, it simply has
    // not gone live, so every surface but onboarding is closed to it. Handled
    // here rather than per page because ANY screen can produce it - a bookmark,
    // a stale link, a redirect - and the alternative is every page in the app
    // learning that it might be closed.
    if (res?.data?.error?.code === "TENANT_NOT_LIVE") {
      redirectToOnboardingNotLive();
      return result;
    }
    if (!isAuthRoute(args)) {
      const msg =
        extractFirstDetailError(res?.data?.error?.detail) ||
        res?.data?.message ||
        "You don't have permission to perform this action.";
      notify(msg);
    }
    return result;
  }

  if (res?.status === 404) {
    if (!isAuthRoute(args)) notify(res?.data?.message || "Resource not found.");
    return result;
  }

  if (res?.status === 405) {
    notify(res?.data?.detail || "Something went wrong. Please try again.");
    return result;
  }

  if (res?.status === 413) {
    notify("Content Too Large");
    return result;
  }

  if (typeof res?.status === "number" && res.status >= 500) {
    // Auth pages surface their own error state (friendly panel / inline copy).
    if (!isAuthRoute(args)) notify("A server error occurred. Please try again later.");
    return result;
  }

  // Transport-level failures (offline, DNS, timeout). Auth pages render their
  // own friendly panel from the query's isError, so stay quiet there.
  if (!isAuthRoute(args)) {
    if (res?.status === "TIMEOUT_ERROR") notify("The request timed out. Please try again.");
    else if (res?.status === "FETCH_ERROR") notify("Could not reach the server. Please try again.");
    else if (res?.status === "PARSING_ERROR") notify("Unexpected response from the server. Please try again.");
  }

  return result;
};

export const baseApi = createApi({
  baseQuery: baseQueryInterceptor,
  endpoints: () => ({}),
  reducerPath: "baseApi",
  tagTypes: [
    // Owned by @xvs/finance: they name that package\'s resources, and RTK
    // refuses a tag the base api has not declared.
    ...FINANCE_TAG_TYPES,
    // Tags owned by the shared engine services (workflow, exports, imports)
    // that this app consumes for @xvs/finance. RTK Query refuses a tag the
    // base api has not declared, so they are listed here rather than beside
    // the endpoints that use them.
    // The school's own fee due rule (FAL), read and written by the Finance
    // Settings fees section.
    "FeeDuePolicy",
    "ExportCapabilities",
    "ExportCatalogue",
    "ExportDefinitions",
    "ExportDownloadLog",
    "ExportRuns",
    "ImportJobs",
    "ImportValidationIssues",
    "ProcRequisitions",
    "WorkflowApproverGroups",
    "WorkflowDelegations",
    "WorkflowInstances",
    "WorkflowPending",
    "WorkflowStageOverrides",
    "WorkflowSubmissions",
    "WorkflowTeamLoad",
    "WorkflowTemplates",
    "ProcPurchaseOrders",
    "ProcVendorInvoices",
    "ProcVendorPayments",
    "Users",
    "Branches",
    "Students",
    // Separate from Students, because a guardian is reachable from more than
    // one child: linking one changes both students' pages and the guardian's
    // own, and folding it into Students would refetch the whole directory
    // every time a contact detail moved.
    "Guardians",
    "Teachers",
    "Administrators",
    "Sessions",
    // The calendar events themselves. The hub's counts, its next-up list and
    // its alerts are a separate tag because almost every write in the module
    // moves them: a lesson, a room and an event all change what the hub says.
    "Calendar",
    "CalendarOverview",
    "Rooms",
    "Periods",
    // The class picker, the grid and the publish state are one tag: they are
    // one screen, and every write to a slot changes all three.
    "ClassTimetables",
    "TeacherTimetables",
    "Exams",
    "Classes",
    // Departments, programmes and levels are one tag: they are one screen group
    // to a school, and adding a level changes a programme's row, so splitting
    // them would mean every write invalidating the other two anyway.
    "AcademicStructure",
    "Subjects",
    "AcademicOverview",
    "Fees",
    "Roles",
    // Requests waiting on a decision, and the decisions already taken. Separate
    // from Roles because approving one rewrites a role: the inbox and the roles
    // table both have to move, and a single tag would refetch neither reliably.
    "RoleChangeRequests",
    // The org chart the shared workflow screens read when a step is pointed at a
    // position rather than a person. Declared here because RTK refuses a tag the
    // base api has not seen, and the screens that use them come from the package.
    "OrgNodes",
    "OrgPositions",
    "OrgPositionTree",
    "OrgAssignments",
    "OrgMatrixReports",
    "StaffProfiles",
    "ProxySessions",
    "Onboarding",
    "GoLiveRequests",
    "SchoolProfile",
    // The staff list AND one person's record. They carry the same facts, and
    // every write that moves one moves the other: a role grant changes a row's
    // Role column, a teaching duty changes its load, a status change changes
    // both of its chips. The four tags below are narrower only where a write
    // would otherwise refetch the whole directory to update one profile tab.
    "SchoolStaff",
    "StaffHistory",
    // Qualifications and documents together: two tabs of typed rows and files
    // that nothing outside the profile reads.
    "StaffRecords",
    "StaffLeave",
    // Assignments and coverage are one tag because they are one dataset seen
    // two ways, and every write to a duty moves both.
    "StaffTeaching",
    "PermissionCatalogue",
    "Notifications",
    "ImportTemplates",
    "ImportBatches",
    "Tickets",
  ],
});
