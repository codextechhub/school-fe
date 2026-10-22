import { useEffect, useRef } from "react";

import {
  THREAD_POLL_MS,
  useLazyGetConversationUpdatesQuery,
} from "@/redux/services/messages/messages-api";
import type { ThreadUpdates } from "@/redux/services/messages/messages-types";

/** How many follow-up calls one tick may chain while the server says there is more. */
const MAX_CHAIN = 5;

/**
 * Keeps an open conversation current: asks the server what changed since the
 * newest message held, every `THREAD_POLL_MS`, and once more the moment the tab
 * comes back to the front.
 *
 * Nothing is asked while the tab is hidden or the conversation is closed, and a
 * call still in flight is never doubled. When the server says more is waiting
 * the next call follows at once, so a long absence catches up in one tick.
 * `newestId` is read when each call is made, so the timer is not restarted by
 * every message that arrives.
 */
export function useThreadPoll({
  id,
  newestId,
  enabled,
  onUpdates,
}: {
  id: number;
  newestId: number;
  enabled: boolean;
  onUpdates: (updates: ThreadUpdates) => void;
}) {
  const [fetchUpdates] = useLazyGetConversationUpdatesQuery();
  const newest = useRef(newestId);
  const deliver = useRef(onUpdates);
  const busy = useRef(false);
  useEffect(() => {
    newest.current = newestId;
    deliver.current = onUpdates;
  });

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const ask = async () => {
      if (busy.current || document.visibilityState === "hidden") return;
      busy.current = true;
      try {
        for (let round = 0; round < MAX_CHAIN && live; round += 1) {
          const updates = await fetchUpdates({ id, after: newest.current }).unwrap();
          if (!live) return;
          deliver.current(updates);
          const last = updates.results[updates.results.length - 1];
          if (!updates.has_more || !last) break;
          newest.current = last.id;
        }
      } catch {
        // A failed poll is silent; the next tick asks again.
      } finally {
        busy.current = false;
      }
    };
    const timer = window.setInterval(() => void ask(), THREAD_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void ask();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [id, enabled, fetchUpdates]);
}
