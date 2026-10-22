import { useImperativeHandle, useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";

import { BODY_MAX, COUNTER_FROM, SEND_REFUSED } from "./messages-copy";
import { useSendToken } from "./use-send-token";

/** How the last send of a composer stands, for the thread to show beside the draft. */
export type OutboxStatus = { state: "idle" } | { state: "sending" | "failed"; body: string };

/** What a parent can ask of a composer: send the same words again, same token. */
export type ComposerHandle = { retry: () => void };

/**
 * The box a message is written in, with Send beside it.
 *
 * Each send carries a `client_token`. The token belongs to the text: a retry
 * after a failure, a double tap, or a second press while the first is in
 * flight sends the same text with the same token, so the server stores one
 * message. Changing the text starts a new token. The box clears only when the
 * server has accepted the message, so a refused send leaves the words to
 * retry.
 *
 * `onStatus` reports a send in flight, a refused one, and the return to idle
 * when it lands or the words are edited, so the thread can show the message as
 * Sending or as Not sent beside the draft. `ref.retry()` sends the same words
 * with the same token again.
 *
 * Send is Ctrl or Cmd with Enter; a plain Enter is a new line, which is what a
 * phone keyboard needs. The text is 16px on a phone, because iOS zooms the page
 * when a smaller box takes focus and the zoom would push the conversation's
 * head off the screen. A counter appears near the 4,000 character limit.
 */
export function MessageComposer({
  send,
  label = "Write a message",
  submitLabel = "Send",
  autoFocus = false,
  onSent,
  onStatus,
  ref,
  className,
}: {
  send: (body: string, clientToken: string) => Promise<unknown>;
  label?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onSent?: () => void;
  onStatus?: (status: OutboxStatus) => void;
  ref?: React.Ref<ComposerHandle>;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const token = useSendToken();
  const inFlight = useRef(false);
  const failedRef = useRef(false);

  const trimmed = text.trim();
  const tooLong = trimmed.length > BODY_MAX;
  const canSend = trimmed.length > 0 && !tooLong && !sending;

  const submit = async () => {
    if (!canSend || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setError("");
    failedRef.current = false;
    onStatus?.({ state: "sending", body: trimmed });
    try {
      await send(trimmed, token.tokenFor(trimmed));
      token.clear();
      setText("");
      onStatus?.({ state: "idle" });
      onSent?.();
    } catch (failure) {
      setError(writeErrorMessage(failure, SEND_REFUSED));
      failedRef.current = true;
      onStatus?.({ state: "failed", body: trimmed });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  useImperativeHandle(ref, () => ({ retry: () => void submit() }));

  return (
    <form
      className={cn("grid gap-1.5 border-t border-border bg-white p-3", className)}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {error ? (
        <p role="alert" className="break-words text-xs text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex min-w-0 items-end gap-2">
        <textarea
          aria-label={label}
          value={text}
          rows={2}
          autoFocus={autoFocus}
          placeholder={label}
          onChange={(event) => {
            setText(event.target.value);
            if (failedRef.current) {
              failedRef.current = false;
              onStatus?.({ state: "idle" });
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
          className="max-h-40 min-h-[2.75rem] min-w-0 flex-1 resize-y rounded-lg border border-white-02 bg-white px-3 py-2 text-base outline-none md:text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <Button type="submit" disabled={!canSend} className="shrink-0">
          <Send aria-hidden="true" /> {sending ? "Sending" : submitLabel}
        </Button>
      </div>
      {trimmed.length >= COUNTER_FROM ? (
        <p className={cn("text-right text-[11px]", tooLong ? "text-red-600" : "text-gray-05")}>
          {trimmed.length} of {BODY_MAX}
        </p>
      ) : null}
    </form>
  );
}
