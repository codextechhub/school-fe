import { useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";

import { BODY_MAX, COUNTER_FROM, SEND_REFUSED } from "./messages-copy";
import { useSendToken } from "./use-send-token";

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
 * Send is Ctrl or Cmd with Enter; a plain Enter is a new line, which is what a
 * phone keyboard needs. A counter appears near the 4,000 character limit.
 */
export function MessageComposer({
  send,
  label = "Write a message",
  submitLabel = "Send",
  autoFocus = false,
  onSent,
  className,
}: {
  send: (body: string, clientToken: string) => Promise<unknown>;
  label?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onSent?: () => void;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const token = useSendToken();
  const inFlight = useRef(false);

  const trimmed = text.trim();
  const tooLong = trimmed.length > BODY_MAX;
  const canSend = trimmed.length > 0 && !tooLong && !sending;

  const submit = async () => {
    if (!canSend || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setError("");
    try {
      await send(trimmed, token.tokenFor(trimmed));
      token.clear();
      setText("");
      onSent?.();
    } catch (failure) {
      setError(writeErrorMessage(failure, SEND_REFUSED));
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

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
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
          className="max-h-40 min-h-[2.75rem] min-w-0 flex-1 resize-y rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
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
