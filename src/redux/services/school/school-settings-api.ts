import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type {
  PayrollScope,
  PayrollScopeData,
  SecuritySettingsData,
  SecuritySettingsPatch,
} from "./school-settings-types";

/**
 * The school settings console's own endpoints, under `/v1/i/me/settings/`.
 *
 * Neither takes a school identifier: the school is the session's. A branch is
 * named by query param, and the server refuses one that is not this school's
 * or not visible to the caller, so there is nothing here to tamper with.
 *
 * Saves are not toasted by the base query on a 400 (`silent`), because both
 * screens keep the server's reason on the screen next to the field it is about.
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
  }),
});

export const {
  useGetSchoolSecuritySettingsQuery,
  useUpdateSchoolSecuritySettingsMutation,
  useGetPayrollScopeQuery,
  useUpdatePayrollScopeMutation,
} = schoolSettingsApi;
