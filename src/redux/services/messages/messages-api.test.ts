import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));
vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));
vi.mock("@/utils/school-host", () => ({
  currentSchoolSlug: () => "lagoon-view",
}));

import { baseApi } from "../base-api";
import { conversationExportPath, messagesApi } from "./messages-api";

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const page = {
  success: true,
  message: "ok",
  data: [],
  pagination: { currentPage: 1, pageSize: 20, totalItems: 0, totalPages: 1, next: null, previous: null },
};

const urlOf = (call: unknown[]) => {
  const input = call[0] as RequestInfo | URL;
  return new URL(input instanceof Request ? input.url : String(input), "http://test.local");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("messages requests", () => {
  it("carries the school address on every read and write", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(input instanceof Request ? input.url : String(input), "http://test.local").pathname;
      return path.endsWith("/messages/") && !path.includes("oversight")
        ? json({ success: true, message: "", data: { results: [], has_more: false, next_before: null } })
        : json(page);
    });
    vi.stubGlobal("fetch", fetchMock);
    const store = makeStore();
    const run = (action: unknown) =>
      (store.dispatch as (a: unknown) => { unwrap: () => Promise<unknown>; unsubscribe?: () => void })(action);

    await run(messagesApi.endpoints.getInbox.initiate({ kind: "group", unread: true, search: "form" })).unwrap();
    await run(messagesApi.endpoints.getConversation.initiate(5)).unwrap();
    await run(messagesApi.endpoints.getConversationMessages.initiate({ id: 5, before: 90 })).unwrap();
    await run(messagesApi.endpoints.getUnreadCount.initiate()).unwrap();
    await run(messagesApi.endpoints.getStaffContacts.initiate({ search: "ada" })).unwrap();
    await run(messagesApi.endpoints.getFamilyContacts.initiate()).unwrap();
    await run(messagesApi.endpoints.sendMessage.initiate({ id: 5, body: "Hi", client_token: "t" })).unwrap();
    await run(messagesApi.endpoints.markRead.initiate({ id: 5 })).unwrap();
    await run(messagesApi.endpoints.getOversightList.initiate({ kind: "groups" })).unwrap();

    const urls = fetchMock.mock.calls.map(urlOf).filter((url) => url.pathname.includes("/messages/"));
    expect(urls.length).toBeGreaterThanOrEqual(9);
    expect(urls.every((url) => url.searchParams.get("tenant") === "lagoon-view")).toBe(true);
  });

  it("asks the inbox for the kind, unread and search the screen chose", async () => {
    const fetchMock = vi.fn(async () => json(page));
    vi.stubGlobal("fetch", fetchMock);
    const store = makeStore();

    await store
      .dispatch(messagesApi.endpoints.getInbox.initiate({ kind: "family", unread: true, search: "tunde", page: 2 }))
      .unwrap();
    const url = urlOf(fetchMock.mock.calls[0] as unknown[]);
    expect(url.pathname.endsWith("/messages/conversations/")).toBe(true);
    expect(url.searchParams.get("kind")).toBe("family");
    expect(url.searchParams.get("unread")).toBe("true");
    expect(url.searchParams.get("search")).toBe("tunde");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("leaves the kind off when the inbox shows everything", async () => {
    const fetchMock = vi.fn(async () => json(page));
    vi.stubGlobal("fetch", fetchMock);
    const store = makeStore();

    await store.dispatch(messagesApi.endpoints.getInbox.initiate({ kind: "all" })).unwrap();
    expect(urlOf(fetchMock.mock.calls[0] as unknown[]).searchParams.has("kind")).toBe(false);
  });

  it("reads a cursor page whether or not the server wraps it in the envelope", async () => {
    const bare = { results: [{ id: 3, body: "Hi", mine: true }], has_more: true, next_before: 3 };
    const wrapped = { success: true, message: "", data: bare };
    for (const payload of [bare, wrapped]) {
      vi.stubGlobal("fetch", vi.fn(async () => json(payload)));
      const store = makeStore();
      const result = await store
        .dispatch(messagesApi.endpoints.getConversationMessages.initiate({ id: 8 }))
        .unwrap();
      expect(result.data.results.map((m) => m.id)).toEqual([3]);
      expect(result.data.has_more).toBe(true);
      expect(result.data.next_before).toBe(3);
    }
  });

  it("names the export route under the API prefix", () => {
    expect(conversationExportPath(12)).toBe("/v1/messages/conversations/12/export/");
  });

  it("posts a private reply to the broadcast's own route", async () => {
    const fetchMock = vi.fn(async () => json({ success: true, message: "", data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const store = makeStore();

    await store
      .dispatch(messagesApi.endpoints.replyToBroadcast.initiate({ id: 7, body: "Noted", client_token: "abc" }))
      .unwrap();
    const call = fetchMock.mock.calls[0] as unknown[];
    expect(urlOf(call).pathname.endsWith("/messages/broadcasts/7/reply/")).toBe(true);
    const request = call[0] as Request;
    expect(await request.json()).toEqual({ body: "Noted", client_token: "abc" });
  });
});
