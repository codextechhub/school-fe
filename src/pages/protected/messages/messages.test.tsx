import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import type {
  ChatMessage,
  ConversationDetail,
  ConversationRow,
  OversightRow,
  StaffContact,
} from "@/redux/services/messages/messages-types";

/**
 * The staff Messages screens.
 *
 * Bright Star School's form teacher, Adaeze Okafor, reads her inbox: a parent
 * conversation about Tunde Bello of JSS1 A, the JSS1 form teachers group and a
 * staff broadcast. Every row follows Field Access on `school.messages`: a
 * hidden preview, name, child line, time or unread badge leaves the row, a
 * read-only Message turns the composer into a sentence, and the compose
 * drawers explain what a role cannot do rather than offering a control the
 * server would refuse.
 */
const PARENT_ROW: ConversationRow = {
  id: 41,
  kind: "FAMILY",
  kind_label: "Parent",
  title: "",
  display_name: "Mrs Funke Bello",
  counterpart: { user_id: 88, name: "Mrs Funke Bello", label: "Mother of Tunde Bello" },
  child: { id: 12, name: "Tunde Bello", class_name: "JSS1 A" },
  member_count: 2,
  last_message: {
    id: 903,
    preview: "Good morning, Tunde will be late",
    sender_name: "Mrs Funke Bello",
    sent_at: "2026-10-21T08:30:00Z",
    mine: false,
  },
  last_activity_at: "2026-10-21T08:30:00Z",
  unread_count: 2,
  reply_mode: "",
  read_only: false,
  can_send: true,
  read_only_reason: "",
  role: "STAFF",
};
const GROUP_ROW: ConversationRow = {
  id: 52,
  kind: "GROUP",
  kind_label: "Group",
  title: "JSS1 form teachers",
  display_name: "JSS1 form teachers",
  counterpart: null,
  child: null,
  member_count: 6,
  last_message: { id: 910, preview: "Term dates are out", sender_name: "Kemi Bello", sent_at: "2026-10-20T10:00:00Z", mine: false },
  last_activity_at: "2026-10-20T10:00:00Z",
  unread_count: 0,
  read_only: false,
  can_send: true,
  read_only_reason: "",
  role: "OWNER",
  branch: { id: 3, name: "Ikeja Branch" },
};

