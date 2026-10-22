import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/redux/services/messages/messages-types";

import { CANNOT_READ_COPY, bubbleTime, dayLabel, dayOf, tickStateOf } from "./messages-copy";
import { MessageTicks } from "./message-ticks";

/** A message the reader has written that the server has not yet stored. */
export type OutboxEntry = { body: string; state: "sending" | "failed"; onRetry: () => void };

/** How close to the bottom still counts as reading the newest message. */
const NEAR_BOTTOM_PX = 72;

/**
 * The messages of one conversation, oldest at the top and newest at the bottom.
 *
 * The thread is the one scrolling box in an open conversation. It opens on the
 * newest message and follows new ones while the reader is at the bottom or has
 * just sent one. A reader who has scrolled up to read is left where they are,
 * and a **New messages** pill appears over the bottom edge; tapping it, or
 * scrolling down, brings the newest message into view. The pane growing or
 * shrinking (an on-screen keyboard, a rotated phone) keeps a reader who was at
 * the bottom at the bottom.
 *
 * Loading earlier messages keeps the reader's place: the page lands above the
 * old first message and the scroll position moves down by exactly the height it
 * added. The browser's own scroll anchoring is switched off for the box, since
 * it would make the same correction a second time.
 *
 * `onSeen` reports the newest message the reader has actually had on screen:
 * it is called while they are at the bottom, on opening, whenever a message
 * arrives under them, when they scroll or tap down to it, and never while the
 * New messages pill is showing. The conversation marks it read from there.
 *
 * With `receipts` the reader's own bubbles carry the delivery mark: a clock
 * for the `outbox` entry still being stored, a tick once stored, two once read;
 * `withCount` adds "Read by n of m" for a conversation with several readers. A
 * failed `outbox` entry is a button that sends the same words again.
 *
 * Every business field follows Field Access: with Message hidden the thread is
 * replaced by a sentence; without Sent times no clock or day divider is drawn;
 * without People in the conversation no sender name appears above a bubble.
 * Text wraps anywhere, so a long unbroken string never widens the page.
 */
