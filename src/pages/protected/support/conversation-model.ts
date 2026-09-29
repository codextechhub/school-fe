import { DEFAULT_TIME_ZONE, calendarDayOf } from "@/lib/dates";
import type {
  TicketAttachment,
  TicketComment,
  TicketUser,
} from "@/redux/services/support/support-types";

export type ConversationItem =
  | {
      id: string;
      kind: "comment";
      author: TicketUser;
      createdAt: string;
      comment: TicketComment;
    }
  | {
      id: string;
      kind: "attachment";
      author: TicketUser;
      createdAt: string;
      attachment: TicketAttachment;
    };

export interface ConversationSenderGroup {
  author: TicketUser;
  items: ConversationItem[];
}

export interface ConversationDay {
  key: string;
  /** The calendar day in the school's zone, `YYYY-MM-DD`; null when the time is unreadable. */
  day: string | null;
  groups: ConversationSenderGroup[];
}

const validTime = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const OPENING_UPLOAD_GAP_MS = 5 * 60 * 1000;


const sameAuthor = (left: TicketUser, right: TicketUser): boolean =>
  left.id === right.id || (
    !left.id &&
    !right.id &&
    left.email.toLowerCase() === right.email.toLowerCase()
  );

/**
 * The text posted when a reply goes out.
 *
 * A file sent on its own still travels as a reply, so it has a message to sit
 * inside and a sender heading above it, the same as a file sent with words.
 */
export function conversationCommentBody(
  body: string,
  hasAttachment: boolean,
): string {
  return body.trim() || (hasAttachment ? "Shared a file." : "");
}

/**
 * Builds the support timeline shown to a school.
 *
 * Later unbound files are conversation events because their sender and timing
 * matter. Opening files are removed before this function is called. Adjacent
 * events from one person share a single sender heading until another person
 * speaks or the calendar day turns.
 *
 * The day turns at midnight in `timeZone`, the school's, so a message sent at
 * 11:30 pm Lagos time sits under that day for every reader, whatever their
 * device's zone.
 */
export function buildConversationDays(
  comments: TicketComment[],
  attachments: TicketAttachment[],
  timeZone: string = DEFAULT_TIME_ZONE,
): ConversationDay[] {
  const items: ConversationItem[] = [
    ...comments.map((comment) => ({
      id: `comment-${comment.id}`,
      kind: "comment" as const,
      author: comment.author,
      createdAt: comment.created_at,
      comment,
    })),
    ...attachments.map((attachment) => ({
      id: `attachment-${attachment.id}`,
      kind: "attachment" as const,
      author: attachment.uploaded_by,
      createdAt: attachment.created_at,
      attachment,
    })),
  ].sort((left, right) => validTime(left.createdAt) - validTime(right.createdAt));

  const days: ConversationDay[] = [];
  for (const item of items) {
    const calendarDay = calendarDayOf(item.createdAt, timeZone);
    const key = calendarDay ?? "unknown";
    let day = days.at(-1);
    if (!day || day.key !== key) {
      day = { key, day: calendarDay, groups: [] };
      days.push(day);
    }

    let group = day.groups.at(-1);
    if (!group || !sameAuthor(group.author, item.author)) {
      group = { author: item.author, items: [] };
      day.groups.push(group);
    }
    group.items.push(item);
  }
  return days;
}

/**
 * Separates the files uploaded while a ticket was being filed from later files.
 *
 * New conversation uploads are bound to a comment. Older clients could upload
 * a file without one, so an opening batch remains contiguous while each file
 * lands within five minutes of the ticket or the previous file. A later gap is
 * a conversation event, regardless of whether the ticket is open or complete.
 */
export function partitionTicketAttachments(
  attachments: TicketAttachment[],
  ticketCreatedAt: string,
): { initial: TicketAttachment[]; conversation: TicketAttachment[] } {
  const ordered = [...attachments].sort(
    (left, right) => validTime(left.created_at) - validTime(right.created_at),
  );
  let openingBatchEndsAt = validTime(ticketCreatedAt) + OPENING_UPLOAD_GAP_MS;
  let openingBatchComplete = false;
  const initial: TicketAttachment[] = [];
  const conversation: TicketAttachment[] = [];

  for (const attachment of ordered) {
    const attachedAt = validTime(attachment.created_at);
    if (!openingBatchComplete && attachedAt <= openingBatchEndsAt) {
      initial.push(attachment);
      openingBatchEndsAt = attachedAt + OPENING_UPLOAD_GAP_MS;
    } else {
      openingBatchComplete = true;
      conversation.push(attachment);
    }
  }

  return { initial, conversation };
}
