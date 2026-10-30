import { resetAuth, setAuthContext, setAuthUser } from "@/redux/features/auth/auth-slice";
import type {
  BranchReach,
  FieldAccessPayload,
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
import type {
  LinkPreview,
  LoginResponse,
  MyTwoStep,
  OtherApp,
  PasswordPolicy,
  TwoStepSetUpResponse,
} from "./auth-types";
import { currentSchoolSlug } from "@/utils/school-host";
import { setAccessToken } from "@/utils/access-token";
import { getCsrfToken } from "@/utils/csrf";
import { isIdentitySwapInProgress } from "@/utils/identity-swap";
import { accessChangePending, accessDiffers, markAccessChanged } from "@/lib/access-reload";
import type { RootStateType } from "@/redux/store";

/** Whether `/me` has answered once since this page loaded. */
let meAnsweredThisPage = false;

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
    /** Which fields this user may not read or change; absent means none. */
    field_access?: FieldAccessPayload;
    /** The branches this user may work in. */
    branch_reach?: BranchReach;
    active_impersonation?: {
      id: number;
      tenant_slug: string;
      target: ProxyTargetIdentity;
    };
    /** The apps this account can open beside this one; empty while proxying. */
    other_apps?: OtherApp[];
  };
}

/**
 * Make a finished sign-in this app's session, or decline to.
 *
 * Shared by the password step and the two-step code step, which answer alike.
 * A CodeX account is refused here and its cookie revoked; a pupil's or
 * parent's sign-in belongs in their own app and is not kept; anyone else's
 * becomes the session.
 */