export function MessageThread({
  messages,
  loading,
  failed,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onRetry,
  showSender,
  showTimes,
  bodyHidden,
  receipts = false,
  withCount = false,
  outbox,
  onSeen,
  className,
}: {
  messages: ChatMessage[];
  loading: boolean;
  failed: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onRetry: () => void;
  /** Name the sender above each bubble that is not the reader's own. */
  showSender: boolean;
  /** Draw the clock under each bubble and the divider between days. */
  showTimes: boolean;
  /** The viewer's role may not read message text. */
  bodyHidden: boolean;
  /** Draw the delivery mark on the reader's own messages. */
  receipts?: boolean;
  /** The conversation has several readers, so a mark offers "Read by n of m". */
  withCount?: boolean;
  outbox?: OutboxEntry | null;
  onSeen?: (newestSeenId: number) => void;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const shownRef = useRef<{ oldest: number; newest: number; height: number; outbox: string } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(false);
  const [lastNewestId, setLastNewestId] = useState(0);

  const oldestId = messages[0]?.id ?? 0;
  const newest = messages[messages.length - 1];
  const newestId = newest?.id ?? 0;
  const newestMine = Boolean(newest?.mine);

  // A newer message than the reader has been shown, while they are reading
  // higher up, raises the pill. Adjusted during render so it costs no extra pass.
  if (newestId !== lastNewestId) {
    setLastNewestId(newestId);
    if (lastNewestId !== 0 && newestId > lastNewestId && !atBottom && !newestMine) setUnseen(true);
  }

  const outboxKey = outbox ? `${outbox.state}:${outbox.body}` : "";

  useEffect(() => {
    if (atBottom && newestId > 0) onSeen?.(newestId);
  }, [atBottom, newestId, onSeen]);

  const toBottom = () => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickRef.current = true;
    setAtBottom(true);
    setUnseen(false);
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      stickRef.current = near;
      setAtBottom(near);
      if (near) setUnseen(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            if (stickRef.current) el.scrollTop = el.scrollHeight;
          });
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  // Runs after every render; acts only when the first or last message changed.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || (newestId === 0 && !outboxKey)) return;
    const shown = shownRef.current;
    if (!shown) {
      el.scrollTop = el.scrollHeight;
      stickRef.current = true;
    } else {
      if (outboxKey && outboxKey !== shown.outbox) {
        el.scrollTop = el.scrollHeight;
        stickRef.current = true;
      }
      if (oldestId < shown.oldest) el.scrollTop += el.scrollHeight - shown.height;
      if (newestId > shown.newest && (stickRef.current || newestMine)) {
        el.scrollTop = el.scrollHeight;
        stickRef.current = true;
      }
    }
    shownRef.current = { oldest: oldestId, newest: newestId, height: el.scrollHeight, outbox: outboxKey };
  });

  let body: React.ReactNode;
  if (bodyHidden) {
    body = <p className="px-4 py-8 text-center text-sm text-gray-06">{CANNOT_READ_COPY}</p>;
  } else if (failed && messages.length === 0) {
    body = (
      <div className="grid justify-items-center gap-2 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-black-01">We could not load this conversation</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  } else if (loading && messages.length === 0) {
    body = (
      <div className="grid gap-3 p-4" aria-label="Loading messages">
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-10 w-3/5 rounded-2xl" />
      </div>
    );
  } else if (messages.length === 0 && !outbox) {
    body = <p className="px-4 py-8 text-center text-sm text-gray-06">No messages yet.</p>;
  } else {
    body = (
      <ol className="grid min-w-0 gap-1.5 px-3 py-3 sm:px-4" aria-label="Messages">
        {hasMore ? (
          <li className="flex justify-center pb-2">
            <Button size="sm" variant="outline" disabled={loadingOlder} onClick={onLoadOlder}>
              {loadingOlder ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Load earlier messages
            </Button>
          </li>
        ) : null}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const newDay = showTimes && message.sent_at && (!previous || dayOf(previous) !== dayOf(message));
          const mine = Boolean(message.mine);
          return (
            <li key={message.id} className="grid min-w-0 gap-1.5">
              {newDay ? (
                <p className="py-1.5 text-center text-[11px] font-medium text-gray-05">
                  {dayLabel(message.sent_at)}
                </p>
              ) : null}
              <div className={cn("flex min-w-0", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "min-w-0 max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-6 sm:max-w-[78%]",
                    mine
                      ? "rounded-br-md bg-primary text-white"
                      : "rounded-bl-md border border-border bg-white text-black-01",
                  )}
                >
                  {!mine && showSender && message.sender?.name ? (
                    <p className="break-words text-[11px] font-semibold text-primary">
                      {message.sender.name}
                    </p>
                  ) : null}
                  {message.body !== undefined ? (
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {message.body}
                    </p>
                  ) : null}
                  {(showTimes && message.sent_at) || (receipts && mine && message.receipt) ? (
                    <p
                      className={cn(
                        "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                        mine ? "text-white/75" : "text-gray-05",
                      )}
                    >
                      {showTimes && message.sent_at ? <span>{bubbleTime(message.sent_at)}</span> : null}
                      {receipts && mine && message.receipt ? (
                        <MessageTicks
                          state={tickStateOf(message.receipt)}
                          receipt={message.receipt}
                          withCount={withCount}
                        />
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
        {outbox ? (
          <li className="flex min-w-0 justify-end">
            {outbox.state === "failed" ? (
              <button
                type="button"
                onClick={outbox.onRetry}
                className="min-w-0 max-w-[88%] rounded-2xl rounded-br-md border border-red-300 bg-red-50 px-3.5 py-2 text-left text-sm leading-6 text-black-01 sm:max-w-[78%]"
              >
                <span className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {outbox.body}
                </span>
                <span className="mt-0.5 block text-right text-[11px] font-medium text-red-600">
                  Not sent. Tap to retry.
                </span>
              </button>
            ) : (
              <div className="min-w-0 max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-6 text-white sm:max-w-[78%]">
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{outbox.body}</p>
                {receipts ? (
                  <p className="mt-0.5 flex justify-end">
                    <MessageTicks state="sending" />
                  </p>
                ) : null}
              </div>
            )}
          </li>
        ) : null}
      </ol>
    );
  }

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      <ScrollArea
        className="min-h-0 flex-1 bg-white-05"
        viewportRef={viewportRef}
        viewportClassName="overscroll-contain [overflow-anchor:none]"
      >
        {body}
      </ScrollArea>
      {unseen ? (
        <Button
          type="button"
          size="sm"
          className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full shadow-md"
          onClick={toBottom}
        >
          <ArrowDown aria-hidden="true" /> New messages
        </Button>
      ) : null}
    </div>
  );
}
