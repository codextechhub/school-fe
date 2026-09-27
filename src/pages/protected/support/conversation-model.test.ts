import { describe, expect, it } from "vitest";
import type {
  TicketAttachment,
  TicketComment,
  TicketUser,
} from "@/redux/services/support/support-types";
import {
  buildConversationDays,
  conversationCommentBody,
  partitionTicketAttachments,
} from "./conversation-model";

const user = (id: string, name: string): TicketUser => ({
  id,
  name,
  email: `${id}@example.com`,
  tenant_kind: "SCHOOL",
  role: "",
});

const tunde = user("tunde", "Tunde Adebayo");
const ada = user("ada", "Ada Okoye");

const comment = (
  id: string,
  author: TicketUser,
  created_at: string,
): TicketComment => ({
  id,
  author,
  body: `Message ${id}`,
  visibility: "PUBLIC",
  attachments: [],
  created_at,
  updated_at: created_at,
});

const attachment = (
  id: string,
  uploaded_by: TicketUser,
  created_at: string,
): TicketAttachment => ({
  id,
  uploaded_by,
  created_at,
  original_filename: `${id}.pdf`,
  content_type: "application/pdf",
  size: 100,
  url: `/media/${id}.pdf`,
  comment_id: null,
});

describe("support conversation grouping", () => {
  it("shows one sender heading for consecutive messages on the same day", () => {
    const days = buildConversationDays([
      comment("1", tunde, "2026-09-19T08:00:00Z"),
      comment("2", tunde, "2026-09-19T08:05:00Z"),
      comment("3", ada, "2026-09-19T08:06:00Z"),
      comment("4", tunde, "2026-09-19T08:07:00Z"),
    ], []);

    expect(days).toHaveLength(1);
    expect(days[0].groups.map((group) => group.items.length)).toEqual([2, 1, 1]);
    expect(days[0].groups.map((group) => group.author.name))
      .toEqual(["Tunde Adebayo", "Ada Okoye", "Tunde Adebayo"]);
  });

  it("starts a new sender group when the date changes", () => {
    const days = buildConversationDays([
      comment("1", tunde, "2026-09-19T12:00:00Z"),
      comment("2", tunde, "2026-09-20T12:00:00Z"),
    ], []);

    expect(days).toHaveLength(2);
    expect(days[0].groups).toHaveLength(1);
    expect(days[1].groups).toHaveLength(1);
  });

  it("keeps the opening upload batch separate from later conversation files", () => {
    const before = attachment("before", tunde, "2026-09-19T08:02:00Z");
    const after = attachment("after", tunde, "2026-09-19T09:00:00Z");
    const files = partitionTicketAttachments(
      [before, after],
      "2026-09-19T08:00:00Z",
    );
    const days = buildConversationDays([], files.conversation);

    expect(files.initial.map((file) => file.id)).toEqual(["before"]);
    expect(days[0].groups[0].author.name).toBe("Tunde Adebayo");
    expect(days[0].groups[0].items[0].kind).toBe("attachment");
  });

  it("keeps a slow multi-file opening upload together while its files remain contiguous", () => {
    const files = partitionTicketAttachments([
      attachment("one", tunde, "2026-09-19T08:04:00Z"),
      attachment("two", tunde, "2026-09-19T08:08:00Z"),
      attachment("later", tunde, "2026-09-19T08:20:00Z"),
    ], "2026-09-19T08:00:00Z");

    expect(files.initial.map((file) => file.id)).toEqual(["one", "two"]);
    expect(files.conversation.map((file) => file.id)).toEqual(["later"]);
  });
});

describe("conversationCommentBody", () => {
  it("posts the trimmed words when there are any", () => {
    expect(conversationCommentBody("  Tried the other socket.  ", true)).toBe(
      "Tried the other socket.",
    );
  });

  it("gives a file sent on its own a message to sit inside", () => {
    expect(conversationCommentBody("   ", true)).toBe("Shared a file.");
  });

  it("posts nothing when there are neither words nor a file", () => {
    expect(conversationCommentBody("", false)).toBe("");
  });
});
