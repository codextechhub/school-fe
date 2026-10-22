import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { selectUser } from "@/redux/features/auth/auth-slice";
import {
  conversationExportPath,
  useGetConversationMessagesQuery,
  useGetConversationQuery,
  useLazyGetConversationMessagesQuery,
  useMarkReadMutation,
  useReplyToBroadcastMutation,
  useSendMessageMutation,
} from "@/redux/services/messages/messages-api";
import type {
  ChatMessage,
  ConversationDetail,
  Receipt,
  ThreadUpdates,
} from "@/redux/services/messages/messages-types";
import { useAppSelector } from "@/redux/store";
import { downloadAuthorisedFile } from "@/utils/attachment-download";

import { ConversationAvatar } from "./conversation-avatar";
import { MessageComposer, type ComposerHandle, type OutboxStatus } from "./message-composer";
import { MessageThread } from "./message-thread";
import {
  CANNOT_SEND_COPY,
  ONE_WAY_COPY,
  READ_ONLY_FALLBACK,
  childLine,
  displayNameFor,
  mergeThread,
} from "./messages-copy";
import { PeopleSheet } from "./people-sheet";
import { useMessageAccess } from "./use-message-access";
import { useThreadPoll } from "./use-thread-poll";

const PAGE = 50;

/**
 * One open conversation: its head, its thread and the way to answer it.
 *
 * The three are a fixed column that fills the pane it is placed in. The head
 * and the footer keep their height, only the thread scrolls, the head clears the
 * notch on a phone where it is the top of the screen, and the footer clears the
 * home bar.
 *
 * The newest page of the thread loads once; while the tab is in front the
 * conversation then asks the server every few seconds what changed since the
 * newest message held (`useThreadPoll`), which brings new messages and the
 * current receipts of the reader's own. Earlier pages are fetched on request
 * with the `before` cursor and kept apart, so nothing a refresh brings throws
 * away what the reader scrolled back to read.
 *
 * The read mark moves only to what the reader has seen: the newest message is
 * marked read while they are at the bottom of the thread, and a message that
 * arrives while they read higher up waits behind the New messages pill until
 * they scroll or tap down to it.
 *
 * With receipts on for the conversation and visible to the role, the reader's
 * own messages carry ticks, a message still being sent shows as a clock, and
 * one the server refused stays in the thread as Not sent with the draft kept in
 * the box, ready to retry with the same client token.
 *
 * What stands in place of the composer depends on the conversation. A
 * participant who may write sees the box. A broadcast recipient sees the
 * private-reply action, or a plain sentence that the broadcast is one-way. A
 * conversation the server marks read-only shows the server's reason. A role
 * whose Message switch is Read only, or hidden, is told it cannot send.
 */
