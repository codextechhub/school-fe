import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";

/**
 * Which events reach this school's people, and by which channel:
 * `/v1/notify/settings/`.
 *
 * One row per event and channel, read at one scope: the whole school, or one
 * branch (`?branch=<id>`). A branch value overrides the school's, which
 * overrides XVS's default; `source` names the layer the value came from.
 *
 * A branch may only set the events that are sent with a branch
 * (`branch_scoped`): an invoice belongs to the child's branch, an export has
 * no branch at all. Who may change what is the server's answer, per row, in
 * `can_edit`: a branch administrator edits their own branches and never the
 * whole school, a transactional event (a receipt, a password reset) always
 * sends, and the in-app channel is always on.
 */
export type NotificationChannel = "in_app" | "email";

export interface NotificationSettingRow {
  event_type_key: string;
  event_type_label: string;
  source_module: string;
  /** The product area the event belongs to ("Procurement"); the list groups by it. */
  source_module_label: string;
  channel: NotificationChannel;
  is_enabled: boolean;
  is_transactional: boolean;
  source: "branch" | "tenant" | "platform" | "default";
  /** Settable per branch, because the event is sent with a branch. */
  branch_scoped?: boolean;
  /** Whether this reader may change this row at the scope it was read at. */
  can_edit?: boolean;
}

export interface NotificationSettingUpdate {
  event_type_key: string;
  channel: NotificationChannel;
  /** `null`, at a branch, removes the branch's own value so it follows the school. */
  is_enabled: boolean | null;
}

/**
 * The success envelope turns an empty list into `{}`, so a matrix with no rows
 * arrives as an object. Read it through here, never as `data` directly.
 */
export const settingRows = (
  data: NotificationSettingRow[] | Record<string, never> | undefined,
): NotificationSettingRow[] => (Array.isArray(data) ? data : []);

export const notificationSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotificationSettings: builder.query<
      Envelope<NotificationSettingRow[] | Record<string, never>>,
      { branch?: string }
    >({
      query: ({ branch }) => ({
        url: `/notify/settings/`,
        method: "GET",
        params: branch ? { branch } : undefined,
      }),
      providesTags: ["NotificationSettings"],
    }),

    /** All or nothing: one refused row refuses the whole batch. */
    updateNotificationSettings: builder.mutation<
      Envelope<NotificationSettingRow[] | Record<string, never>>,
      { updates: NotificationSettingUpdate[]; branch?: string }
    >({
      query: ({ updates, branch }) => ({
        url: `/notify/settings/update/`,
        method: "PATCH",
        params: branch ? { branch } : undefined,
        body: { updates },
      }),
      invalidatesTags: ["NotificationSettings"],
    }),
  }),
});

export const {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
} = notificationSettingsApi;
