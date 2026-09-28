import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type { StaffProfileSection } from "../staff/staff-types";

/** A relationship the setting decides for. ADMIN is shown and fixed. */
export type ProfileAudience = "SELF" | "LINE" | "COLLEAGUE" | "ADMIN";
export type ConfigurableAudience = Exclude<ProfileAudience, "ADMIN">;

export type StaffProfilePolicy = Record<ConfigurableAudience, StaffProfileSection[]>;

export interface StaffProfileVisibility {
  policy: StaffProfilePolicy;
  /** `school` once the school has saved its own; `default` until then. */
  source: "school" | "default";
  default_policy: StaffProfilePolicy;
  groups: { key: StaffProfileSection; label: string; description: string; locked: boolean }[];
  audiences: {
    key: ProfileAudience;
    label: string;
    description: string;
    configurable: boolean;
    /** How a fixed audience is described instead of ticked, e.g. "As their role allows". */
    summary?: string;
  }[];
}

/**
 * How much of a staff profile each relationship sees, at
 * `/v1/i/me/settings/staff-profiles/`.
 *
 * Read under the settings key; saved under the Field Access key, because it is
 * an access decision. The contact card is always on and the server adds it
 * wherever a save leaves it out. A save changes what every profile read
 * returns, so it refreshes the staff records as well.
 */
export const staffProfileVisibilityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaffProfileVisibility: builder.query<Envelope<StaffProfileVisibility>, void>({
      query: () => ({ url: `/i/me/settings/staff-profiles/`, method: "GET" }),
      providesTags: ["SchoolSettings"],
    }),
    updateStaffProfileVisibility: builder.mutation<
      Envelope<StaffProfileVisibility>,
      { policy: StaffProfilePolicy; reason?: string }
    >({
      query: (body) => ({ url: `/i/me/settings/staff-profiles/`, method: "PUT", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolSettings", "SchoolStaff"],
    }),
  }),
});

export const {
  useGetStaffProfileVisibilityQuery,
  useUpdateStaffProfileVisibilityMutation,
} = staffProfileVisibilityApi;
