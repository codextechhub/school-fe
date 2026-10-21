import { useEffect, useLayoutEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/redux/services/messages/messages-types";

import { CANNOT_READ_COPY, bubbleTime, dayLabel, dayOf } from "./messages-copy";

/** How close to the bottom still counts as reading the newest message. */
const NEAR_BOTTOM_PX = 72;

/**
 * The messages of one conversation, oldest at the top and newest at the bottom.
 *
 * The thread follows the newest message while the reader is at the bottom or
 * has just sent one, and stays where it is when they have scrolled up to read.
 * Loading earlier messages keeps the reader's place by restoring the distance
 * from the bottom after the older page lands.
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
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const anchorRef = useRef<number | null>(null);
  const newestRef = useRef(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (anchorRef.current != null) {
      el.scrollTop = el.scrollHeight - anchorRef.current;
      anchorRef.current = null;
      return;
    }
    const newest = messages[messages.length - 1];
    if (!newest || newest.id === newestRef.current) return;
    const first = newestRef.current === 0;
    newestRef.current = newest.id;
    if (first || stickRef.current || newest.mine) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadOlder = () => {
    anchorRef.current = viewportRef.current?.scrollHeight ?? null;
    onLoadOlder();
  };

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
  } else if (messages.length === 0) {
    body = <p className="px-4 py-8 text-center text-sm text-gray-06">No messages yet.</p>;
  } else {
    body = (
      <ol className="grid min-w-0 gap-1.5 px-3 py-3 sm:px-4" aria-label="Messages">
        {hasMore ? (
          <li className="flex justify-center pb-2">
            <Button size="sm" variant="outline" disabled={loadingOlder} onClick={loadOlder}>
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
                  {showTimes && message.sent_at ? (
                    <p
                      className={cn(
                        "mt-0.5 text-right text-[10px]",
                        mine ? "text-white/75" : "text-gray-05",
                      )}
                    >
                      {bubbleTime(message.sent_at)}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ScrollArea className={cn("min-h-0 flex-1 bg-white-05", className)} viewportRef={viewportRef}>
      {body}
    </ScrollArea>
  );
}
