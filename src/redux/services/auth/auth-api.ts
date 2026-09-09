import { resetAuth, setAuthContext, setAuthUser } from "@/redux/features/auth/auth-slice";
import type {
  ProxyTargetIdentity,
  SchoolInfo,
  TenantInfo,
  User,
} from "@/redux/features/auth/auth-types";
import { baseApi } from "../base-api";
import { routesPath } from "@/routes/routesPath";
import { recordActivity } from "@/utils/session-activity";
import { resetSessionInvalidation } from "@/utils/token-refresh";
import { endSession } from "@/utils/end-session";
import type { LoginResponse } from "./auth-types";
import { currentSchoolSlug } from "@/utils/school-host";
import { setAccessToken } from "@/utils/access-token";
import { getCsrfToken } from "@/utils/csrf";

const baseUrl = import.meta.env.VITE_BACKEND_URL;

/**
 * `/user/auth/me/` - the effective identity of the current session.
 *
 * "Effective" matters: while a proxy session is active the backend resolves
 * this endpoint as the proxied target, so the payload describes the target,
 * not the signed-in admin.
 */
export interface MeResponse {
  message: string;
  data: {
    user: User | null;
    school: SchoolInfo | null;
    tenant: TenantInfo | null;
    permissions: string[];
    active_impersonation?: {
      id: number;
      tenant_slug: string;
      target: ProxyTargetIdentity;
    };
  };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      // The tenant is added here, not at the call site: one email address can
      // now be an account at several schools with no connection between them,
      // so "find the user by email" is only unambiguous once the sign-in names
      // the school it is addressed to. It comes from the address this page is
      // served at, which is the only thing that can answer it before anyone has
      // authenticated. A BODY key, not the `?tenant=` query assertion the
      // authenticated endpoints take - there is no token yet to check one
      // against.
      query: (user) => ({
        url: `/user/auth/login/`,
        method: "POST",
        body: { ...user, tenant: currentSchoolSlug() },
        credentials: "include" as const,
      }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          const {data} = result;

          // Identity check: this portal is for school accounts only. A Codex
          // staff login succeeds at the backend (it's the shared endpoint),
          // but we refuse to open a session here. Write no local state and
          // fire-and-forget a logout to revoke the cookie the backend issued.
          // The login page inspects the same
          // field and renders the console-redirect error.
          //
          // Read off the TENANT, not off the user. This used to test
          // `user.user_type === "CX_STAFF"`, and that column was removed from
          // the API: the test could no longer be true, so the guard was
          // silently letting Codex staff open a school session. Which side of
          // the platform boundary an account sits on is a fact about its
          // tenant, and the tenant cannot be wrong about itself.
          if (data?.data?.tenant?.kind === "PLATFORM") {
            const csrfToken = await getCsrfToken();
            fetch(`${baseUrl}/user/auth/logout/`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
              },
              body: "{}",
            }).catch(() => {
              // Best-effort revocation leaves the cookie to age out on failure.
            });
            return;
          }

          // A fresh, valid session - re-enable token refresh in case a prior
          // session in this JS context invalidated it.
          resetSessionInvalidation();
          setAccessToken(data?.data?.access || "");
          recordActivity();
          dispatch(setAuthUser(data?.data));
        } catch {
          // Login failed - the mutation hook surfaces the error to the page;
          // nothing to clean up because nothing was written yet.
        }
      },
    }),
    logout: builder.mutation<void, void>({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const csrfToken = await getCsrfToken();
        const result = await baseQuery({
          url: `/user/auth/logout/`,
          method: "POST",
          body: {},
          credentials: "include" as const,
          headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
        });
        if (result.error) return { error: result.error };
        return { data: undefined };
      },
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
        } catch {
          // Server-side revocation failed - proceed with client-side cleanup anyway.
        } finally {
          endSession();
          dispatch(resetAuth());
          window.location.href = routesPath.AUTH.LOGIN;
        }
      },
    }),
    forgotPassword: builder.mutation<{ message: string }, { email: string }>({
      // Scoped to this school for the same reason as login, and with a sharper
      // consequence: a reset asked for here must never rewrite the password of
      // an account that shares the address at a different school.
      query: (payload) => ({
        url: `/user/auth/password/reset/request/`,
        method: "POST",
        body: { ...payload, tenant: currentSchoolSlug() },
      }),
    }),
    passwordResetPreview: builder.query<{ message: string; data: { email: string; full_name: string } }, string>({
      query: (activation_key) => ({
        url: `/user/auth/reset-password/${activation_key}/preview/`,
        method: "GET",
      }),
    }),
    passwordResetConfirm: builder.mutation<{ message: string }, { activation_key: string; password: string; confirm_password: string }>({
      query: ({ activation_key, ...body }) => ({
        url: `/user/auth/password/reset/${activation_key}/confirm/`,
        method: "POST",
        body,
      }),
    }),
    activationPreview: builder.query<{ message: string; data: { email: string; full_name: string } }, string>({
      query: (activation_key) => ({
        url: `/user/auth/activate/${activation_key}/preview/`,
        method: "GET",
      }),
    }),
    activateAccount: builder.mutation<{ message: string }, { activation_key: string; password: string; confirm_password: string }>({
      query: ({ activation_key, ...body }) => ({
        url: `/user/auth/activate/${activation_key}/`,
        method: "POST",
        body,
      }),
    }),
    getMe: builder.query<MeResponse, void>({
      query: () => ({ url: `/user/auth/me/`, method: "GET" }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          // `/me` is the authority on WHO the session currently acts as - not
          // just what it may do. While a proxy session is active it returns the
          // TARGET's identity, so applying the whole context (user + school
          // included, not permissions/tenant alone) is what keeps the shell from
          // rendering the admin's name beside the target's data. Every field
          // is no-op guarded in the slice, so an unchanged context still costs
          // nothing on the ordinary mount/refresh/focus runs.
          dispatch(setAuthContext({
            user: data.data.user ?? null,
            school: data.data.school ?? null,
            tenant: data.data.tenant ?? null,
            permissions: data.data.permissions ?? [],
          }));
        } catch {
          // /me failed (e.g. transient 5xx) - keep the persisted permissions;
          // the 401 interceptor handles a genuinely dead session.
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  usePasswordResetPreviewQuery,
  usePasswordResetConfirmMutation,
  useActivationPreviewQuery,
  useActivateAccountMutation,
  useGetMeQuery,
} = authApi;
