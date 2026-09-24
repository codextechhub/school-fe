import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type {
  CreateTicketBody,
  Ticket,
  TicketListParams,
  TicketStatus,
} from "./support-types";

// ─────────────────────────────────────────────────────────────────────────────
// The support desk, at /v1/support/tickets/.
//
// A school runs its own desk. Its staff raise tickets, whoever holds
// `tickets.ticket.triage` inside the school works the queue, and only what that
// person escalates reaches CodeX. So a school reads and writes the same
// endpoints CodeX does; what differs is which rows come back, and the server
// decides that - see visible_tickets_qs in vs_tickets.
//
// This used to be the create half alone, because before go-live a school could
// file a ticket and nothing else. That is no longer the shape of the product:
// the school is the first line now, so it needs the list, the thread and the
// transitions as well.
//
// `extraOptions: { silent: true }` where a screen renders its own error. The
// base query toasts 400/403/404 globally, and a duplicate message beside an
// inline one reads as two separate failures.
// ─────────────────────────────────────────────────────────────────────────────

const query = (params: TicketListParams): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * The school's queue, or the caller's own threads.
     *
     * One endpoint serves both, because the server already answers "which of
     * these may you see": a triager gets the school's tickets narrowed to their
     * branches, everybody else gets the ones they are on. A second "mine"
     * endpoint would be a second answer to a question with one.
     */
    getTickets: builder.query<PaginatedEnvelope<Ticket>, TicketListParams | void>({
      query: (params) => ({ url: `/support/tickets/${query(params ?? {})}`, method: "GET" }),
      providesTags: ["Tickets"],
    }),

    getTicket: builder.query<Envelope<Ticket>, string | number>({
      query: (id) => ({ url: `/support/tickets/${id}/`, method: "GET" }),
      providesTags: ["Tickets"],
    }),

    createTicket: builder.mutation<Envelope<Ticket>, CreateTicketBody>({
      query: (body) => ({ url: `/support/tickets/`, method: "POST", body }),
      // The escalation form renders its own inline errors; see the note in
      // onboarding-api.ts.
      extraOptions: { silent: true },
      invalidatesTags: ["Tickets"],
    }),

    /**
     * Reply on a ticket.
     *
     * Public only. A school's thread is read by the person who raised it and,
     * once escalated, by CodeX; there is no third audience here for an internal
     * note, and the server strips INTERNAL comments out of what it sends a
     * school anyway.
     */
    addTicketComment: builder.mutation<
      Envelope<unknown>,
      { id: string | number; body: string }
    >({
      query: ({ id, body }) => ({
        url: `/support/tickets/${id}/comments/`,
        method: "POST",
        body: { body, visibility: "PUBLIC" },
      }),
      invalidatesTags: ["Tickets"],
    }),

    /**
     * Move a ticket through the lifecycle the server owns.
     *
     * The valid moves are the server's (VALID_STATUS_TRANSITIONS), not this
     * app's. A refused move comes back as a message worth reading, so the
     * screen shows it rather than pre-empting the rule with its own copy of it.
     */
    transitionTicket: builder.mutation<
      Envelope<Ticket>,
      { id: string | number; status: TicketStatus }
    >({
      query: ({ id, status }) => ({
        url: `/support/tickets/${id}/transition/`,
        method: "POST",
        body: { status },
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Tickets"],
    }),

    /**
     * Hand a ticket to CodeX.
     *
     * The school says it cannot solve this. The same ticket travels - same
     * reference, same thread - so the person who raised it keeps watching the
     * one they were given. The note is posted publicly for that reason: they
     * should see their school passed it on, and why.
     */
    escalateTicket: builder.mutation<
      Envelope<Ticket>,
      { id: string | number; note?: string }
    >({
      query: ({ id, note }) => ({
        url: `/support/tickets/${id}/escalate/`,
        method: "POST",
        body: note ? { note } : {},
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Tickets"],
    }),

    /**
     * Follow or mute a ticket without changing who may open it.
     *
     * Muting is not leaving: the ticket stays visible and repliable, it just
     * stops paging you. A busy triager on twenty threads needs that, and the
     * server re-follows a thread the moment they comment on it, because writing
     * on something is a clearer statement of interest than a switch they flipped
     * a fortnight ago.
     */
    setTicketFollowing: builder.mutation<
      Envelope<unknown>,
      { id: string | number; following: boolean }
    >({
      query: ({ id, following }) => ({
        url: `/support/tickets/${id}/follow/`,
        method: following ? "POST" : "DELETE",
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Tickets"],
    }),

    /**
     * Attach one file to a ticket that already exists.
     *
     * Separate from creating the ticket because the endpoint needs the id. So a
     * file can fail while the ticket itself succeeded, and the caller has to
     * say so rather than pretending the whole thing failed.
     *
     * The server checks every file: 10 MB, an extension allowlist, and that the
     * bytes match the extension. The accept attribute on a picker is a courtesy
     * on top of that, not the rule.
     */
    addTicketAttachment: builder.mutation<
      Envelope<{ id: string; original_filename: string }>,
      { ticketId: string; file: File }
    >({
      query: ({ ticketId, file }) => {
        const body = new FormData();
        body.append("file", file);
        return {
          url: `/support/tickets/${ticketId}/attachments/`,
          method: "POST",
          body,
        };
      },
      extraOptions: { silent: true },
      invalidatesTags: ["Tickets"],
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useAddTicketCommentMutation,
  useTransitionTicketMutation,
  useEscalateTicketMutation,
  useSetTicketFollowingMutation,
  useAddTicketAttachmentMutation,
} = supportApi;
