import { Check, CheckCheck, Clock } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Receipt } from "@/redux/services/messages/messages-types";

import { readByCopy, type TickState } from "./messages-copy";

const LABEL: Record<TickState, string> = { sending: "Sending", sent: "Sent", read: "Read" };

/**
 * The delivery mark at the foot of the reader's own bubble.
 *
 * A clock while the message is being stored, one grey tick once the server has
 * it, two ticks in the accent colour once it is read. Where `receipt` names
 * more than one reader (a group or a broadcast) the mark is a button, and
 * pressing it, with a finger, a pointer or the keyboard, opens "Read by 3 of 5".
 * The state is also its accessible name, so the colour is never the only signal.
 */
export function MessageTicks({
  state,
  receipt,
  withCount = false,
}: {
  state: TickState;
  receipt?: Receipt;
  /** Offer the "Read by n of m" count, for a conversation with several readers. */
  withCount?: boolean;
}) {
  const Icon = state === "sending" ? Clock : state === "read" ? CheckCheck : Check;
  const mark = (
    <Icon
      className={cn("size-3.5", state === "read" ? "text-sky-300" : "text-white/70")}
      aria-hidden="true"
    />
  );
  if (!withCount || !receipt || receipt.recipient_count < 1 || state === "sending") {
    return (
      <span role="img" aria-label={LABEL[state]} className="inline-flex">
        {mark}
      </span>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${LABEL[state]}. ${readByCopy(receipt)}`}
          className="inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {mark}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-auto px-3 py-2 text-xs font-medium">
        {readByCopy(receipt)}
      </PopoverContent>
    </Popover>
  );
}