let fieldAccess: FieldAccessMap = {};
let held = new Set<string>();
let inboxRows: ConversationRow[] = [PARENT_ROW, GROUP_ROW];
let detail: ConversationDetail | undefined;
let thread: ChatMessage[] = [];
const contacts: StaffContact[] = [
  { user_id: 21, name: "Kemi Bello", label: "Teacher" },
  { user_id: 22, name: "Chinedu Eze", label: "Bursar" },
];
let oversightRows: OversightRow[] = [];
let branchLens = { applies: false, canChoose: false, wholeSchool: true, pinnedBranch: null as number | null };
const calls = {
  send: vi.fn(),
  reply: vi.fn(),
  start: vi.fn(),
  createGroup: vi.fn(),
  broadcast: vi.fn(),
  markRead: vi.fn(),
  inbox: [] as Array<{ args: unknown; skip?: boolean }>,
};
const ok = (data: unknown = { id: 99 }) => ({ unwrap: () => Promise.resolve({ success: true, message: "", data }) });

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: (code: string) => held.has(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => held.has(code)),
    hasAllPermissions: (...codes: string[]) => codes.every((code) => held.has(code)),
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({
  useBranchLens: () => ({
    ...branchLens,
    choices: [
      { id: 3, name: "Ikeja Branch" },
      { id: 4, name: "Lekki Branch" },
    ],
    allLabel: "All branches",
  }),
}));
vi.mock("@/redux/store", () => ({
  useAppSelector: () => ({ id: 7 }),
  useAppDispatch: () => vi.fn(),
}));
vi.mock("@/redux/services/messages/messages-api", () => {
  const empty = { data: undefined, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() };
  const pagination = { currentPage: 1, pageSize: 20, totalItems: 2, totalPages: 1, next: null, previous: null };
  return {
    THREAD_POLL_MS: 15000,
    UNREAD_POLL_MS: 60000,
    conversationExportPath: (id: number) => `/v1/messages/conversations/${id}/export/`,
    useGetInboxQuery: (args: unknown, options?: { skip?: boolean }) => {
      calls.inbox.push({ args, skip: options?.skip });
      return { ...empty, data: options?.skip ? undefined : { data: inboxRows, pagination } };
    },
    useGetConversationQuery: () => ({ ...empty, data: detail ? { data: detail } : undefined }),
    useGetConversationMessagesQuery: () => ({
      ...empty,
      data: { data: { results: [...thread].reverse(), has_more: false, next_before: null } },
    }),
    useLazyGetConversationMessagesQuery: () => [vi.fn(), { isFetching: false }],
    useGetOversightListQuery: () => ({
      ...empty,
      data: { data: oversightRows, pagination: { ...pagination, totalItems: oversightRows.length } },
    }),
    useGetOversightConversationQuery: () => ({ ...empty, data: detail ? { data: detail } : undefined }),
    useGetOversightMessagesQuery: () => ({
      ...empty,
      data: { data: { results: [...thread].reverse(), has_more: false, next_before: null } },
    }),
    useLazyGetOversightMessagesQuery: () => [vi.fn(), { isFetching: false }],
    useGetStaffContactsQuery: () => ({ ...empty, data: { data: contacts, pagination } }),
    useGetFamilyContactsQuery: () => ({
      ...empty,
      data: {
        data: [
          {
            student: { id: 12, name: "Tunde Bello", class_name: "JSS1 A" },
            guardians: [
              { id: 5, name: "Mrs Funke Bello", relationship: "Mother", has_account: true },
              { id: 6, name: "Mr Seun Bello", relationship: "Father", has_account: false },
            ],
            pupil_has_account: true,
          },
        ],
        pagination,
      },
    }),
    useGetUnreadCountQuery: () => empty,
    useSendMessageMutation: () => [calls.send, { isLoading: false }],
    useReplyToBroadcastMutation: () => [calls.reply, { isLoading: false }],
    useStartConversationMutation: () => [calls.start, { isLoading: false }],
    useCreateGroupMutation: () => [calls.createGroup, { isLoading: false }],
    useSendBroadcastMutation: () => [calls.broadcast, { isLoading: false }],
    useMarkReadMutation: () => [calls.markRead, { isLoading: false }],
    useRenameGroupMutation: () => [vi.fn(), { isLoading: false }],
    useAddGroupMembersMutation: () => [vi.fn(), { isLoading: false }],
    useRemoveGroupMemberMutation: () => [vi.fn(), { isLoading: false }],
    useMakeGroupOwnerMutation: () => [vi.fn(), { isLoading: false }],
  };
});

