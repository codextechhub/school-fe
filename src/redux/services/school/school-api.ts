import { updateSchool } from "../../features/auth/auth-slice";
import type { SchoolInfo } from "../../features/auth/auth-types";
import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type { SchoolProfile, SchoolProfileUpdate } from "./school-types";

/**
 * Push a changed logo back into the cached school identity.
 *
 * The shell renders `school.logo` from the session, so without this the sidebar
 * and the favicon keep the old image until the next `/me` - on the very screen
 * where the school just replaced it. Merged into the cached record rather than
 * rebuilt from the profile payload, which carries no school id.
 */
const syncCachedLogo = async (
  queryFulfilled: Promise<{ data: Envelope<SchoolProfile> }>,
  dispatch: (action: unknown) => void,
  getState: () => unknown,
) => {
  try {
    const { data } = await queryFulfilled;
    const school = (getState() as { auth?: { school?: SchoolInfo | null } })?.auth
      ?.school;
    if (!school) return;
    dispatch(updateSchool({ ...school, logo: data.data.logo || null }));
  } catch {
    // A failed upload changed nothing, so the cached logo is still right.
  }
};

/**
 * The school's own profile.
 *
 * `/v1/i/me/profile/` takes no identifier: the school is the one the session's
 * tenant owns, so there is no id to change and no way to address anybody else's
 * record. It is open to a school that has not gone live, which is the point -
 * "Complete your school profile" is a required onboarding step, and the only
 * endpoint that could write those fields before this one was closed to exactly
 * the schools that needed it.
 */
export const schoolApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchoolProfile: builder.query<Envelope<SchoolProfile>, void>({
      query: () => ({ url: `/i/me/profile/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: ["SchoolProfile"],
    }),

    updateSchoolProfile: builder.mutation<
      Envelope<SchoolProfile>,
      SchoolProfileUpdate
    >({
      query: (body) => ({ url: `/i/me/profile/`, method: "PATCH", body }),
      extraOptions: { silent: true },
      // The onboarding gate re-reads the profile to decide whether the school
      // metadata step can close. Academic rules also fall back to the profile's
      // term structure, so changing it must replace the cached session template.
      invalidatesTags: ["SchoolProfile", "Onboarding", "AcademicRules"],
    }),

    /**
     * Replace the school's logo.
     *
     * `FormData`, not JSON: this is a file, which is also why it has its own
     * endpoint rather than a field on the profile PATCH. The Content-Type header
     * is deliberately NOT set - the browser has to add its own multipart
     * boundary, and naming the type by hand strips it.
     */
    uploadSchoolLogo: builder.mutation<Envelope<SchoolProfile>, File>({
      query: (file) => {
        const body = new FormData();
        body.append("logo", file);
        return { url: `/i/me/profile/logo/`, method: "POST", body };
      },
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolProfile"],
      onQueryStarted: (_arg, { dispatch, getState, queryFulfilled }) =>
        syncCachedLogo(queryFulfilled, dispatch, getState),
    }),

    /** Clear the logo. Succeeds even when there was none to clear. */
    removeSchoolLogo: builder.mutation<Envelope<SchoolProfile>, void>({
      query: () => ({ url: `/i/me/profile/logo/`, method: "DELETE" }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolProfile"],
      onQueryStarted: (_arg, { dispatch, getState, queryFulfilled }) =>
        syncCachedLogo(queryFulfilled, dispatch, getState),
    }),
  }),
});

export const {
  useGetSchoolProfileQuery,
  useUpdateSchoolProfileMutation,
  useUploadSchoolLogoMutation,
  useRemoveSchoolLogoMutation,
} = schoolApi;
