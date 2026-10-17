import { baseApi } from "../base-api";
import { currentSchoolSlug } from "@/utils/school-host";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type {
  Notice,
  NoticeAudienceOptions,
  NoticeListArgs,
  NoticeWrite,
} from "./notices-types";

/**
 * The tenant assertion every staff Notices request carries.
 *
 * Notices are school-owned from list through lifecycle actions. Reading the
 * slug from the school address keeps an immediate detail selection scoped even
 * while the signed-in context is hydrating. The base query preserves this
 * explicit assertion, and the backend still verifies that it belongs to the
 * signed-in user.
 */
const noticeTenant = () => ({ tenant: currentSchoolSlug() });

/**
 * Notices the school posts to its pupils, as staff read and write them.
 *
 * Reading needs `school.notices.view`. Writing needs `school.notices.post`
 * (any audience inside the poster's branch reach) or
 * `school.class_notices.post` (the classes the poster teaches); the server
 * judges each audience, and refuses one outside the poster's reach with a
 * sentence the screen shows. Writes are silent so the screen can show that
 * sentence once, where the poster is looking.
 */
export const noticesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotices: builder.query<PaginatedEnvelope<Notice>, NoticeListArgs | void>({
      query: (args) => {
        const params: Record<string, string | number> = {
          ...noticeTenant(),
          page: args?.page ?? 1,
        };
        if (args?.status && args.status !== "all") params.status = args.status;
        if (args?.search) params.search = args.search;
        return { url: `/notices/`, method: "GET", params };
      },
      providesTags: ["Notices"],
    }),

    getNotice: builder.query<Envelope<Notice>, number>({
      query: (id) => ({ url: `/notices/${id}/`, method: "GET", params: noticeTenant() }),
      providesTags: (_r, _e, id) => [{ type: "Notices", id }],
    }),

    getNoticeAudienceOptions: builder.query<Envelope<NoticeAudienceOptions>, void>({
      query: () => ({ url: `/notices/audiences/`, method: "GET", params: noticeTenant() }),
    }),

    createNotice: builder.mutation<Envelope<Notice>, NoticeWrite>({
      query: (body) => ({ url: `/notices/`, method: "POST", body, params: noticeTenant() }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notices"],
    }),

    updateNotice: builder.mutation<Envelope<Notice>, { id: number } & NoticeWrite>({
      query: ({ id, ...body }) => ({
        url: `/notices/${id}/`,
        method: "PATCH",
        body,
        params: noticeTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notices"],
    }),

    publishNotice: builder.mutation<Envelope<Notice>, number>({
      query: (id) => ({
        url: `/notices/${id}/publish/`,
        method: "POST",
        params: noticeTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notices"],
    }),

    withdrawNotice: builder.mutation<Envelope<Notice>, number>({
      query: (id) => ({
        url: `/notices/${id}/withdraw/`,
        method: "POST",
        params: noticeTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notices"],
    }),
  }),
});

export const {
  useGetNoticesQuery,
  useGetNoticeQuery,
  useGetNoticeAudienceOptionsQuery,
  useCreateNoticeMutation,
  useUpdateNoticeMutation,
  usePublishNoticeMutation,
  useWithdrawNoticeMutation,
} = noticesApi;
