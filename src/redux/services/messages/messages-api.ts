import { baseApi } from "../base-api";
import { currentSchoolSlug } from "@/utils/school-host";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type {
  ChatMessage,
  ConversationDetail,
  ConversationRow,
  ContactArgs,
  CreateBroadcastBody,
  CreateGroupBody,
  FamilyContact,
  InboxArgs,
  MessagePage,
  MessagesArgs,
  OpenedConversation,
  OversightArgs,
  OversightDetail,
  OversightRow,
  SendMessageBody,
  StartConversationBody,
  StaffContact,
  UnreadCounts,
} from "./messages-types";

/**
 * The tenant assertion every staff Messages request carries, read from the
 * school address so a selection made while the session hydrates is still
 * scoped. The base query keeps it and the server verifies it against the
 * signed-in user.
 */
const messageTenant = () => ({ tenant: currentSchoolSlug() });

/** The unread count and the open thread refresh this often while the tab is in front. */
export const UNREAD_POLL_MS = 60_000;
export const THREAD_POLL_MS = 15_000;

/**
 * The route a conversation's CSV export is fetched from.
 *
 * The file is only handed to a caller holding `school.messages.export` who
 * takes part in the conversation, so it is fetched with the bearer token and
 * saved (`downloadAuthorisedFile`) rather than linked.
 */
export const conversationExportPath = (id: number) => `/v1/messages/conversations/${id}/export/`;

/**
 * A page of messages whether the server wraps it in the envelope or not.
 *
 * The cursor lists are the one place the platform envelope is optional in the
 * contract (`results`, `has_more`, `next_before`), so both spellings read the
 * same.
 */
function unwrapPage(raw: unknown): Envelope<MessagePage> {
  const body = (raw ?? {}) as Partial<Envelope<MessagePage>> & Partial<MessagePage>;
  const page = (body.data ?? body) as Partial<MessagePage>;
  return {
    success: body.success ?? true,
    message: body.message ?? "",
    data: {
      results: page.results ?? [],
      has_more: page.has_more ?? false,
      next_before: page.next_before ?? null,
    },
  };
}

/**
 * Staff conversations: the inbox, one conversation's thread, groups,
 * broadcasts and the read-only oversight lists.
 *
 * Access is judged per request by the server (`school.messages.*`). Writes are
 * silent so the screen that sent them shows the one sentence the server gave,
 * beside the text the person typed. Reads that poll are silent too, so a
 * transient failure never interrupts somebody mid-sentence.
 */