export function ConversationView({
  id,
  onBack,
  onOpenConversation,
  onGone,
}: {
  id: number;
  onBack: () => void;
  onOpenConversation: (id: number) => void;
  onGone: () => void;
}) {
  const { hasPermission } = usePermissions();
  const me = useAppSelector(selectUser);
  const detailQuery = useGetConversationQuery(id);
  const conversation = detailQuery.data?.data;
  const { shows, writes } = useMessageAccess(conversation);

  const latest = useGetConversationMessagesQuery({ id, limit: PAGE });
  const [fetchOlder, olderState] = useLazyGetConversationMessagesQuery();
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [arrived, setArrived] = useState<ChatMessage[]>([]);
  const [polled, setPolled] = useState<Record<number, Receipt>>({});
  const [outbox, setOutbox] = useState<OutboxStatus>({ state: "idle" });
  const composer = useRef<ComposerHandle>(null);
  const [cursor, setCursor] = useState<{ before: number | null; hasMore: boolean } | null>(null);

  const [sendMessage] = useSendMessageMutation();
  const [replyPrivately] = useReplyToBroadcastMutation();
  const [markRead] = useMarkReadMutation();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const page = latest.data?.data;
  const ticks = conversation?.receipts === true && shows("read_receipts");
  const messages = mergeThread(older, arrived, page?.results ?? []).map((message) => {
    if (!message.mine) return message;
    if (!ticks) {
      const { receipt: _hidden, ...plain } = message;
      return plain;
    }
    return polled[message.id] ? { ...message, receipt: polled[message.id] } : message;
  });
  const hasMore = cursor ? cursor.hasMore : (page?.has_more ?? false);
  const before = cursor ? cursor.before : (page?.next_before ?? null);

  const held = useRef(messages);
  useEffect(() => {
    held.current = messages;
  });
  const marked = useRef(0);
  const onSeen = useCallback(
    (seenId: number) => {
      if (!conversation || seenId <= marked.current) return;
      const first = marked.current === 0;
      marked.current = seenId;
      if (!first && held.current.find((message) => message.id === seenId)?.mine) return;
      void markRead({ id, up_to: seenId });
    },
    [conversation, id, markRead],
  );

  const onUpdates = useCallback((updates: ThreadUpdates) => {
    if (updates.results.length > 0) setArrived((current) => mergeThread(current, updates.results));
    const fresh = updates.receipts;
    if (fresh) {
      setPolled((current) => {
        const next = { ...current };
        for (const { id: messageId, ...receipt } of fresh) next[messageId] = receipt;
        return next;
      });
    }
  }, []);
  useThreadPoll({
    id,
    newestId: messages[messages.length - 1]?.id ?? 0,
    enabled: Boolean(conversation) && page != null,
    onUpdates,
  });

  const loadOlder = useCallback(async () => {
    if (before == null) return;
    try {
      const result = await fetchOlder({ id, before, limit: PAGE }).unwrap();
      setOlder((current) => mergeThread(current, result.data.results));
      setCursor({ before: result.data.next_before, hasMore: result.data.has_more });
    } catch {
      toast.error("We could not load earlier messages. Try again.");
    }
  }, [before, fetchOlder, id]);

  if (detailQuery.isError && !conversation) {
    return (
      <div className="grid flex-1 content-center justify-items-center gap-3 p-6 text-center">
        <p className="text-sm font-semibold text-black-01">This conversation is not available</p>
        <p className="max-w-xs text-xs leading-5 text-gray-06">
          It may have been removed, or you may no longer be part of it.
        </p>
        <Button size="sm" variant="outline" onClick={onGone}>
          Back to messages
        </Button>
      </div>
    );
  }

  const bodyHidden = !shows("body");
  const sender = messages[0]?.sender?.name;
  const isBroadcast = conversation?.kind === "BROADCAST";
  const isRecipient = isBroadcast && conversation?.role === "RECIPIENT";
  const hasPeople =
    conversation?.kind === "GROUP" || (isBroadcast && conversation?.role === "SENDER") || isRecipient;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadAuthorisedFile(conversationExportPath(id), `conversation-${id}.csv`);
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "That file could not be downloaded.");
    } finally {
      setExporting(false);
    }
  };

  /** Sends into this thread and shows the stored message at once, receipt included. */
  const sendHere = async (body: string, clientToken: string) => {
    const result = await sendMessage({ id, body, client_token: clientToken }).unwrap();
    const stored = result.data;
    if (stored && typeof stored.body === "string") {
      setArrived((current) => mergeThread(current, [stored]));
    }
  };

  const footer = conversation ? (
    isRecipient ? (
      <BroadcastReply
        conversation={conversation}
        senderName={sender}
        canReply={hasPermission(P.SEND_MESSAGES)}
        bodyWritable={shows("body") && writes("body")}
        open={replying}
        onOpen={() => setReplying(true)}
        send={async (body, clientToken) => {
          const result = await replyPrivately({ id, body, client_token: clientToken }).unwrap();
          const opened = result.data.conversation?.id;
          if (opened != null) onOpenConversation(opened);
        }}
      />
    ) : isBroadcast ? (
      <>
        {conversation.reply_mode === "ONE_WAY" ? (
          <Notice>{ONE_WAY_COPY}</Notice>
        ) : conversation.reply_mode === "PRIVATE_REPLIES" ? (
          <Notice>Replies to this broadcast reach you as private conversations in your inbox.</Notice>
        ) : null}
        {conversation.can_send && shows("body") && writes("body") ? (
          <MessageComposer
            ref={composer}
            label="Follow up on this broadcast"
            send={sendHere}
            onStatus={setOutbox}
          />
        ) : null}
      </>
    ) : !conversation.can_send ? (
      <Notice>{conversation.read_only_reason || READ_ONLY_FALLBACK}</Notice>
    ) : bodyHidden || !writes("body") ? (
      <Notice>{CANNOT_SEND_COPY}</Notice>
    ) : (
      <MessageComposer ref={composer} send={sendHere} onStatus={setOutbox} />
    )
  ) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex min-w-0 shrink-0 items-center gap-2 border-b border-border bg-white px-3 py-2.5 max-lg:pt-[calc(0.625rem+env(safe-area-inset-top))]">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 lg:hidden"
          aria-label="Back to messages"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        {conversation ? (
          <>
            <ConversationAvatar
              kind={conversation.kind}
              name={shows("participants") ? conversation.display_name : undefined}
            />
            <ConversationHead conversation={conversation} shows={shows} />
            <div className="flex shrink-0 items-center gap-1">
              {hasPeople ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPeopleOpen(true)}
                >
                  <Users aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {conversation.kind === "GROUP" ? "People" : isRecipient ? "Details" : "Recipients"}
                  </span>
                </Button>
              ) : null}
              {hasPermission(P.EXPORT_MESSAGES) && !bodyHidden ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Download this conversation"
                  title="Download this conversation"
                  disabled={exporting}
                  onClick={() => void exportCsv()}
                >
                  <Download aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3" aria-label="Loading conversation">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        )}
      </header>

      <MessageThread
        messages={messages}
        loading={latest.isLoading}
        failed={latest.isError}
        hasMore={hasMore}
        loadingOlder={olderState.isFetching}
        onLoadOlder={() => void loadOlder()}
        onRetry={() => latest.refetch()}
        showSender={
          (conversation?.kind === "GROUP" || conversation?.kind === "BROADCAST") &&
          shows("participants")
        }
        showTimes={shows("sent_at")}
        bodyHidden={bodyHidden}
        receipts={ticks}
        withCount={conversation?.kind === "GROUP" || conversation?.kind === "BROADCAST"}
        outbox={
          outbox.state === "idle"
            ? null
            : { body: outbox.body, state: outbox.state, onRetry: () => composer.current?.retry() }
        }
        onSeen={onSeen}
      />

      {footer ? <div className="shrink-0 bg-white pb-[env(safe-area-inset-bottom)]">{footer}</div> : null}

      {peopleOpen && conversation ? (
        <PeopleSheet
          conversation={conversation}
          myUserId={me?.id ?? null}
          onClose={() => setPeopleOpen(false)}
          onLeft={() => {
            setPeopleOpen(false);
            onGone();
          }}
        />
      ) : null}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-border bg-white px-4 py-3 text-center text-sm text-gray-06">
      {children}
    </p>
  );
}

