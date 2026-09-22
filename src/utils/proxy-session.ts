import { toast } from "sonner";

import {
  setAuthContext,
  setImpersonation,
} from "@/redux/features/auth/auth-slice";
import type {
  ActiveImpersonation,
  AuthContextSnapshot,
} from "@/redux/features/auth/auth-types";
import { authApi } from "@/redux/services/auth/auth-api";
import { baseApi } from "@/redux/services/base-api";
import { impersonationApi } from "@/redux/services/impersonation/impersonation-api";
import type { ProxyTarget } from "@/redux/services/impersonation/impersonation-types";
import type { AppDispatch } from "@/redux/store";
import { routesPath } from "@/routes/routesPath";
import { runWithIdentitySwap } from "@/utils/identity-swap";

/**
 * Proxy session orchestration.
 *
 * Entering and leaving a proxy is the same three-part manoeuvre in both
 * directions - swap the stored identity, re-hydrate it from `/me`, then reset
 * the RTK Query cache - and getting the ORDER wrong is what produces
 * half-switched clients. It lives here, once, rather than in each component
 * that offers the affordance (start dialog, exit banner, account menu), so
 * there is a single place where the sequence can be reviewed and fixed.
 *
 * The invariant every path upholds: the client is never left believing it is
 * one user while the backend believes it is another.
 */

type Navigate = (path: string) => void | Promise<unknown>;

interface SwapDeps {
  dispatch: AppDispatch;
  navigate: Navigate;
}

/**
 * Apply an identity and let the whole app settle onto it.
 *
 * Order is deliberate:
 *  1. inside the identity-swap gate, write the new identity and navigate to a
 *     route both identities can see (the outgoing user's screens may be
 *     unreachable for the incoming one);
 *  2. still gated, refetch `/me` - the ONLY authority on the effective user -
 *     and apply it verbatim;
 *  3. after the gate lifts, reset the cache so every mounted screen refetches
 *     exactly once, cleanly, under the settled identity.
 *
 * Resetting before the gate lifts would let the refetch storm race the swap;
 * navigating after hydration would flash the outgoing user's screen with the
 * incoming user's data.
 */
const applyIdentity = async (
  { dispatch, navigate }: SwapDeps,
  {
    impersonation,
    optimisticContext,
  }: {
    impersonation: ActiveImpersonation | null;
    optimisticContext: AuthContextSnapshot;
  },
): Promise<void> => {
  await runWithIdentitySwap(async () => {
    dispatch(setImpersonation(impersonation));
    dispatch(setAuthContext(optimisticContext));
    await navigate(routesPath.PROTECTED.OVERVIEW.INDEX);

    const me = await dispatch(
      authApi.endpoints.getMe.initiate(undefined, {
        forceRefetch: true,
        subscribe: false,
      }),
    ).unwrap();
    // Applied explicitly rather than relying on getMe's own onQueryStarted:
    // that side effect settles asynchronously relative to unwrap(), so awaiting
    // it here is what makes "the swap finished" mean "the identity is live".
    dispatch(setAuthContext({
      user: me.data.user ?? null,
      school: me.data.school ?? null,
      tenant: me.data.tenant ?? null,
      permissions: me.data.permissions ?? [],
      field_access: me.data.field_access ?? {},
    }));
  });
  dispatch(baseApi.util.resetApiState());
};

/**
 * Start proxying `target`.
 *
 * Returns true when the client is fully switched. On any failure AFTER the
 * server created the session, the session is ended again and the original
 * identity restored - a half-switched client (server proxying, client not, or
 * vice versa) is never an acceptable resting state.
 */
export const startProxySession = async (
  deps: SwapDeps,
  {
    target,
    actor,
  }: { target: ProxyTarget; actor: AuthContextSnapshot },
): Promise<boolean> => {
  const { dispatch } = deps;
  let startedSessionId: number | null = null;
  try {
    const result = await dispatch(
      impersonationApi.endpoints.startProxySession.initiate({
        target_user: target.id,
      }),
    ).unwrap();
    startedSessionId = result.data.id;

    await applyIdentity(deps, {
      impersonation: {
        id: result.data.id,
        tenantSlug: target.tenant_slug,
        target,
        actor,
      },
      // Optimistic placeholder: the target's name/permissions are unknown until
      // `/me` answers, and showing the ACTOR's context under an active proxy
      // banner would be a lie. The tenant is carried over because school
      // proxying is intra-tenant - dropping it would trip the auth-context gate
      // and blank the app mid-swap.
      optimisticContext: {
        user: null,
        school: actor.school,
        tenant: actor.tenant,
        permissions: [],
        field_access: {},
      },
    });
    toast.success(`You are now viewing as ${target.full_name}.`);
    return true;
  } catch {
    if (startedSessionId !== null) {
      try {
        await dispatch(
          impersonationApi.endpoints.endProxySession.initiate({
            session_id: startedSessionId,
          }),
        ).unwrap();
      } catch {
        // Restoring locally is still the safer end state; the server row is
        // closed by the next start (which is an atomic switch) or by logout.
      }
      await applyIdentity(deps, {
        impersonation: null,
        optimisticContext: actor,
      });
      toast.error(
        "That account could not be loaded. You are back in your own account.",
      );
    } else {
      // The start itself failed - the interceptor already toasted the reason
      // (403 / 404 / network) and nothing was switched.
    }
    return false;
  }
};

/**
 * Stop proxying and return to the signed-in admin.
 *
 * The retained actor snapshot is restored even when the server call fails
 * (already expired, offline): refusing to exit would strand the admin inside
 * someone else's account, which is strictly worse than a stale server row -
 * and that row is closed by the idle sweep, the next start, or logout.
 */
export const exitProxySession = async (
  deps: SwapDeps,
  impersonation: ActiveImpersonation,
): Promise<void> => {
  const { dispatch } = deps;
  let endedOnServer = false;
  try {
    await dispatch(
      impersonationApi.endpoints.endProxySession.initiate({
        session_id: impersonation.id,
      }),
    ).unwrap();
    endedOnServer = true;
  } catch {
    // Fall through to the local restore below.
  }
  await applyIdentity(deps, {
    impersonation: null,
    optimisticContext: impersonation.actor,
  });
  if (endedOnServer) toast.success("Proxy session ended.");
};
