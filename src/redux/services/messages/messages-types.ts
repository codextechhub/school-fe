/** What sort of conversation a row is. */
export type ConversationKind =
  | "STAFF_DIRECT"
  | "FAMILY"
  | "PUPIL"
  | "GROUP"
  | "BROADCAST"
  | "BROADCAST_REPLY";

/** Whether recipients of a broadcast may answer its sender privately. */
export type ReplyMode = "ONE_WAY" | "PRIVATE_REPLIES";

/** The inbox's filter by kind, as the `kind` query parameter spells it. */
export type InboxKind = "all" | "direct" | "family" | "group" | "broadcast";

/** The caller's place in a conversation. */
export type ParticipantRole =
  | "MEMBER"
  | "OWNER"
  | "SENDER"
  | "RECIPIENT"
  | "STAFF"
  | "GUARDIAN"
  | "PUPIL";

/** Somebody in a conversation, as the server names them. */
export interface Participant {
  user_id: number;
  name?: string;
  label?: string;
  role?: ParticipantRole;
}

export interface BranchRef {
  id: number;
  name: string;
}

export interface ChildRef {
  id: number;
  name?: string;
  class_name?: string;
}

export interface LastMessage {
  id: number;
  preview?: string | null;
  sender_name?: string;
  sent_at?: string;
  mine?: boolean;
}

/**
 * A conversation in the inbox, or the head of one that is open.
 *
 * Any business field may be absent where the viewer's Field Access hides it
 * (`school.messages`): `display_name`, `counterpart` and `last_message.sender_name`
 * follow People in the conversation, `title` and a group's or broadcast's
 * `display_name` follow Group or broadcast name, `last_message.preview` follows
 * Message, the times follow Sent times, `unread_count` follows Read status,
 * `child` and `reply_mode` follow their own switches. `branch` appears only at
 * a school with more than one branch, and only on groups and broadcasts.
 */
export interface ConversationRow {
  id: number;
  kind: ConversationKind;
  kind_label?: string;
  title?: string;
  display_name?: string;
  counterpart?: { user_id: number; name?: string; label?: string } | null;
  child?: ChildRef | null;
  member_count?: number | null;
  last_message?: LastMessage | null;
  last_activity_at?: string | null;
  unread_count?: number;
  reply_mode?: ReplyMode | "";
  read_only?: boolean;
  can_send?: boolean;
  read_only_reason?: string;
  role?: ParticipantRole;
  branch?: BranchRef | null;
  /** The oversight detail only: the caller is reading, not taking part. */
  inspection?: boolean;
  _read_only_fields?: readonly string[];
}

/**
 * One conversation opened: the row plus who is in it.
 *
 * `participants` lists the current members of a direct conversation or a group.
 * A broadcast's sender also gets `recipients`; everyone gets `recipient_count`.
 */
export interface ConversationDetail extends ConversationRow {
  participants?: Participant[];
  recipients?: Participant[];
  recipient_count?: number;
  /**
   * Whether the screen draws read ticks on the reader's own messages. Absent
   * where the role may not read Read receipts, and false where the school has
   * switched receipts off.
   */
  receipts?: boolean;
}

export interface MessageSender {
  user_id: number;
  name?: string;
}

/**
 * Whether the people a sender wrote to have read the message.
 *
 * `sent` until every reader has read it, then `read`. In a group or a broadcast
 * `read_count` over `recipient_count` is "Read by 12 of 40".
 */
export interface Receipt {
  state: "sent" | "read";
  read_count: number;
  recipient_count: number;
}

export interface ChatMessage {
  id: number;
  body?: string;
  sender?: MessageSender | null;
  sent_at?: string;
  mine?: boolean;
  /** Only on the reader's own messages, and only where receipts apply to them. */
  receipt?: Receipt;
}

/**
 * What the polling form of the thread answers with: messages newer than the
 * one held, oldest first, and the current receipts of the reader's recent own
 * messages (absent where receipts do not apply).
 */
export interface ThreadUpdates {
  results: ChatMessage[];
  has_more: boolean;
  receipts?: Array<Receipt & { id: number }>;
}

/**
 * A page of messages, newest first, with the cursor for the page before it.
 * An inspected conversation's pages also say `read_only` and `inspection`.
 */
export interface MessagePage {
  results: ChatMessage[];
  has_more: boolean;
  next_before: number | null;
  read_only?: boolean;
  inspection?: boolean;
}

/** What starting a conversation or replying to a broadcast answers with. */
export interface OpenedConversation {
  conversation: ConversationDetail;
  message: ChatMessage | null;
}

export interface UnreadCounts {
  total?: number;
  direct?: number;
  family?: number;
  group?: number;
  broadcast?: number;
}

export interface StaffContact {
  user_id: number;
  name?: string;
  label?: string;
  branch?: BranchRef | null;
}

export interface FamilyGuardian {
  id: number;
  name?: string;
  relationship?: string;
  has_account: boolean;
}

/**
 * A pupil a member of staff may reach, with the people who can answer.
 *
 * Where Field Access hides the pupil the server sends only `id`, and where it
 * hides the people it leaves `guardians` out.
 */
export interface FamilyContact {
  student?: { id: number; name?: string; class_name?: string };
  id?: number;
  guardians?: FamilyGuardian[];
  pupil_has_account: boolean;
}

export interface InboxArgs {
  kind?: InboxKind;
  unread?: boolean;
  search?: string;
  page?: number;
}

export interface ContactArgs {
  search?: string;
  branch?: number | null;
  page?: number;
  pageSize?: number;
}

export interface MessagesArgs {
  id: number;
  before?: number | null;
  limit?: number;
}

export interface UpdatesArgs {
  id: number;
  /** The newest message id the screen holds. */
  after: number;
}

/** Start a conversation: find-or-create on the pair, then send `body`. */
export type StartConversationBody =
  | { kind: "STAFF_DIRECT"; recipient: number; body?: string; client_token?: string }
  | { kind: "FAMILY"; student: number; guardian: number; body?: string; client_token?: string }
  | { kind: "PUPIL"; student: number; body?: string; client_token?: string };

export interface SendMessageBody {
  body: string;
  client_token: string;
}

export interface CreateGroupBody {
  name: string;
  branch: number | null;
  members: number[];
  body?: string;
  client_token?: string;
}

export interface CreateBroadcastBody {
  title: string;
  body: string;
  reply_mode?: ReplyMode;
  branch: number | null;
  recipients: number[];
  client_token: string;
}

/** A row on an oversight list: no message text, only who and how much. */
export interface OversightRow {
  id: number;
  kind: ConversationKind;
  display_name?: string;
  child?: ChildRef | null;
  participants?: Array<string | { name?: string; user_id?: number }>;
  member_count?: number;
  recipient_count?: number;
  branch?: BranchRef | null;
  last_activity_at?: string | null;
  message_count?: number;
}

/** An inspected conversation: the list row plus everyone in it where it has members. */
export interface OversightDetail extends OversightRow {
  members?: Participant[];
  read_only: boolean;
  inspection: boolean;
}

export type OversightKind = "groups" | "broadcasts" | "pupil-conversations";

export interface OversightArgs {
  kind: OversightKind;
  search?: string;
  page?: number;
}
