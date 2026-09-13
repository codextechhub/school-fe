import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";

/** One item in the bell's tray, as `/v1/notify/` returns it. */
export interface NotificationItem {
  id: string;
  event_type_key: string;
  event_type_label: string;
  channel: "in_app";
  subject: string;
  body: string;
  /** Where the event happened. Often a route this app does not have yet. */
  action_url: string;
  is_read: boolean;
  created_at: string;
}

/** What `/v1/notify/acknowledge-route/` reports about one navigation. */
export interface RouteAcknowledgement {
  /** Rows this call cleared. Zero on most navigations, and on a double read. */
  updated_count: number;
  /** The reader's unread in-app total once the clearing is done. */
  unread_count: number;
}

/**
 * The notification bell and its tray.
 *
 * Every endpoint here is open to a school that has not gone live: the backend
 * opens exactly the personal-inbox actions (list, retrieve, unread-count,
 * mark-read, mark-all-read) and keeps settings, history and templates shut. The
 * queryset is scoped to the recipient, so there is nobody else's post to read.
 */
export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnreadNotificationCount: builder.query<
      Envelope<{ unread_count: number }>,
      void
    >({
      query: () => ({ url: `/notify/unread-count/`, method: "GET" }),
      // A failed count is not worth interrupting anyone for: the bell simply
      // shows no badge, which is what it shows at zero anyway.
      extraOptions: { silent: true },
      providesTags: ["Notifications"],
    }),

    /** The tray's contents. Unread only, newest first, a handful at a time. */
    getNotifications: builder.query<
      PaginatedEnvelope<NotificationItem>,
      {
        page?: number;
        page_size?: number;
        is_read?: boolean;
        search?: string;
      } | void
    >({
      query: (args) => ({
        url: `/notify/`,
        method: "GET",
        params: {
          page: args?.page ?? 1,
          page_size: args?.page_size ?? 5,
          ...(args?.is_read === undefined ? {} : { is_read: args.is_read }),
          // Searched on the SERVER. Filtering the fetched page here instead
          // would leave the page count describing the unsearched feed.
          ...(args?.search ? { search: args.search } : {}),
        },
      }),
      extraOptions: { silent: true },
      providesTags: ["Notifications"],
    }),

    markNotificationsRead: builder.mutation<
      Envelope<{ updated_count: number }>,
      { ids: string[] }
    >({
      query: (body) => ({ url: `/notify/mark-read/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsRead: builder.mutation<
      Envelope<{ updated_count: number }>,
      void
    >({
      query: () => ({ url: `/notify/mark-all-read/`, method: "POST" }),
      extraOptions: { silent: true },
      invalidatesTags: ["Notifications"],
    }),

    /**
     * Name the route the reader just opened, so the post about that record
     * stops sitting in the bell.
     *
     * Fired on every pathname change, and most of them clear nothing: the
     * backend matches only a path that names one record (an export run, a
     * ticket, an approval, an import batch), so the tray is refetched only when
     * `updated_count` says a row actually moved.
     *
     * `unread_count` is the authority on the badge, and `updated_count` is not.
     * Reading a record through its own endpoint clears the rows pointing at it
     * server-side, and that GET usually lands microseconds before this call, so
     * this one updates nothing while the badge still shows the pre-read number.
     * The count travels back with the response precisely so the bell can be
     * corrected straight away rather than at the next sixty second poll.
     */
    acknowledgeNotificationRoute: builder.mutation<
      Envelope<RouteAcknowledgement>,
      { path: string }
    >({
      query: (body) => ({
        url: `/notify/acknowledge-route/`,
        method: "POST",
        body,
      }),
      // Background work on behalf of a reader who asked for a screen, not for
      // this: a failure belongs in the console, never in a toast.
      extraOptions: { silent: true },
      invalidatesTags: (result, error) =>
        !error && result?.data?.updated_count ? ["Notifications"] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const unread = data?.data?.unread_count;
          if (typeof unread !== "number") return;
          dispatch(
            notificationsApi.util.updateQueryData(
              "getUnreadNotificationCount",
              undefined,
              (draft) => {
                draft.data.unread_count = unread;
              },
            ),
          );
        } catch {
          // A count that never arrived leaves the badge to the next poll.
        }
      },
    }),
  }),
});

export const {
  useGetUnreadNotificationCountQuery,
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
  useMarkAllNotificationsReadMutation,
  useAcknowledgeNotificationRouteMutation,
} = notificationsApi;