/**
 * The line under a conversation's name: what it is about, how big it is, and
 * where it belongs. Each part is shown only when the server sent it, so a field
 * hidden by Field Access leaves no stand-in.
 */
function ConversationHead({
  conversation,
  shows,
}: {
  conversation: ConversationDetail;
  shows: ReturnType<typeof useMessageAccess>["shows"];
}) {
  const name = displayNameFor(conversation.kind, conversation.display_name, shows);
  const about = shows("child") ? childLine(conversation.child) : "";
  const parts: string[] = [];
  if (about) parts.push(about);
  else if (conversation.kind_label) parts.push(conversation.kind_label);
  if (conversation.kind === "GROUP" && conversation.member_count != null) {
    parts.push(`${conversation.member_count} people`);
  }
  if (conversation.kind === "BROADCAST" && conversation.recipient_count != null && shows("recipients")) {
    parts.push(`Sent to ${conversation.recipient_count} staff`);
  }
  if (conversation.kind === "BROADCAST" && conversation.reply_mode && shows("reply_mode")) {
    parts.push(conversation.reply_mode === "ONE_WAY" ? "One-way" : "Replies allowed");
  }
  return (
    <div className="min-w-0 flex-1">
      <h2 className="break-words font-mont text-sm font-semibold leading-5 text-black-01">{name}</h2>
      {parts.length > 0 || conversation.branch ? (
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-06">
          {parts.length > 0 ? <span className="break-words">{parts.join(" · ")}</span> : null}
          {conversation.branch ? (
            <span
              className={cn(
                "rounded-full bg-pry-01 px-2 py-0.5 text-[11px] font-medium text-primary",
              )}
            >
              {conversation.branch.name}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * What a broadcast's recipient can do about it.
 *
 * A one-way broadcast says so plainly. Where replies are allowed, **Reply
 * privately** opens a box whose answer goes to the sender alone, in a
 * conversation of its own that opens when it is sent; no other recipient sees
 * it. When the reply setting is hidden by Field Access the action is still
 * offered, and the server's sentence answers a one-way broadcast.
 */
function BroadcastReply({
  conversation,
  senderName,
  canReply,
  bodyWritable,
  open,
  onOpen,
  send,
}: {
  conversation: ConversationDetail;
  senderName?: string;
  canReply: boolean;
  bodyWritable: boolean;
  open: boolean;
  onOpen: () => void;
  send: (body: string, clientToken: string) => Promise<unknown>;
}) {
  if (conversation.reply_mode === "ONE_WAY") return <Notice>{ONE_WAY_COPY}</Notice>;
  if (!canReply || !bodyWritable) return <Notice>{CANNOT_SEND_COPY}</Notice>;
  if (!open) {
    return (
      <div className="flex justify-center border-t border-border bg-white p-3">
        <Button type="button" onClick={onOpen}>
          Reply privately to {senderName || "the sender"}
        </Button>
      </div>
    );
  }
  return (
    <MessageComposer
      send={send}
      autoFocus
      label={`Reply privately to ${senderName || "the sender"}`}
      submitLabel="Send reply"
    />
  );
}
