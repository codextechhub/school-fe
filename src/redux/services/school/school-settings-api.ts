import { baseApi } from "../base-api";
import { authApi } from "../auth/auth-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type {
  BranchDisplayData,
  DisplaySettingsData,
  DisplaySettingsPatch,
  PayrollScope,
  PayrollScopeData,
  SecuritySettingsData,
  SecuritySettingsPatch,
} from "./school-settings-types";

/**
 * Re-reads `/me` once a display save lands.
 *
 * Every screen formats dates from the session's `tenant.display`, which only
 * the login and `/me` write. Without this the school would save 24-hour time
 * and keep reading "8:00 am" everywhere until the next focus refetch.
 */
async function refreshSessionDisplay(
  _arg: unknown,
  { dispatch, queryFulfilled }: {
    dispatch: (action: unknown) => unknown;
    queryFulfilled: Promise<unknown>;
  },
) {
  try {
    await queryFulfilled;
  } catch {
    return;
  }
  dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true, subscribe: false }));
}

/**
 * The school settings console's own endpoints, under `/v1/i/me/settings/`.
 *
 * None takes a school identifier: the school is the session's. A branch is
 * named by query param, and the server refuses one that is not this school's
 * or not visible to the caller, so there is nothing here to tamper with.
 *
 * Saves are not toasted by the base query on a 400 (`silent`), because each
 * screen keeps the server's reason on the screen next to the field it is about.
 */
export const schoolSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchoolSecuritySettings: builder.query<
      Envelope<SecuritySettingsData>,
      { branch?: string }
    >({
      query: ({ branch }) => ({
        url: `/i/me/settings/security/`,
        method: "GET",
        params: branch ? { branch } : undefined,
      }),
      providesTags: ["SchoolSettings"],
    }),

    updateSchoolSecuritySettings: builder.mutation<
      Envelope<SecuritySettingsData>,
      SecuritySettingsPatch
    >({
      query: ({ branch, ...body }) => ({
        url: `/i/me/settings/security/`,
        method: "PATCH",
        params: branch ? { branch } : undefined,
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolSettings"],
    }),

    getPayrollScope: builder.query<Envelope<PayrollScopeData>, void>({
      query: () => ({ url: `/i/me/settings/payroll-scope/`, method: "GET" }),
      providesTags: ["SchoolSettings"],
    }),

    updatePayrollScope: builder.mutation<
      Envelope<PayrollScopeData>,
      { scope: PayrollScope; reason?: string }
    >({
      query: (body) => ({
        url: `/i/me/settings/payroll-scope/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolSettings"],
    }),

    getDisplaySettings: builder.query<Envelope<DisplaySettingsData>, void>({
      query: () => ({ url: `/i/me/settings/display/`, method: "GET" }),
      providesTags: ["SchoolSettings"],
    }),

    getBranchTimezone: builder.query<Envelope<BranchDisplayData>, { branch: number }>({
      query: ({ branch }) => ({
        url: `/i/me/settings/display/`,
        method: "GET",
        params: { branch },
      }),
      providesTags: ["SchoolSettings"],
    }),

    updateDisplaySettings: builder.mutation<
      Envelope<DisplaySettingsData | BranchDisplayData>,
      DisplaySettingsPatch
    >({
      query: ({ branch, ...body }) => ({
        url: `/i/me/settings/display/`,
        method: "PATCH",
        params: branch != null ? { branch } : undefined,
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolSettings"],
      onQueryStarted: refreshSessionDisplay,
    }),

    /** Clears a branch's own zone, so it runs in the school's again. */
    resetBranchTimezone: builder.mutation<Envelope<BranchDisplayData>, { branch: number }>({
      query: ({ branch }) => ({
        url: `/i/me/settings/display/`,
        method: "DELETE",
        params: { branch },
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolSettings"],
      onQueryStarted: refreshSessionDisplay,
    }),
  }),
});

export const {
  useGetSchoolSecuritySettingsQuery,
  useUpdateSchoolSecuritySettingsMutation,
  useGetPayrollScopeQuery,
  useUpdatePayrollScopeMutation,
  useGetDisplaySettingsQuery,
  useGetBranchTimezoneQuery,
  useUpdateDisplaySettingsMutation,
  useResetBranchTimezoneMutation,
} = schoolSettingsApi;
