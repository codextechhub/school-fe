import { useRef } from "react";

import { newClientToken } from "./messages-copy";

/**
 * The idempotency token for a send, held for as long as the text stays the same.
 *
 * A retry or a double tap of the same words asks for the same token, so the
 * server stores one message; new words get a new token. `clear` is called once
 * the server has accepted the send.
 */
export function useSendToken() {
  const held = useRef<{ text: string; token: string } | null>(null);
  return {
    tokenFor(text: string): string {
      if (!held.current || held.current.text !== text) {
        held.current = { text, token: newClientToken() };
      }
      return held.current.token;
    },
    clear() {
      held.current = null;
    },
  };
}
