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
import { noticesApi } from "./notices-api";

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const response = () =>
  new Response(
    JSON.stringify({
      success: true,
      message: "Done.",
      data: [],
      pagination: {
        currentPage: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 1,
        next: null,
        previous: null,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notice tenant assertions", () => {
  it("scopes the list, detail and lifecycle requests to the school address", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      response(),
    );
    vi.stubGlobal("fetch", fetchMock);
    const store = makeStore();

    const list = store.dispatch(noticesApi.endpoints.getNotices.initiate({ page: 1 }));
    const detail = store.dispatch(noticesApi.endpoints.getNotice.initiate(4));
    const options = store.dispatch(
      noticesApi.endpoints.getNoticeAudienceOptions.initiate(),
    );
    await Promise.all([list.unwrap(), detail.unwrap(), options.unwrap()]);
    await store.dispatch(
      noticesApi.endpoints.createNotice.initiate({ title: "Sports day" }),
    ).unwrap();
    await store.dispatch(
      noticesApi.endpoints.updateNotice.initiate({ id: 4, title: "Sports day update" }),
    ).unwrap();
    await store.dispatch(noticesApi.endpoints.publishNotice.initiate(4)).unwrap();
    await store.dispatch(noticesApi.endpoints.withdrawNotice.initiate(4)).unwrap();

    const urls = fetchMock.mock.calls
      .map(([input]) => (input instanceof Request ? input.url : String(input)))
      .filter((url) => new URL(url, "http://test.local").pathname.includes("/notices/"));
    expect(urls.length).toBeGreaterThanOrEqual(7);
    expect(
      urls.every(
        (url) => new URL(url, "http://test.local").searchParams.get("tenant") === "lagoon-view",
      ),
    ).toBe(true);

    list.unsubscribe();
    detail.unsubscribe();
    options.unsubscribe();
  });
});
