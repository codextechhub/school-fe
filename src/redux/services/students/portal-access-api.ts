import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type { PortalAccess, PortalAccessBulkRow } from "./students-types";

/**
 * A pupil's own sign-in account for the pupil portal, as staff manage it.
 *
 * Reading needs the student view key. Giving, resending and taking away need
 * the portal access key, and each answers with the access block as it now
 * stands. Every write is silent: the screen shows the server's sentence,
 * because the refusals tell the registrar what to fix ("Give them an admission
 * number first").
 */
export const portalAccessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPortalAccess: builder.query<Envelope<PortalAccess>, number>({
      query: (id) => ({ url: `/students/${id}/portal-access/`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "PortalAccess", id }],
    }),

    givePortalAccess: builder.mutation<Envelope<PortalAccess>, number>({
      query: (id) => ({ url: `/students/${id}/portal-access/`, method: "POST" }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, id) => [{ type: "PortalAccess", id }, "Students"],
    }),

    resendPortalInvitation: builder.mutation<Envelope<PortalAccess>, number>({
      query: (id) => ({ url: `/students/${id}/portal-access/reissue/`, method: "POST" }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, id) => [{ type: "PortalAccess", id }],
    }),

    takeAwayPortalAccess: builder.mutation<Envelope<PortalAccess>, number>({
      query: (id) => ({ url: `/students/${id}/portal-access/`, method: "DELETE" }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, id) => [{ type: "PortalAccess", id }, "Students"],
    }),

    /**
     * Give portal access to every pupil in a class this year, or to named
     * pupils. One pupil's refusal never stops the others; each row says what
     * happened to that pupil.
     */
    givePortalAccessInBulk: builder.mutation<
      Envelope<{ results: PortalAccessBulkRow[]; issued: number }>,
      { school_class: number } | { student_ids: number[] }
    >({
      query: (body) => ({ url: `/students/portal-access/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["PortalAccess", "Students"],
    }),
  }),
});

export const {
  useGetPortalAccessQuery,
  useGivePortalAccessMutation,
  useResendPortalInvitationMutation,
  useTakeAwayPortalAccessMutation,
  useGivePortalAccessInBulkMutation,
} = portalAccessApi;
