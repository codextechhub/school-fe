// Support desk shapes, as a school sees them.
//
// A school's tickets are its own. Its staff raise them, whoever holds
// `tickets.ticket.triage` inside the school triages them, and only what that
// person sends up reaches CodeX. So this file describes two audiences at once:
// the person who raised a ticket and follows one thread, and the person who
// works the school's whole queue.
//
// The server decides which of those you are. Nothing here should be read as a
// capability - see `capabilities` on the detail payload, which is the backend
// telling this app what the signed-in user may do with THIS ticket.

export type TicketCategory =
  | "BUG"
  | "SUPPORT"
  | "HELP"
  | "ACCOUNT"
  | "BILLING"
  | "OTHER";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type ProductArea = import("@/lib/support/ticket-context").ProductArea;

/**
 * The context a ticket may carry, which is a closed allowlist on the server.
 *
 * A ticket is read by staff outside the school once it is escalated, so a
 * free-text context field would be a place for one school's words about a named
 * person to land in a queue that was never scoped to them. Every key here is a
 * closed vocabulary or a checked shape, and the server refuses any key it does
 * not know.
 *
 * `route_pattern` is the address with its record ids removed - "/students/:id",
 * never "/students/1042" - which is the difference between naming a screen and
 * naming a child to a stranger. See @/lib/support/ticket-context.
 */
export interface TicketContext {
  product_area?: ProductArea;
  route_pattern?: string;
  /** The how-to guide written for the screen the ticket was raised on. */
  guide_id?: string;
  /** Pre-live only: which setup step the person was working through. */
  onboarding_task_key?: string;
  /** Pre-live only: how far off go-live the school was at the time. */
  onboarding_readiness_state?: string;
}

export interface TicketUser {
  id: string;
  name: string;
  email: string;
  tenant_kind: string;
  role: string;
}

export interface TicketAttachment {
  id: string;
  original_filename: string;
  content_type: string;
  size: number;
  url: string;
  uploaded_by: TicketUser;
  comment_id: string | null;
  created_at: string;
}

export interface TicketComment {
  id: string;
  author: TicketUser;
  body: string;
  /**
   * A school sees PUBLIC only. Internal notes belong to whoever is working the
   * ticket, and the server filters them out of this payload rather than
   * trusting the client to hide them.
   */
  visibility: "PUBLIC" | "INTERNAL";
  attachments: TicketAttachment[];
  created_at: string;
  updated_at: string;
}

/**
 * What the signed-in user may do with this one ticket, decided by the server.
 *
 * Sent per ticket rather than derived from a permission, because access is not
 * a permission alone: the person who raised a ticket may reply to it whatever
 * keys they hold, and a triager's reach is narrowed by branch.
 */
export interface TicketCapabilities {
  can_comment?: boolean;
  can_attach?: boolean;
  can_update?: boolean;
  can_transition?: boolean;
  /**
   * Whether escalating would be accepted, not merely whether the reader could
   * in principle. The server folds in "already escalated" and "this is CodeX's
   * own ticket", so a control gated on this never offers an action that comes
   * back refused.
   */
  can_escalate?: boolean;
  [key: string]: boolean | undefined;
}

export interface Ticket {
  id: number;
  /** The reference the school quotes back, e.g. "TK-000123". */
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  source: string;
  context: TicketContext;
  requester: TicketUser;
  assignee: TicketUser | null;
  tenant: string;
  branch: string | null;
  branch_name: string;
  resolved_at: string | null;
  closed_at: string | null;
  /**
   * Null while the ticket is still the school's own. Set the moment somebody
   * at the school sends it to CodeX, which is also when CodeX can first see it.
   */
  escalated_at: string | null;
  escalated_by: TicketUser | null;
  comments_count: number;
  attachments_count: number;
  created_at: string;
  updated_at: string;
  /** Detail payload only. */
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  capabilities?: TicketCapabilities;
  is_following?: boolean;
}

export interface CreateTicketBody {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  context?: TicketContext;
}

/** Filters the list screen sends. Every one is optional. */
export interface TicketListParams {
  status?: TicketStatus;
  /** "active" is the server's own shorthand for everything not yet closed. */
  state?: "active";
  category?: TicketCategory;
  priority?: TicketPriority;
  /** "me" spares the caller a round trip for their own id. */
  requester?: string;
  q?: string;
  page?: number;
  page_size?: number;
}
