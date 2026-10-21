import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";

let fieldAccess: FieldAccessMap = {};
let total: number | undefined = 3;
let seen: { skip?: boolean; pollingInterval?: number; refetchOnFocus?: boolean } | undefined;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ fieldAccess }),
}));
vi.mock("@/redux/services/messages/messages-api", () => ({
  UNREAD_POLL_MS: 60000,
  useGetUnreadCountQuery: (_arg: unknown, options: typeof seen) => {
    seen = options;
    return { data: { data: { total } } };
  },
}));

import { useMessageUnread } from "./use-message-unread";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function read(enabled: boolean): Promise<number> {
  const seenValue = vi.fn<(count: number) => void>();
  function Probe() {
    seenValue(useMessageUnread(enabled));
    return null;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<Probe />));
  await act(async () => root.unmount());
  return seenValue.mock.calls[seenValue.mock.calls.length - 1][0];
}

afterEach(() => {
  fieldAccess = {};
  total = 3;
  seen = undefined;
});

/**
 * The sidebar badge counts what is waiting, polled every minute and refreshed
 * on focus, and asks for nothing the reader's role may not see.
 */
describe("useMessageUnread", () => {
  it("returns the server's total and polls every minute, refetching on focus", async () => {
    expect(await read(true)).toBe(3);
    expect(seen).toMatchObject({ skip: false, pollingInterval: 60000, refetchOnFocus: true });
  });

  it("makes no request and shows no badge where Read status is hidden", async () => {
    fieldAccess = { [FIELD_RESOURCE.MESSAGES]: { hidden: ["read_status"], read_only: [] } };
    expect(await read(true)).toBe(0);
    expect(seen?.skip).toBe(true);
  });

  it("makes no request for a reader without the inbox or before go-live", async () => {
    expect(await read(false)).toBe(0);
    expect(seen?.skip).toBe(true);
  });

  it("shows no badge for nothing waiting", async () => {
    total = 0;
    expect(await read(true)).toBe(0);
  });
});
