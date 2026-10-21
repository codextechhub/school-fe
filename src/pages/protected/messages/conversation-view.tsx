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
  THREAD_POLL_MS,
  conversationExportPath,
  useGetConversationMessagesQuery,
  useGetConversationQuery,
  useLazyGetConversationMessagesQuery,
  useMarkReadMutation,
  useReplyToBroadcastMutation,
  useSendMessageMutation,
} from "@/redux/services/messages/messages-api";
import type { ChatMessage, ConversationDetail } from "@/redux/services/messages/messages-types";
import { useAppSelector } from "@/redux/store";
import { downloadAuthorisedFile } from "@/utils/attachment-download";

import { ConversationAvatar } from "./conversation-avatar";
import { MessageComposer } from "./message-composer";
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

const PAGE = 50;

/**
 * One open conversation: its head, its thread and the way to answer it.
 *
 * The newest page of the thread refreshes while the tab is in front; earlier
 * pages are fetched on request with the `before` cursor and kept apart, so a
 * refresh never throws away what the reader scrolled back to read. Opening a
 * conversation, and each newer message after it, moves the read mark.
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

  const latest = useGetConversationMessagesQuery(
    { id, limit: PAGE },
    { pollingInterval: THREAD_POLL_MS, skipPollingIfUnfocused: true, refetchOnFocus: true },
  );
  const [fetchOlder, olderState] = useLazyGetConversationMessagesQuery();
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<{ before: number | null; hasMore: boolean } | null>(null);

  const [sendMessage] = useSendMessageMutation();
  const [replyPrivately] = useReplyToBroadcastMutation();
  const [markRead] = useMarkReadMutation();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const page = latest.data?.data;
  const messages = mergeThread(older, page?.results ?? []);
  const hasMore = cursor ? cursor.hasMore : (page?.has_more ?? false);
  const before = cursor ? cursor.before : (page?.next_before ?? null);

  const newest = page?.results[0];
  const marked = useRef(0);
  useEffect(() => {
    if (!newest || !conversation) return;
    if (newest.id <= marked.current) return;
    const first = marked.current === 0;
    marked.current = newest.id;
    if (!first && newest.mine) return;
    void markRead({ id, up_to: newest.id });
  }, [newest, conversation, id, markRead]);

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
      <div className="grid h-full content-center justify-items-center gap-3 p-6 text-center">
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
            label="Follow up on this broadcast"
            send={async (body, clientToken) => {
              await sendMessage({ id, body, client_token: clientToken }).unwrap();
            }}
          />
        ) : null}
      </>
    ) : !conversation.can_send ? (
      <Notice>{conversation.read_only_reason || READ_ONLY_FALLBACK}</Notice>
    ) : bodyHidden || !writes("body") ? (
      <Notice>{CANNOT_SEND_COPY}</Notice>
    ) : (
      <MessageComposer
        send={async (body, clientToken) => {
          await sendMessage({ id, body, client_token: clientToken }).unwrap();
        }}
      />
    )
  ) : null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <header className="flex min-w-0 items-center gap-2 border-b border-border bg-white px-3 py-2.5">
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
      />

      {footer}

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
