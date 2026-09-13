import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

// The route table imports pages that import base-api, so the real module is
// never pulled in here - the interceptor only ever reaches for it lazily.
vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));

import { baseApi } from "../base-api";
import { notificationsApi } from "./notifications-api";

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

type Store = ReturnType<typeof makeStore>;

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

/** What the bell would render right now, straight off the cache. */
const badge = (store: Store) =>
  notificationsApi.endpoints.getUnreadNotificationCount.select(undefined)(
    store.getState(),
  ).data?.data?.unread_count;

const requestUrl = (input: unknown) =>
  typeof input === "string" ? input : (input as Request).url;

const isFeedRequest = (input: unknown) =>
  new URL(requestUrl(input), "http://test.local").pathname.endsWith("/notify/");

/**
 * `unreadCount` is what /notify/unread-count/ answers, so a stale badge can be
 * told apart from a corrected one: the acknowledgement reports a different
 * number and the cache must end up holding that one.
 */
const stubApi = (
  acknowledgement: { updated_count: number; unread_count: number },
  unreadCount = 3,
) => {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = requestUrl(input);
    if (url.includes("/notify/unread-count/")) {
      return jsonResponse({
        success: true,
        message: "Unread count.",
        data: { unread_count: unreadCount },
      });
    }
    if (url.includes("/notify/acknowledge-route/")) {
      return jsonResponse({
        success: true,
        message: "Acknowledged.",
        data: acknowledgement,
      });
    }
    return jsonResponse({
      success: true,
      message: "Notifications.",
      data: [],
      pagination: {
        currentPage: 1,
        pageSize: 5,
        totalItems: 0,
        totalPages: 1,
        next: null,
        previous: null,
      },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the badge follows the acknowledgement, not the next poll", () => {
  it("shows the count the acknowledgement reported even though it cleared nothing itself", async () => {
    // Opening the export run cleared the notification through the run's own
    // GET, microseconds before the acknowledgement arrived. So it updates no
    // rows, and the only trustworthy number in the response is the count.
    const fetchMock = stubApi({ updated_count: 0, unread_count: 2 });

    const store = makeStore();
    await store.dispatch(
      notificationsApi.endpoints.getUnreadNotificationCount.initiate(undefined),
    );
    expect(badge(store)).toBe(3);

    await store.dispatch(
      notificationsApi.endpoints.acknowledgeNotificationRoute.initiate({
        path: "/export/runs/8f1c2d34",
      }),
    );

    expect(badge(store)).toBe(2);
    // Corrected from the response the caller already had, without asking the
    // server a second time.
    expect(
      fetchMock.mock.calls.filter((call) =>
        requestUrl(call[0]).includes("/notify/unread-count/"),
      ),
    ).toHaveLength(1);
  });

  it("leaves the tray alone when the navigation cleared nothing", async () => {
    const fetchMock = stubApi({ updated_count: 0, unread_count: 3 });

    const store = makeStore();
    await store.dispatch(
      notificationsApi.endpoints.getNotifications.initiate({ page: 1, page_size: 5 }),
    );
    const before = fetchMock.mock.calls.filter((call) => isFeedRequest(call[0])).length;

    await store.dispatch(
      notificationsApi.endpoints.acknowledgeNotificationRoute.initiate({ path: "/students" }),
    );

    expect(fetchMock.mock.calls.filter((call) => isFeedRequest(call[0])).length).toBe(
      before,
    );
  });

  it("refetches the tray when a row actually moved", async () => {
    const fetchMock = stubApi({ updated_count: 1, unread_count: 2 });

    const store = makeStore();
    await store.dispatch(
      notificationsApi.endpoints.getNotifications.initiate({ page: 1, page_size: 5 }),
    );
    const before = fetchMock.mock.calls.filter((call) => isFeedRequest(call[0])).length;

    await store.dispatch(
      notificationsApi.endpoints.acknowledgeNotificationRoute.initiate({
        path: "/support/tickets/41",
      }),
    );

    expect(
      fetchMock.mock.calls.filter((call) => isFeedRequest(call[0])).length,
    ).toBeGreaterThan(before);
  });
});