import { ConversationView } from "./conversation-view";
import { MessageComposer } from "./message-composer";
import MessagesPage from "./index";
import { listTime } from "./messages-copy";
import { NewBroadcastDrawer } from "./new-broadcast-drawer";
import { NewGroupDrawer } from "./new-group-drawer";
import { NewMessageDrawer } from "./new-message-drawer";
import MessageOversightPage from "./oversight";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MESSAGES = FIELD_RESOURCE.MESSAGES;
const buttons = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).filter(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement[];
const text = () => document.body.textContent ?? "";

async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const submit = async (form: HTMLFormElement | null) =>
  act(async () => {
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

describe("messages screens", () => {
  let container: HTMLDivElement;
  let root: Root;
  const render = (node: React.ReactNode) => act(async () => root.render(node));
  const renderPage = (entry = "/messages") =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/messages" element={<MessagesPage />}>
            <Route path=":id" />
          </Route>
          <Route path="/messages/oversight" element={<MessageOversightPage />}>
            <Route path=":id" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    for (const fn of [calls.send, calls.reply, calls.start, calls.createGroup, calls.broadcast, calls.markRead]) {
      fn.mockReset();
      fn.mockReturnValue(ok());
    }
    calls.inbox = [];
    held = new Set([P.VIEW_MESSAGES, P.SEND_MESSAGES]);
    inboxRows = [PARENT_ROW, GROUP_ROW];
    detail = undefined;
    thread = [];
    oversightRows = [];
    branchLens = { applies: false, canChoose: false, wholeSchool: true, pinnedBranch: null };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    fieldAccess = {};
  });

  describe("the inbox", () => {
    it("shows the name, child, preview, unread count and branch each row carries", async () => {
      await renderPage();

      const parent = document.querySelector('[aria-label^="Open Mrs Funke Bello"]');
      expect(parent?.textContent).toContain("About Tunde Bello, JSS1 A");
      expect(parent?.textContent).toContain("Good morning, Tunde will be late");
      expect(parent?.textContent).toContain("2");
      expect(parent?.getAttribute("aria-label")).toContain("2 unread");
      const group = document.querySelector('[aria-label="Open JSS1 form teachers"]');
      expect(group?.textContent).toContain("Ikeja Branch");
      expect(parent?.textContent).not.toContain("Ikeja Branch");
    });

    it("draws no unread badge and no Unread filter where Read status is hidden", async () => {
      fieldAccess = { [MESSAGES]: { hidden: ["read_status"], read_only: [] } };
      await renderPage();

      const parent = document.querySelector('[aria-label^="Open Mrs Funke Bello"]');
      expect(parent?.getAttribute("aria-label")).not.toContain("unread");
      expect(buttons("Unread")).toHaveLength(0);
      expect(document.querySelector('[role="alert"]')).toBeNull();
    });

    it("never asks for the unread filter once Read status is hidden", async () => {
      fieldAccess = { [MESSAGES]: { hidden: ["read_status"], read_only: [] } };
      await renderPage();

      const asked = calls.inbox.map((entry) => entry.args as { unread?: boolean });
      expect(asked.every((args) => args.unread === false)).toBe(true);
    });

    it("leaves the preview out where Message is hidden", async () => {
      fieldAccess = { [MESSAGES]: { hidden: ["body"], read_only: [] } };
      await renderPage();

      expect(text()).not.toContain("Good morning, Tunde will be late");
      expect(text()).not.toContain("Term dates are out");
      expect(document.querySelector('[aria-label^="Open Mrs Funke Bello"]')).toBeTruthy();
    });

    it("puts plain labels in place of names the role may not read", async () => {
      fieldAccess = { [MESSAGES]: { hidden: ["participants", "title"], read_only: [] } };
      await renderPage();

      expect(text()).not.toContain("Mrs Funke Bello");
      expect(text()).not.toContain("JSS1 form teachers");
      expect(document.querySelector('[aria-label^="Open Parent"]')).toBeTruthy();
      expect(document.querySelector('[aria-label="Open Group"]')).toBeTruthy();
    });

    it("leaves the child line out where the pupil is hidden and the times out where Sent times are", async () => {
      fieldAccess = { [MESSAGES]: { hidden: ["child", "sent_at"], read_only: [] } };
      await renderPage();

      const parent = document.querySelector('[aria-label^="Open Mrs Funke Bello"]');
      expect(parent?.textContent).not.toContain("Tunde Bello");
      expect(parent?.textContent).not.toContain(listTime("2026-10-21T08:30:00Z"));
    });

    it("offers New and Oversight only to a role that holds a key for them", async () => {
      held = new Set([P.VIEW_MESSAGES]);
      await renderPage();
      expect(buttons("New")).toHaveLength(0);
      expect(document.body.querySelector('a[href="/messages/oversight"]')).toBeNull();

      held = new Set([P.VIEW_MESSAGES, P.SEND_MESSAGES, P.INSPECT_BROADCASTS]);
      await renderPage();
      expect(buttons("New").length).toBeGreaterThan(0);
      expect(document.body.querySelector('a[href="/messages/oversight"]')).toBeTruthy();
    });

    it("opens the New message drawer from the address only for a role that may start one", async () => {
      held = new Set([P.VIEW_MESSAGES]);
      await renderPage("/messages?action=new");
      expect(text()).not.toContain("Send message");
    });

    it("opens the New message drawer from the address for a role that may", async () => {
      await renderPage("/messages?action=new");
      expect(text()).toContain("Send message");
    });

    it("shows the access-denied screen without the inbox key", async () => {
      held = new Set();
      await renderPage();
      expect(text()).toContain("Access Denied");
    });

    it("gives a phone the conversation alone once one is open", async () => {
      detail = { ...PARENT_ROW };
      await renderPage("/messages/41");

      const list = document.querySelector('[aria-label="Conversations"]');
      expect(list?.className).toContain("hidden");
      expect(list?.className).toContain("lg:flex");
      expect(document.querySelector('[aria-label="Back to messages"]')).toBeTruthy();
    });
  });

  describe("an open conversation", () => {
    const open = (extra: Partial<ConversationDetail> = {}) => {
      detail = { ...PARENT_ROW, ...extra };
      thread = [
        { id: 900, body: "Hello Mrs Bello", sender: { user_id: 7, name: "Adaeze Okafor" }, sent_at: "2026-10-21T08:00:00Z", mine: true },
        { id: 903, body: "Good morning, Tunde will be late", sender: { user_id: 88, name: "Mrs Funke Bello" }, sent_at: "2026-10-21T08:30:00Z", mine: false },
      ];
      return render(
        <ConversationView id={detail.id} onBack={() => {}} onOpenConversation={opened} onGone={() => {}} />,
      );
    };
    const opened = vi.fn();

    it("shows the thread oldest first and writes with a client token", async () => {
      await open();

      const body = text();
      expect(body.indexOf("Hello Mrs Bello")).toBeLessThan(body.indexOf("Good morning, Tunde will be late"));
      expect(body).toContain("About Tunde Bello, JSS1 A");
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Noted, thank you");
      await submit(document.querySelector("form"));

      expect(calls.send).toHaveBeenCalledTimes(1);
      const sent = calls.send.mock.calls[0][0] as { id: number; body: string; client_token: string };
      expect(sent).toMatchObject({ id: 41, body: "Noted, thank you" });
      expect(sent.client_token).toMatch(/[0-9a-f-]{8,}/);
    });

    it("marks the conversation read on open, up to the newest message", async () => {
      await open();
      expect(calls.markRead).toHaveBeenCalledWith({ id: 41, up_to: 903 });
    });

    it("shows the server's reason in place of the composer when it cannot be written to", async () => {
      await open({ can_send: false, read_only: true, read_only_reason: "Mrs Bello is no longer at the school." });

      expect(text()).toContain("Mrs Bello is no longer at the school.");
      expect(document.querySelector("textarea")).toBeNull();
    });

    it("tells a role whose Message is read-only that it cannot send, and never offers the box", async () => {
      fieldAccess = { [MESSAGES]: { hidden: [], read_only: ["body"] } };
      await open();

      expect(text()).toContain("Your role cannot send messages.");
      expect(document.querySelector("textarea")).toBeNull();
      expect(text()).toContain("Hello Mrs Bello");
    });

    it("replaces the thread with a sentence where Message is hidden", async () => {
      fieldAccess = { [MESSAGES]: { hidden: ["body"], read_only: [] } };
      await open();

      expect(text()).toContain("Your role cannot read message text.");
      expect(text()).not.toContain("Hello Mrs Bello");
      expect(text()).toContain("Your role cannot send messages.");
    });

    it("draws no clock or sender where Sent times and People are hidden", async () => {
      fieldAccess = { [MESSAGES]: { hidden: ["sent_at", "participants"], read_only: [] } };
      detail = { ...GROUP_ROW };
      thread = [
        { id: 1, body: "Term dates are out", sender: { user_id: 9, name: "Kemi Bello" }, sent_at: "2026-10-20T10:00:00Z", mine: false },
      ];
      await render(
        <ConversationView id={52} onBack={() => {}} onOpenConversation={opened} onGone={() => {}} />,
      );

      expect(text()).toContain("Term dates are out");
      expect(text()).not.toContain("Kemi Bello");
      expect(text()).not.toContain("Today");
      expect(text()).not.toContain("Yesterday");
    });

    it("offers a private reply on a broadcast that allows them and opens the conversation it makes", async () => {
      const BROADCAST: ConversationDetail = {
        id: 60,
        kind: "BROADCAST",
        display_name: "Staff meeting moved",
        title: "Staff meeting moved",
        member_count: 40,
        recipient_count: 40,
        reply_mode: "PRIVATE_REPLIES",
        read_only: false,
        can_send: false,
        read_only_reason: "",
        role: "RECIPIENT",
      };
      detail = BROADCAST;
      thread = [
        { id: 5, body: "Meeting is on Friday.", sender: { user_id: 3, name: "Adaeze Okafor" }, sent_at: "2026-10-21T07:00:00Z", mine: false },
      ];
      calls.reply.mockReturnValue(ok({ conversation: { id: 77 }, message: { id: 8 } }));
      await render(
        <ConversationView id={60} onBack={() => {}} onOpenConversation={opened} onGone={() => {}} />,
      );

      expect(text()).toContain("Sent to 40 staff");
      expect(document.querySelector("textarea")).toBeNull();
      await act(async () => buttons("Reply privately to Adaeze Okafor")[0].click());
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "I will be there");
      await submit(document.querySelector("form"));

      expect(calls.reply).toHaveBeenCalledTimes(1);
      expect(calls.reply.mock.calls[0][0]).toMatchObject({ id: 60, body: "I will be there" });
      expect(opened).toHaveBeenCalledWith(77);
    });

    it("says plainly that a one-way broadcast takes no replies", async () => {
      detail = {
        id: 61,
        kind: "BROADCAST",
        display_name: "Fire drill",
        reply_mode: "ONE_WAY",
        recipient_count: 12,
        read_only: false,
        can_send: false,
        role: "RECIPIENT",
      };
      thread = [{ id: 6, body: "Fire drill at ten.", mine: false }];
      await render(
        <ConversationView id={61} onBack={() => {}} onOpenConversation={opened} onGone={() => {}} />,
      );

      expect(text()).toContain("This broadcast is one-way. Replies are turned off.");
      expect(buttons("Reply privately to the sender")).toHaveLength(0);
    });

    it("shows the sender the recipients list and the reply setting", async () => {
      detail = {
        id: 62,
        kind: "BROADCAST",
        display_name: "Exam timetable",
        reply_mode: "PRIVATE_REPLIES",
        recipient_count: 2,
        recipients: [
          { user_id: 21, name: "Kemi Bello", label: "Teacher" },
          { user_id: 22, name: "Chinedu Eze", label: "Bursar" },
        ],
        read_only: false,
        can_send: false,
        role: "SENDER",
      };
      thread = [{ id: 7, body: "Timetable attached.", mine: true }];
      await render(
        <ConversationView id={62} onBack={() => {}} onOpenConversation={opened} onGone={() => {}} />,
      );

      expect(text()).toContain("Replies allowed");
      expect(text()).toContain("Replies to this broadcast reach you as private conversations");
      await act(async () => buttons("Recipients")[0].click());
      expect(text()).toContain("Kemi Bello");
      expect(text()).toContain("Chinedu Eze");
    });

    it("keeps the group owner's controls to a role that may change the members", async () => {
      detail = {
        ...GROUP_ROW,
        participants: [
          { user_id: 7, name: "Adaeze Okafor", role: "OWNER" },
          { user_id: 21, name: "Kemi Bello", role: "MEMBER" },
        ],
      };
      thread = [{ id: 1, body: "Hello", mine: true }];
      const view = () => (
        <ConversationView id={52} onBack={() => {}} onOpenConversation={opened} onGone={() => {}} />
      );
      await render(view());
      await act(async () => buttons("People")[0].click());
      expect(document.querySelector('[aria-label="Remove Kemi Bello"]')).toBeTruthy();
      expect(document.querySelector('[aria-label="Make Kemi Bello an owner"]')).toBeTruthy();
      expect(document.querySelector("#group-name")).toBeTruthy();
    });

    it("withdraws the member and name controls where People and Group name are read-only", async () => {
      fieldAccess = { [MESSAGES]: { hidden: [], read_only: ["participants", "title"] } };
      detail = {
        ...GROUP_ROW,
        participants: [
          { user_id: 7, name: "Adaeze Okafor", role: "OWNER" },
          { user_id: 21, name: "Kemi Bello", role: "MEMBER" },
        ],
      };
      thread = [{ id: 1, body: "Hello", mine: true }];
      await render(
        <ConversationView id={52} onBack={() => {}} onOpenConversation={opened} onGone={() => {}} />,
      );
      await act(async () => buttons("People")[0].click());

      expect(text()).toContain("Kemi Bello");
      expect(document.querySelector('[aria-label="Remove Kemi Bello"]')).toBeNull();
      expect(document.querySelector("#group-name")).toBeNull();
      expect(text()).not.toContain("Add people");
      expect(text()).toContain("Your role cannot change who is in this group.");
      expect(buttons("Leave group")).toHaveLength(1);
    });
  });

  describe("the composer", () => {
    it("reuses the token when the same words are sent again after a failure", async () => {
      const send = vi
        .fn<(body: string, token: string) => Promise<void>>()
        .mockRejectedValueOnce({ status: 500, data: { message: "Try later" } })
        .mockResolvedValueOnce(undefined);
      await render(<MessageComposer send={send} />);

      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Same words");
      await submit(document.querySelector("form"));
      expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Same words");
      await submit(document.querySelector("form"));

      expect(send).toHaveBeenCalledTimes(2);
      expect(send.mock.calls[0][1]).toBe(send.mock.calls[1][1]);
      expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");
    });

    it("keeps the draft and token when the server says the send limit is reached, and lets Send work again", async () => {
      const sentence = "You are sending messages too quickly. Wait a moment and try again.";
      const send = vi
        .fn<(body: string, token: string) => Promise<void>>()
        .mockRejectedValueOnce({
          status: 429,
          data: {
            success: false,
            message: sentence,
            error: { code: "MESSAGE_RATE_LIMITED", detail: { retry_after: 12 } },
          },
        })
        .mockResolvedValueOnce(undefined);
      await render(<MessageComposer send={send} />);

      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Fees reminder");
      await submit(document.querySelector("form"));

      expect(document.querySelector('[role="alert"]')?.textContent).toBe(sentence);
      expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Fees reminder");
      expect(buttons("Send")[0].disabled).toBe(false);

      await submit(document.querySelector("form"));

      expect(send).toHaveBeenCalledTimes(2);
      expect(send.mock.calls[0][1]).toBe(send.mock.calls[1][1]);
      expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");
      expect(document.querySelector('[role="alert"]')).toBeNull();
    });

    it("starts a new token for new words", async () => {
      const send = vi.fn<(body: string, token: string) => Promise<void>>().mockResolvedValue(undefined);
      await render(<MessageComposer send={send} />);

      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "First");
      await submit(document.querySelector("form"));
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Second");
      await submit(document.querySelector("form"));

      expect(send.mock.calls[0][1]).not.toBe(send.mock.calls[1][1]);
    });

    it("sends once however many times Send is pressed while it is in flight", async () => {
      let finish: () => void = () => {};
      const send = vi.fn(
        () => new Promise<void>((resolve) => {
          finish = resolve;
        }),
      );
      await render(<MessageComposer send={send} />);

      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Tap tap");
      await submit(document.querySelector("form"));
      await submit(document.querySelector("form"));
      expect(send).toHaveBeenCalledTimes(1);
      await act(async () => finish());
    });

    it("counts characters only near the limit and refuses a message over it", async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      await render(<MessageComposer send={send} />);

      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "x".repeat(100));
      expect(text()).not.toContain("of 4000");
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "x".repeat(3700));
      expect(text()).toContain("3700 of 4000");
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "x".repeat(4001));
      expect(buttons("Send")[0].disabled).toBe(true);
      await submit(document.querySelector("form"));
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe("the compose drawers", () => {
    it("starts a conversation with a colleague", async () => {
      await render(<NewMessageDrawer canStaff canFamily={false} onClose={() => {}} onOpened={() => {}} />);

      await act(async () => (document.querySelector('[role="radio"]') as HTMLButtonElement).click());
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Can we meet at 2?");
      await act(async () => buttons("Send message")[0].click());

      expect(calls.start).toHaveBeenCalledTimes(1);
      expect(calls.start.mock.calls[0][0]).toMatchObject({
        kind: "STAFF_DIRECT",
        recipient: 21,
        body: "Can we meet at 2?",
      });
    });

    it("shows a guardian with no account disabled, with the reason", async () => {
      await render(<NewMessageDrawer canStaff={false} canFamily onClose={() => {}} onOpened={() => {}} />);

      const father = Array.from(document.querySelectorAll('[role="radio"]')).find((el) =>
        el.textContent?.includes("Mr Seun Bello"),
      ) as HTMLButtonElement;
      expect(father.disabled).toBe(true);
      expect(father.textContent).toContain("No parent app account");
    });

    it("starts a parent conversation about the pupil", async () => {
      await render(<NewMessageDrawer canStaff={false} canFamily onClose={() => {}} onOpened={() => {}} />);

      const mother = Array.from(document.querySelectorAll('[role="radio"]')).find((el) =>
        el.textContent?.includes("Mrs Funke Bello"),
      ) as HTMLButtonElement;
      await act(async () => mother.click());
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Tunde did well today");
      await act(async () => buttons("Send message")[0].click());

      expect(calls.start.mock.calls[0][0]).toMatchObject({
        kind: "FAMILY",
        student: 12,
        guardian: 5,
        body: "Tunde did well today",
      });
    });

    it("explains that a role which cannot name the pupil cannot start a family conversation", async () => {
      fieldAccess = { [MESSAGES]: { hidden: [], read_only: ["child"] } };
      await render(<NewMessageDrawer canStaff={false} canFamily onClose={() => {}} onOpened={() => {}} />);

      expect(text()).toContain("cannot name the pupil");
      expect(document.querySelector('[aria-label="Search pupils"]')).toBeNull();
      expect(buttons("Send message")[0].disabled).toBe(true);
    });

    it("replaces the box with a sentence where Message is read-only", async () => {
      fieldAccess = { [MESSAGES]: { hidden: [], read_only: ["body"] } };
      await render(<NewMessageDrawer canStaff canFamily={false} onClose={() => {}} onOpened={() => {}} />);

      expect(text()).toContain("Your role cannot send messages.");
      expect(document.querySelector("textarea")).toBeNull();
      expect(buttons("Send message")[0].disabled).toBe(true);
    });

    it("offers the group's name and members whatever the switches say, and no branch at a one-branch school", async () => {
      fieldAccess = {
        [MESSAGES]: { hidden: [], read_only: ["title", "participants"], open_on_create: ["title", "participants"] },
      };
      await render(<NewGroupDrawer onClose={() => {}} onOpened={() => {}} />);

      const name = document.querySelector('input[placeholder^="e.g."]') as HTMLInputElement;
      expect(name.disabled).toBe(false);
      expect(document.querySelector('[aria-label="Search colleagues"]')).toBeTruthy();
      expect(document.querySelector("select")).toBeNull();

      await typeInto(name, "JSS1 form teachers");
      await act(async () => (document.querySelector('[role="checkbox"]') as HTMLButtonElement).click());
      await act(async () => buttons("Create group")[0].click());
      expect(calls.createGroup.mock.calls[0][0]).toMatchObject({
        name: "JSS1 form teachers",
        branch: null,
        members: [21],
      });
    });

    it("asks which branch a group belongs to only where there is a choice", async () => {
      branchLens = { applies: true, canChoose: true, wholeSchool: true, pinnedBranch: null };
      await render(<NewGroupDrawer onClose={() => {}} onOpened={() => {}} />);

      const select = document.querySelector("select") as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
        "All branches",
        "Ikeja Branch",
        "Lekki Branch",
      ]);
    });

    it("files a branch-bound reader's group under their one branch without asking", async () => {
      branchLens = { applies: true, canChoose: false, wholeSchool: false, pinnedBranch: 3 };
      await render(<NewGroupDrawer onClose={() => {}} onOpened={() => {}} />);

      expect(document.querySelector("select")).toBeNull();
      await typeInto(document.querySelector('input[placeholder^="e.g."]') as HTMLInputElement, "Ikeja heads");
      await act(async () => (document.querySelector('[role="checkbox"]') as HTMLButtonElement).click());
      await act(async () => buttons("Create group")[0].click());
      expect(calls.createGroup.mock.calls[0][0]).toMatchObject({ branch: 3 });
    });

    it("sends a broadcast with the chosen reply setting and every recipient shown", async () => {
      await render(<NewBroadcastDrawer onClose={() => {}} onOpened={() => {}} />);

      expect(text()).toContain("One-way: recipients read it and cannot reply");
      expect(text()).toContain(
        "Replies allowed: each reply comes to you privately; other recipients never see it",
      );
      await typeInto(document.querySelector('input[placeholder^="e.g."]') as HTMLInputElement, "Staff meeting");
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Friday at 2pm.");
      const replies = Array.from(document.querySelectorAll('[role="radio"]')).find((el) =>
        el.closest("label")?.textContent?.includes("Replies allowed"),
      ) as HTMLButtonElement;
      await act(async () => replies.click());
      await act(async () => buttons("Select all shown")[0].click());
      await act(async () => buttons("Send broadcast")[0].click());

      expect(calls.broadcast.mock.calls[0][0]).toMatchObject({
        title: "Staff meeting",
        body: "Friday at 2pm.",
        reply_mode: "PRIVATE_REPLIES",
        recipients: [21, 22],
        branch: null,
      });
      expect(calls.broadcast.mock.calls[0][0].client_token).toBeTruthy();
    });

    it("leaves the reply setting out and goes one-way where the role cannot set it", async () => {
      fieldAccess = { [MESSAGES]: { hidden: [], read_only: ["reply_mode"] } };
      await render(<NewBroadcastDrawer onClose={() => {}} onOpened={() => {}} />);

      expect(document.querySelectorAll('[role="radio"]').length).toBe(0);
      expect(text()).toContain("goes out one-way");
      await typeInto(document.querySelector('input[placeholder^="e.g."]') as HTMLInputElement, "Notice");
      await typeInto(document.querySelector("textarea") as HTMLTextAreaElement, "Read this.");
      await act(async () => buttons("Select all shown")[0].click());
      await act(async () => buttons("Send broadcast")[0].click());
      expect(calls.broadcast.mock.calls[0][0]).not.toHaveProperty("reply_mode");
    });

    it("cannot address a broadcast where Broadcast recipients is read-only", async () => {
      fieldAccess = { [MESSAGES]: { hidden: [], read_only: ["recipients"] } };
      await render(<NewBroadcastDrawer onClose={() => {}} onOpened={() => {}} />);

      expect(text()).toContain("cannot choose who a broadcast goes to");
      expect(document.querySelector('[aria-label="Search colleagues"]')).toBeNull();
      expect(buttons("Send broadcast")[0].disabled).toBe(true);
    });
  });

  describe("oversight", () => {
    const GROUP_OVERSIGHT: OversightRow = {
      id: 52,
      kind: "GROUP",
      display_name: "JSS1 form teachers",
      participants: ["Kemi Bello", "Chinedu Eze"],
      member_count: 6,
      message_count: 14,
      last_activity_at: "2026-10-20T10:00:00Z",
    };

    it("shows no tabs and no access to a role with none of the inspect keys", async () => {
      held = new Set([P.VIEW_MESSAGES]);
      await renderPage("/messages/oversight");
      expect(text()).toContain("Access Denied");
    });

    it("lists names and counts but no message text, one tab per key held", async () => {
      held = new Set([P.INSPECT_MESSAGE_GROUPS, P.INSPECT_PUPIL_CONVERSATIONS]);
      oversightRows = [GROUP_OVERSIGHT];
      await renderPage("/messages/oversight");

      const tabs = document.querySelector('[aria-label="What to inspect"]');
      expect(tabs?.textContent).toContain("Groups");
      expect(tabs?.textContent).toContain("Pupil conversations");
      expect(tabs?.textContent).not.toContain("Broadcasts");
      const row = document.querySelector('[aria-label="Inspect JSS1 form teachers"]');
      expect(row?.textContent).toContain("Kemi Bello, Chinedu Eze");
      expect(row?.textContent).toContain("14 messages");
    });

    it("explains who else can read pupil conversations", async () => {
      held = new Set([P.INSPECT_PUPIL_CONVERSATIONS]);
      await renderPage("/messages/oversight");
      expect(text()).toContain("Pupil conversations are also readable by each pupil's primary parent.");
    });

    it("opens a conversation read-only, with the audit banner and no box to write in", async () => {
      held = new Set([P.INSPECT_MESSAGE_GROUPS]);
      oversightRows = [GROUP_OVERSIGHT];
      detail = { ...GROUP_ROW, inspection: true, read_only: true };
      thread = [{ id: 1, body: "Term dates are out", sender: { user_id: 9, name: "Kemi Bello" }, mine: false }];
      await renderPage("/messages/oversight/52");

      expect(text()).toContain(
        "Read-only inspection. You are not a member, and opening this conversation is recorded in the audit trail.",
      );
      expect(text()).toContain("Term dates are out");
      expect(document.querySelector("textarea")).toBeNull();
      expect(calls.markRead).not.toHaveBeenCalled();
    });
  });
});
