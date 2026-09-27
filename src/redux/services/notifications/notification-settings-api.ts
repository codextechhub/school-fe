import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";

/**
 * Which events reach this school's people, and by which channel:
 * `/v1/notify/settings/`.
 *
 * One row per event and channel. `source` says which layer the value came
 * from, so a screen can tell a school's own choice from the platform default
 * it inherited. The server refuses two kinds of change, and a screen should
 * not offer them: a transactional event (a receipt, a password reset) always
 * sends, and the in-app channel is always on, because the bell is the one
 * place a person can never miss a thing.
 */
export type NotificationChannel = "in_app" | "email";

export interface NotificationSettingRow {
  event_type_key: string;
  event_type_label: string;
  source_module: string;
  channel: NotificationChannel;
  is_enabled: boolean;
  is_transactional: boolean;
  source: "tenant" | "platform" | "default";
}

export interface NotificationSettingUpdate {
  event_type_key: string;
  channel: NotificationChannel;
  is_enabled: boolean;
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
      void
    >({
      query: () => ({ url: `/notify/settings/`, method: "GET" }),
      providesTags: ["NotificationSettings"],
    }),

    /** All or nothing: one refused row refuses the whole batch. */
    updateNotificationSettings: builder.mutation<
      Envelope<NotificationSettingRow[] | Record<string, never>>,
      NotificationSettingUpdate[]
    >({
      query: (updates) => ({
        url: `/notify/settings/update/`,
        method: "PATCH",
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