export async function adoptSignIn(
  data: LoginResponse,
  dispatch: (action: unknown) => unknown,
): Promise<void> {
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
  if (data.data?.tenant?.kind === "PLATFORM") {
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

  // A pupil's sign-in is handed to the student app, and a parent's
  // opens the parent app, by the login page; this app writes no
  // session for either.
  if (data.data?.device_app || data.data?.home_app) return;

  // A fresh, valid session - re-enable token refresh in case a prior
  // session in this JS context invalidated it.
  resetSessionInvalidation();
  setAccessToken(data.data?.access || "");
  recordActivity();
  dispatch(setAuthUser(data.data));
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // `identifier` is an email address or the school's staff ID; the server
    // tells them apart and only ever matches a staff ID inside this school.
    login: builder.mutation<LoginResponse, { identifier: string; password: string }>({
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
          const { data } = await queryFulfilled;
          await adoptSignIn(data, dispatch);
        } catch {
          // Login failed - the mutation hook surfaces the error to the page;
          // nothing to clean up because nothing was written yet. A refusal
          // asking for a two-step code is one of these: it carries no session.
        }
      },
    }),
    /**
     * The second step of a sign-in: a code from the authenticator app, or one
     * backup code, for the challenge the password step was refused with.
     * Answers as `login` does and is adopted the same way.
     */
    twoStepVerify: builder.mutation<
      LoginResponse,
      { challenge: string; code?: string; recovery_code?: string }
    >({
      query: (body) => ({
        url: `/user/auth/two-step/verify/`,
        method: "POST",
        body,
        credentials: "include" as const,
      }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          await adoptSignIn(data, dispatch);
        } catch {
          // A wrong code; the page shows it.
        }
      },
    }),
    /** A new secret to scan, for a sign-in refused with TWO_STEP_SET_UP_REQUIRED. */
    twoStepSetUp: builder.mutation<TwoStepSetUpResponse, { challenge: string }>({
      query: (body) => ({
        url: `/user/auth/two-step/set-up/`,
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),
    /**
     * The first code from the new authenticator. Answers as `login` does, plus
     * the backup codes. Not adopted here: the page shows the backup codes
     * first and adopts the sign-in (`adoptSignIn`) when the person has saved
     * them, because a signed-in app leaves the sign-in page at once.
     */
    twoStepConfirm: builder.mutation<
      LoginResponse & { data: { recovery_codes: string[] } },
      { challenge: string; code: string }
    >({
      query: (body) => ({
        url: `/user/auth/two-step/set-up/confirm/`,
        method: "POST",
        body,
        credentials: "include" as const,
      }),
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
    // `identifier` is an email address or staff ID, as at sign-in. The link
    // always goes to the email on the account, never to what was typed.
    forgotPassword: builder.mutation<{ message: string }, { identifier: string }>({
      // Scoped to this school for the same reason as login, and with a sharper
      // consequence: a reset asked for here must never rewrite the password of
      // an account that shares the address at a different school.
      query: (payload) => ({
        url: `/user/auth/password/reset/request/`,
        method: "POST",
        body: { ...payload, tenant: currentSchoolSlug() },
      }),
    }),
    passwordResetPreview: builder.query<{ message: string; data: LinkPreview }, string>({
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
    activationPreview: builder.query<{ message: string; data: LinkPreview }, string>({
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
    // Public on the server, so it carries no token (AUTH_ENDPOINTS).
    getPasswordPolicy: builder.query<{ message: string; data: PasswordPolicy }, void>({
      query: () => ({ url: `/user/auth/password/policy/`, method: "GET" }),
      extraOptions: { silent: true },
    }),
    // The signed-in person's own password. Silent because every refusal is
    // shown on the form, under the box it is about; see ChangePasswordForm.
    changeMyPassword: builder.mutation<
      { message: string },
      { current_password: string; password: string; confirm_password: string }
    >({
      query: (body) => ({ url: `/user/auth/password/change/`, method: "POST", body }),
      extraOptions: { silent: true },
    }),
    /** Whether the signed-in person's two-step sign-in is set up, and how many backup codes are left. */
    getMyTwoStep: builder.query<{ message: string; data: MyTwoStep }, void>({
      query: () => ({ url: `/user/auth/me/two-step/`, method: "GET" }),
      providesTags: ["MyTwoStep"],
    }),
    /** Ten new backup codes for a code from the app; silent, the card shows a refusal. */
    renewMyBackupCodes: builder.mutation<
      { message: string; data: { recovery_codes: string[] } },
      { code: string }
    >({
      query: (body) => ({ url: `/user/auth/me/two-step/recovery-codes/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["MyTwoStep"],
    }),
    /**
     * The effective identity, re-read on mount, every minute and on focus.
     *
     * The first answer after a page load is applied in place. A later one
     * giving the same person different access is not applied: it marks the
     * change, and the app reloads at the person's next move to another page,
     * so a role withdrawn by an administrator takes its menus and screens with
     * it without tearing a half-filled form away (see `access-reload`). An
     * identity swap changes the person on purpose and is applied as it is.
     */
    getMe: builder.query<MeResponse, void>({
      query: () => ({ url: `/user/auth/me/`, method: "GET" }),
      async onQueryStarted(_, { queryFulfilled, dispatch, getState }) {
        try {
          const { data } = await queryFulfilled;
          // Same person, different access since this page loaded: reload at the next move.
          const held = (getState() as RootStateType).auth;
          const incoming = {
            permissions: data.data.permissions ?? [],
            field_access: data.data.field_access ?? {},
            branch_reach: data.data.branch_reach ?? null,
          };
          const firstAnswer = !meAnsweredThisPage;
          meAnsweredThisPage = true;
          const samePerson =
            !firstAnswer &&
            !isIdentitySwapInProgress() &&
            held.user?.id != null &&
            held.user.id === data.data.user?.id;
          if (
            samePerson &&
            (accessChangePending() ||
              accessDiffers(
                {
                  permissions: held.permissions ?? [],
                  field_access: held.field_access ?? {},
                  branch_reach: held.branch_reach ?? null,
                },
                incoming,
              ))
          ) {
            markAccessChanged();
            return;
          }
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
            field_access: data.data.field_access ?? {},
            branch_reach: data.data.branch_reach ?? null,
          }));
        } catch {
          // /me failed (e.g. transient 5xx) - keep the persisted permissions;
          // the 401 interceptor handles a genuinely dead session.
        }
      },
    }),
  }),
});

/**
 * Re-read the signed-in person's access once an access-changing save succeeds.
 *
 * Used as `onQueryStarted` on every endpoint that grants, withdraws or edits a
 * role or its fields. Most of the time the change was made to somebody else
 * and `/me` comes back the same, so nothing happens; when it touched the
 * person making it, `getMe` marks the change and the app reloads at their next
 * move. A failed save changed nothing and is not followed up.
 */
export async function recheckOwnAccess(
  _arg: unknown,
  { queryFulfilled, dispatch }: { queryFulfilled: Promise<unknown>; dispatch: (action: unknown) => unknown },
) {
  try {
    await queryFulfilled;
  } catch {
    return;
  }
  dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true, subscribe: false }));
}

export const {
  useLoginMutation,
  useTwoStepVerifyMutation,
  useTwoStepSetUpMutation,
  useTwoStepConfirmMutation,
  useGetMyTwoStepQuery,
  useRenewMyBackupCodesMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  usePasswordResetPreviewQuery,
  usePasswordResetConfirmMutation,
  useActivationPreviewQuery,
  useActivateAccountMutation,
  useGetPasswordPolicyQuery,
  useChangeMyPasswordMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
} = authApi;