export const messagesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInbox: builder.query<PaginatedEnvelope<ConversationRow>, InboxArgs | void>({
      query: (args) => {
        const params: Record<string, string | number | boolean> = {
          ...messageTenant(),
          page: args?.page ?? 1,
        };
        if (args?.kind && args.kind !== "all") params.kind = args.kind;
        if (args?.unread) params.unread = true;
        if (args?.search) params.search = args.search;
        return { url: `/messages/conversations/`, method: "GET", params };
      },
      extraOptions: { silent: true },
      providesTags: [{ type: "Messages", id: "LIST" }],
    }),

    getConversation: builder.query<Envelope<ConversationDetail>, number>({
      query: (id) => ({
        url: `/messages/conversations/${id}/`,
        method: "GET",
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      providesTags: (_r, _e, id) => [{ type: "Messages", id: `detail-${id}` }],
    }),

    getConversationMessages: builder.query<Envelope<MessagePage>, MessagesArgs>({
      query: ({ id, before, limit }) => {
        const params: Record<string, string | number> = { ...messageTenant() };
        if (before != null) params.before = before;
        if (limit != null) params.limit = limit;
        return { url: `/messages/conversations/${id}/messages/`, method: "GET", params };
      },
      transformResponse: unwrapPage,
      extraOptions: { silent: true },
      providesTags: (_r, _e, { id, before }) =>
        before == null ? [{ type: "Messages", id: `thread-${id}` }] : [],
    }),

    getUnreadCount: builder.query<Envelope<UnreadCounts>, void>({
      query: () => ({ url: `/messages/unread-count/`, method: "GET", params: messageTenant() }),
      extraOptions: { silent: true },
      providesTags: ["MessageUnread"],
    }),

    getStaffContacts: builder.query<PaginatedEnvelope<StaffContact>, ContactArgs | void>({
      query: (args) => {
        const params: Record<string, string | number> = {
          ...messageTenant(),
          kind: "staff",
          page: args?.page ?? 1,
        };
        if (args?.search) params.search = args.search;
        if (args?.branch != null) params.branch = args.branch;
        if (args?.pageSize) params.page_size = args.pageSize;
        return { url: `/messages/contacts/`, method: "GET", params };
      },
      extraOptions: { silent: true },
    }),

    getFamilyContacts: builder.query<PaginatedEnvelope<FamilyContact>, ContactArgs | void>({
      query: (args) => {
        const params: Record<string, string | number> = {
          ...messageTenant(),
          kind: "family",
          page: args?.page ?? 1,
        };
        if (args?.search) params.search = args.search;
        if (args?.pageSize) params.page_size = args.pageSize;
        return { url: `/messages/contacts/`, method: "GET", params };
      },
      extraOptions: { silent: true },
    }),

    startConversation: builder.mutation<Envelope<OpenedConversation>, StartConversationBody>({
      query: (body) => ({
        url: `/messages/conversations/`,
        method: "POST",
        body,
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "Messages", id: "LIST" }, "MessageUnread"],
    }),

    sendMessage: builder.mutation<Envelope<ChatMessage>, { id: number } & SendMessageBody>({
      query: ({ id, ...body }) => ({
        url: `/messages/conversations/${id}/messages/`,
        method: "POST",
        body,
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Messages", id: "LIST" },
        { type: "Messages", id: `thread-${id}` },
      ],
    }),

    markRead: builder.mutation<Envelope<{ conversation: number; unread_count?: number }>, { id: number; up_to?: number }>({
      query: ({ id, up_to }) => ({
        url: `/messages/conversations/${id}/read/`,
        method: "POST",
        body: up_to != null ? { up_to } : {},
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "Messages", id: "LIST" }, "MessageUnread"],
    }),

    createGroup: builder.mutation<Envelope<ConversationDetail>, CreateGroupBody>({
      query: (body) => ({ url: `/messages/groups/`, method: "POST", body, params: messageTenant() }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "Messages", id: "LIST" }, "MessageUnread"],
    }),

    renameGroup: builder.mutation<Envelope<ConversationDetail>, { id: number; name: string }>({
      query: ({ id, name }) => ({
        url: `/messages/groups/${id}/`,
        method: "PATCH",
        body: { name },
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Messages", id: "LIST" },
        { type: "Messages", id: `detail-${id}` },
      ],
    }),

    addGroupMembers: builder.mutation<Envelope<ConversationDetail>, { id: number; members: number[] }>({
      query: ({ id, members }) => ({
        url: `/messages/groups/${id}/members/`,
        method: "POST",
        body: { members },
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Messages", id: "LIST" },
        { type: "Messages", id: `detail-${id}` },
      ],
    }),

    removeGroupMember: builder.mutation<Envelope<{ group: number; user_id: number }>, { id: number; userId: number }>({
      query: ({ id, userId }) => ({
        url: `/messages/groups/${id}/members/${userId}/`,
        method: "DELETE",
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Messages", id: "LIST" },
        { type: "Messages", id: `detail-${id}` },
        "MessageUnread",
      ],
    }),

    makeGroupOwner: builder.mutation<Envelope<ConversationDetail>, { id: number; userId: number }>({
      query: ({ id, userId }) => ({
        url: `/messages/groups/${id}/members/${userId}/owner/`,
        method: "POST",
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Messages", id: "LIST" },
        { type: "Messages", id: `detail-${id}` },
      ],
    }),

    sendBroadcast: builder.mutation<Envelope<ConversationDetail>, CreateBroadcastBody>({
      query: (body) => ({
        url: `/messages/broadcasts/`,
        method: "POST",
        body,
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "Messages", id: "LIST" }, "MessageUnread"],
    }),

    replyToBroadcast: builder.mutation<Envelope<OpenedConversation>, { id: number } & SendMessageBody>({
      query: ({ id, ...body }) => ({
        url: `/messages/broadcasts/${id}/reply/`,
        method: "POST",
        body,
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "Messages", id: "LIST" }, "MessageUnread"],
    }),

    getOversightList: builder.query<PaginatedEnvelope<OversightRow>, OversightArgs>({
      query: ({ kind, search, page }) => {
        const params: Record<string, string | number> = { ...messageTenant(), page: page ?? 1 };
        if (search) params.search = search;
        return { url: `/messages/oversight/${kind}/`, method: "GET", params };
      },
      extraOptions: { silent: true },
      providesTags: [{ type: "Messages", id: "OVERSIGHT" }],
    }),

    // Opening one is audited on the server, so it is never cached for reuse
    // and never refetched on focus: one open is one inspection.
    getOversightConversation: builder.query<Envelope<OversightDetail>, number>({
      query: (id) => ({
        url: `/messages/oversight/conversations/${id}/`,
        method: "GET",
        params: messageTenant(),
      }),
      extraOptions: { silent: true },
      keepUnusedDataFor: 0,
    }),

    getOversightMessages: builder.query<Envelope<MessagePage>, MessagesArgs>({
      query: ({ id, before, limit }) => {
        const params: Record<string, string | number> = { ...messageTenant() };
        if (before != null) params.before = before;
        if (limit != null) params.limit = limit;
        return { url: `/messages/oversight/conversations/${id}/messages/`, method: "GET", params };
      },
      transformResponse: unwrapPage,
      extraOptions: { silent: true },
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetInboxQuery,
  useGetConversationQuery,
  useGetConversationMessagesQuery,
  useLazyGetConversationMessagesQuery,
  useGetUnreadCountQuery,
  useGetStaffContactsQuery,
  useGetFamilyContactsQuery,
  useStartConversationMutation,
  useSendMessageMutation,
  useMarkReadMutation,
  useCreateGroupMutation,
  useRenameGroupMutation,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useMakeGroupOwnerMutation,
  useSendBroadcastMutation,
  useReplyToBroadcastMutation,
  useGetOversightListQuery,
  useGetOversightConversationQuery,
  useGetOversightMessagesQuery,
  useLazyGetOversightMessagesQuery,
} = messagesApi;
