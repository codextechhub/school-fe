import {
  selectImpersonation,
  selectTenant,
  selectUser,
  setAuthContext,
  setImpersonation,
  setSessionId,
} from "@/redux/features/auth/auth-slice";
import { useGetMeQuery } from "@/redux/services/auth/auth-api";
import { routesPath } from "@/routes/routesPath";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router";
import { evaluateGate } from "@/utils/session-gate";
import { endSession } from "@/utils/end-session";
import { captureReturnTo } from "@/utils/return-to";
import { DEFAULT_FAVICON, setFavicon } from "@/utils/favicon";
import { useSchoolLogo } from "@/hooks/use-school-logo";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { getAuthContextGateState } from "@/utils/auth-context-gate";
import {
  isSessionRestoreBlocked,
  refreshTokenSingleFlight,
  type RefreshOutcome,
} from "@/utils/token-refresh";
import { getAccessToken } from "@/utils/access-token";

const { LOGIN } = routesPath.AUTH;

/**
 * Auto-recovery for a transient /me failure (network glitch, server blip).
 * Rather than stranding the user behind a manual button, we silently re-run the
 * context query on an escalating backoff. Full page reloads are deliberately
 * avoided - re-running the one failed query recovers just as well and stays
 * invisible when it succeeds, instead of flashing a white screen and tearing
 * down the store/cache. After MAX_AUTO_RETRIES failures the failure no longer
 * looks transient, so we fall back to the manual retry card (the honest exit
 * for a real outage rather than silent infinite retrying).
 */
const MAX_AUTO_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 3000;
const RETRY_MAX_DELAY_MS = 24000;

