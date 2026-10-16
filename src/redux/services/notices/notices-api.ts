import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type {
  Notice,
  NoticeAudienceOptions,
  NoticeListArgs,
  NoticeWrite,
} from "./notices-types";

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
        const params: Record<string, string | number> = { page: args?.page ?? 1 };
        if (args?.status && args.status !== "all") params.status = args.status;
        if (args?.search) params.search = args.search;
        return { url: `/notices/`, method: "GET", params };
      },
      providesTags: ["Notices"],
    }),

    getNotice: builder.query<Envelope<Notice>, number>({
      query: (id) => ({ url: `/notices/${id}/`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Notices", id }],
    }),

    getNoticeAudienceOptions: builder.query<Envelope<NoticeAudienceOptions>, void>({
      query: () => ({ url: `/notices/audiences/`, method: "GET" }),
    }),

    createNotice: builder.mutation<Envelope<Notice>, NoticeWrite>({
      query: (body) => ({ url: `/notices/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notices"],
    }),

    updateNotice: builder.mutation<Envelope<Notice>, { id: number } & NoticeWrite>({
      query: ({ id, ...body }) => ({ url: `/notices/${id}/`, method: "PATCH", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notices"],
    }),

    publishNotice: builder.mutation<Envelope<Notice>, number>({
      query: (id) => ({ url: `/notices/${id}/publish/`, method: "POST" }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notices"],
    }),

    withdrawNotice: builder.mutation<Envelope<Notice>, number>({
      query: (id) => ({ url: `/notices/${id}/withdraw/`, method: "POST" }),
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
