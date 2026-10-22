import { calendarDayOf, formatDate, formatInstantTime, todayIn } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import type {
  ChatMessage,
  ConversationRow,
  ChildRef,
  ConversationKind,
  InboxKind,
  OversightKind,
  Participant,
  Receipt,
} from "@/redux/services/messages/messages-types";

/** The longest message the server accepts, in characters after trimming. */
export const BODY_MAX = 4000;
/** The counter shows once a message gets this close to the limit. */
export const COUNTER_FROM = 3600;
export const GROUP_NAME_MAX = 150;
export const BROADCAST_TITLE_MAX = 150;
/** The most staff one broadcast may address. */
export const BROADCAST_RECIPIENTS_MAX = 1000;

export const INBOX_TABS: { value: InboxKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "direct", label: "Direct" },
  { value: "family", label: "Parents and pupils" },
  { value: "group", label: "Groups" },
  { value: "broadcast", label: "Broadcasts" },
];

export const OVERSIGHT_TABS: Record<OversightKind, { label: string; note: string }> = {
  groups: {
    label: "Groups",
    note: "Staff groups in your reach. Opening one is recorded in the audit trail.",
  },
  broadcasts: {
    label: "Broadcasts",
    note: "Broadcasts in your reach. You read the broadcast itself, never the private replies to it.",
  },
  "pupil-conversations": {
    label: "Pupil conversations",
    note: "Pupil conversations are also readable by each pupil's primary parent.",
  },
};

/** What a row is called when the viewer may not read the name it carries. */
const KIND_FALLBACK: Record<ConversationKind, string> = {
  STAFF_DIRECT: "Colleague",
  FAMILY: "Parent",
  PUPIL: "Pupil",
  GROUP: "Group",
  BROADCAST: "Broadcast",
  BROADCAST_REPLY: "Reply to a broadcast",
};

export const kindFallback = (kind: ConversationKind) => KIND_FALLBACK[kind];

/** "About Tunde Bello, JSS1 A", or nothing when the pupil is unnamed. */
export function childLine(child: ChildRef | null | undefined): string {
  if (!child?.name) return "";
  return child.class_name ? `About ${child.name}, ${child.class_name}` : `About ${child.name}`;
}

/** The initials a conversation's avatar carries. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * The name a conversation goes by, or its plain label where the viewer may not
 * read it. A group's or broadcast's name is Group or broadcast name; any other
 * conversation is named for the person in it, which is People in the
 * conversation.
 */
export function displayNameFor(
  kind: ConversationKind,
  name: string | undefined,
  mayRead: (field: "title" | "participants") => boolean,
): string {
  const field = kind === "GROUP" || kind === "BROADCAST" ? "title" : "participants";
  return name && mayRead(field) ? name : kindFallback(kind);
}

/** A fresh idempotency token for one send, which a retry of the same text reuses. */
export function newClientToken(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

/** The time of day if the instant is today at the school, else its date. */
export function listTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const prefs = activeDisplayPrefs();
  return calendarDayOf(iso, prefs.timeZone) === todayIn(prefs.timeZone)
    ? formatInstantTime(iso, prefs)
    : formatDate(iso, prefs);
}

/** The clock time under a message bubble. */
export function bubbleTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return formatInstantTime(iso, activeDisplayPrefs());
}

/** "Today", "Yesterday" or the date, for the divider between days of a thread. */
export function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const prefs = activeDisplayPrefs();
  const day = calendarDayOf(iso, prefs.timeZone);
  if (!day) return "";
  const today = todayIn(prefs.timeZone);
  if (day === today) return "Today";
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (day === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return formatDate(iso, prefs);
}

/** The day a message was sent, for grouping a thread; empty when times are hidden. */
export const dayOf = (message: ChatMessage): string =>
  message.sent_at ? (calendarDayOf(message.sent_at, activeDisplayPrefs().timeZone) ?? "") : "";

/**
 * Merge pages of a thread into one ascending list, once per message id.
 *
 * Pages arrive newest first and overlap whenever a poll refetches the newest
 * page after an older one was loaded.
 */
export function mergeThread(...pages: ChatMessage[][]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  for (const page of pages) for (const message of page) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/** Names from an oversight row's participants, whichever shape the server uses. */
export function participantNames(
  participants: Array<string | { name?: string }> | undefined,
): string[] {
  return (participants ?? [])
    .map((entry) => (typeof entry === "string" ? entry : (entry.name ?? "")))
    .filter(Boolean);
}

export const roleLabel = (participant: Participant): string => {
  switch (participant.role) {
    case "OWNER":
      return "Owner";
    case "SENDER":
      return "Sender";
    case "GUARDIAN":
      return "Parent";
    case "PUPIL":
      return "Pupil";
    default:
      return "";
  }
};

export const SEND_REFUSED = "We could not send your message. Try again.";
export const READ_ONLY_FALLBACK = "You can read this conversation but not reply to it.";
export const CANNOT_SEND_COPY = "Your role cannot send messages.";
export const CANNOT_READ_COPY = "Your role cannot read message text.";
export const ONE_WAY_COPY = "This broadcast is one-way. Replies are turned off.";

export const OVERSIGHT_BANNER =
  "Read-only inspection. You are not a member, and opening this conversation is recorded in the audit trail.";

/** The id of the conversation a start or create answers with, however it is nested. */
export function openedId(data: unknown): number | null {
  const record = (data ?? {}) as Partial<ConversationRow> & { conversation?: Partial<ConversationRow> };
  return record.id ?? record.conversation?.id ?? null;
}

export type TickState = "sending" | "sent" | "read";

/** The tick a message shows, from its receipt: read once every reader has read it. */
export const tickStateOf = (receipt: Receipt): TickState => (receipt.state === "read" ? "read" : "sent");

/** "Read by 3 of 5", the sentence a group or broadcast sender sees. */
export const readByCopy = (receipt: Receipt) =>
  `Read by ${receipt.read_count} of ${receipt.recipient_count}`;