export default function Authenticated() {
  const [{ idleTooLong }] = useState(evaluateGate);
  const dispatch = useDispatch();
  const [restoreState, setRestoreState] = useState<"ready" | "restoring" | "retry" | "invalid">(
    () => idleTooLong || isSessionRestoreBlocked()
      ? "invalid"
      : getAccessToken()
        ? "ready"
        : "restoring",
  );
  const shouldRedirect = restoreState === "invalid";
  const user = useSelector(selectUser);
  const tenant = useSelector(selectTenant);
  const impersonation = useSelector(selectImpersonation);
  const [retryAttempts, setRetryAttempts] = useState(0);
  // Auth-gated /media/ logo → renderable blob: URL (see use-school-logo).
  const logoBlobUrl = useSchoolLogo();

  const finishRestore = useCallback((outcome: RefreshOutcome) => {
    if (outcome.ok) {
      if (outcome.sessionId) dispatch(setSessionId(outcome.sessionId));
      setRestoreState("ready");
      return;
    }
    if (outcome.reason === "network_error" || outcome.reason === "server_error") {
      setRestoreState("retry");
      return;
    }
    endSession("Your session has ended. Please sign in again.");
    setRestoreState("invalid");
  }, [dispatch]);

  const restoreSession = useCallback(() => {
    setRestoreState("restoring");
    void refreshTokenSingleFlight().then(finishRestore);
  }, [finishRestore]);

  useEffect(() => {
    if (restoreState !== "restoring" || getAccessToken()) return;
    void refreshTokenSingleFlight().then(finishRestore);
  }, [finishRestore, restoreState]);

  useEffect(() => {
    if (!shouldRedirect) return;
    // Only show the expiry banner + clean up when there was an actual session
    // to end. A missing cookie just means "go log in" - no banner needed.
    if (idleTooLong) {
      endSession(
        "Your session expired due to inactivity. Please log in to continue."
      );
    }
    // Remember the page they were trying to reach so login can return them
    // there. Must run AFTER endSession (which clears sessionStorage).
    captureReturnTo();
    // Hard-redirect (full reload) rather than an in-SPA navigate so all the
    // stale in-memory state from the dead session - Redux store, RTK Query
    // cache, module-level refresh/logout flags - is torn down. This keeps every
    // logout path consistent and prevents a stale token leaking into the next
    // login attempt.
    window.location.replace(LOGIN);
  }, [shouldRedirect, idleTooLong]);

  // Sync permissions on mount - catches role changes that happened while the
  // token was still valid. onQueryStarted in getMe dispatches updatePermissions.
  //
  // refetchOnFocus re-runs it the moment the user tabs back, closing the window
  // where a background tab keeps acting on permissions/tenant that were revoked
  // or changed server-side while it sat idle. This is the app's one live query
  // and it is a single cheap request, so no polling is needed alongside it. The
  // gate short-circuits to "ready" while a tenant is present, so a background
  // refetch never flips the mounted app back to a spinner, and the slice's
  // update reducers no-op when the context comes back unchanged (the common
  // case) - so the usual focus costs nothing beyond the request itself.
  const {
    data: authContextResponse,
    isLoading: isLoadingContext,
    isFetching: isFetchingContext,
    isError: isContextError,
    refetch: refetchContext,
  } = useGetMeQuery(undefined, {
    skip: restoreState !== "ready",
    refetchOnFocus: true,
  });

  const restorableImpersonation = authContextResponse?.data.active_impersonation;
  useEffect(() => {
    if (!restorableImpersonation || impersonation) return;
    const actor = {
      user: authContextResponse.data.user,
      school: authContextResponse.data.school ?? null,
      tenant: authContextResponse.data.tenant ?? null,
      permissions: authContextResponse.data.permissions,
    };
    dispatch(setImpersonation({
      id: restorableImpersonation.id,
      tenantSlug: restorableImpersonation.tenant_slug,
      target: restorableImpersonation.target,
      actor,
    }));
    dispatch(setAuthContext({
      user: null,
      school: null,
      tenant: {
        slug: restorableImpersonation.target.tenant_slug,
        name: restorableImpersonation.target.tenant_name,
        kind: restorableImpersonation.target.tenant_kind,
      },
      permissions: [],
    }));
    void refetchContext();
  }, [authContextResponse, dispatch, impersonation, refetchContext, restorableImpersonation]);

  useEffect(() => {
    document.title = user?.first_name ? `${user.first_name} - XVS` : "XVS";
  }, [user?.first_name]);

  // Post-login favicon: the signed-in user's school logo, falling back to the
  // bundled XVS mark when the school has no branding upload.
  useEffect(() => {
    setFavicon(logoBlobUrl ?? DEFAULT_FAVICON);
  }, [logoBlobUrl]);

  const isRestoringImpersonation = !!restorableImpersonation && (
    !impersonation || authContextResponse.data.user?.id === impersonation.actor.user?.id
  );
  const contextGateState = restoreState === "ready" && !isRestoringImpersonation
    ? getAuthContextGateState({
        shouldRedirect,
        hasTenant: !!tenant,
        tenantKind: tenant?.kind,
        isLoading: isLoadingContext,
        isFetching: isFetchingContext,
        isError: isContextError,
      })
    : "loading";

  // A successful hydration clears the counter so a later glitch starts fresh.
  // Done as a guarded render-phase adjustment rather than in an effect: React's
  // sanctioned pattern for deriving state from a changed value, and the one this
  // repo's eslint config (react-hooks v7 `set-state-in-effect`) requires.
  if (contextGateState === "ready" && retryAttempts !== 0) setRetryAttempts(0);

  // "logout": /me succeeded but carried no tenant - the context is gone, so the
  // session is effectively logged out. Run the standard logout sequence rather
  // than stranding the user. (A transient /me error is "retry", handled below.)
  useEffect(() => {
    if (contextGateState !== "logout") return;
    endSession("Your session has ended. Please sign in again.");
    captureReturnTo();
    window.location.replace(LOGIN);
  }, [contextGateState]);

  useEffect(() => {
    if (contextGateState !== "forbidden") return;
    endSession("Please sign in through your school's portal.");
    window.location.replace(LOGIN);
  }, [contextGateState]);

  // Auto-retry a transient /me failure on an escalating backoff (3s, 6s, 12s,
  // 24s) until the context arrives or we exhaust MAX_AUTO_RETRIES. Each failed
  // settle re-enters "retry", bumping the attempt count and lengthening the next
  // wait; once exhausted this effect no-ops and the manual card is shown.
  useEffect(() => {
    if (contextGateState !== "retry") return;
    if (retryAttempts >= MAX_AUTO_RETRIES) return;

    const delay = Math.min(
      RETRY_BASE_DELAY_MS * 2 ** retryAttempts,
      RETRY_MAX_DELAY_MS
    );
    const timer = setTimeout(() => {
      setRetryAttempts((n) => n + 1);
      refetchContext();
    }, delay);
    return () => clearTimeout(timer);
  }, [contextGateState, retryAttempts, refetchContext]);

  // Reconnecting is a strong recovery signal: when the browser regains
  // connectivity while we're waiting, retry immediately and reset the backoff so
  // the user gets a fresh set of attempts instead of waiting out the current tick.
  useEffect(() => {
    if (contextGateState !== "retry") return;
    const onOnline = () => {
      setRetryAttempts(0);
      refetchContext();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [contextGateState, refetchContext]);

  if (shouldRedirect || contextGateState === "forbidden") return null;

  if (restoreState === "restoring" || restoreState === "retry") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        {restoreState === "restoring" ? (
          <div className="flex items-center gap-2 text-sm text-gray-01" role="status">
            <LoaderCircle className="size-4 shrink-0 animate-spin" />
            Restoring your session…
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-md border border-gray-100 bg-white p-6 text-center shadow-sm">
            <TriangleAlert className="mx-auto mb-3 size-8 text-error-text" />
            <p className="font-mont text-sm font-semibold text-black-01">
              We couldn’t restore your session
            </p>
            <p className="mt-1 text-xs text-gray-01">
              Check your connection and try again.
            </p>
            <Button type="button" variant="outline" className="mt-4 gap-2" onClick={restoreSession}>
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </div>
        )}
      </main>
    );
  }

  // A restored browser session starts with no local tenant context. Do not
  // mount protected screens until /me has hydrated it: otherwise their first
  // requests omit the mandatory `?tenant=` assertion, fail with 400, and stay
  // failed even after the tenant arrives because their query args did not
  // change. This boundary protects every tenant-scoped screen and bulk flow.
  if (contextGateState !== "ready") {
    // A "retry" while auto-recovery is still in flight (attempts remaining), or a
    // refetch triggered by it, is a reconnection - not the initial load and not a
    // dead end. Show a quiet "Reconnecting…" spinner; the alarming card is
    // reserved for when every auto-retry has failed.
    const autoRetrying =
      retryAttempts < MAX_AUTO_RETRIES &&
      (contextGateState === "retry" ||
        (contextGateState === "loading" && retryAttempts > 0));

    if (contextGateState === "loading" || autoRetrying) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div
            className="flex items-center gap-2 text-center text-sm text-gray-01"
            role="status"
          >
            <LoaderCircle className="size-4 shrink-0 animate-spin" />
            {autoRetrying ? "Reconnecting…" : "Preparing your workspace…"}
          </div>
        </main>
      );
    }

    // "retry" with auto-recovery exhausted - the failure no longer looks
    // transient. Offer a manual retry (which restarts the backoff) rather than
    // logging out or retrying forever.
    if (contextGateState === "retry") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-sm rounded-md border border-gray-100 bg-white p-6 text-center shadow-sm">
            <TriangleAlert className="mx-auto mb-3 size-8 text-error-text" />
            <p className="font-mont text-sm font-semibold text-black-01">
              We couldn’t prepare your workspace
            </p>
            <p className="mt-1 text-xs text-gray-01">
              We kept trying but couldn’t reconnect. Retry, or reload the page.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => {
                setRetryAttempts(0);
                refetchContext();
              }}
              disabled={isFetchingContext}
            >
              <RefreshCw
                className={isFetchingContext ? "size-4 animate-spin" : "size-4"}
              />
              Retry
            </Button>
          </div>
        </main>
      );
    }

    // "logout" → the logout sequence above is redirecting to login; render nothing.
    return null;
  }

  return <Outlet />;
}
