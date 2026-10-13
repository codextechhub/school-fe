import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  refresh: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, info: vi.fn(), success: vi.fn() },
}));
// A stale staff token left on the browser: the refresh would be refused, which
// is what sends a signed-in page to the sign-in screen.
vi.mock("@/utils/token-refresh", () => ({ refreshTokenSingleFlight: mocks.refresh }));
vi.mock("@/utils/access-token", () => ({ getAccessToken: () => "stale-staff-token" }));
vi.mock("@/utils/end-session", () => ({ endSession: mocks.endSession }));

import { baseQueryInterceptor } from "./base-api";

const apiStub = (endpoint: string) => ({
  signal: new AbortController().signal,
  dispatch: vi.fn(),
  getState: () => ({}),
  extra: undefined,
  endpoint,
  type: "query" as const,
  forced: false,
  abort: vi.fn(),
});

const respondWith = (status: number, body: unknown) => {
  const fetchMock = vi.fn(async (_request: Request) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  mocks.toastError.mockClear();
  mocks.refresh.mockReset().mockResolvedValue({ ok: false, reason: "token_invalid" });
  mocks.endSession.mockClear();
});

// A parent returning from the payment provider may share a laptop with a
// signed-in bursar. Whatever the public status route answers, they stay on
// the return page: no sign-in redirect, no session teardown, no toast.
describe("the public payment status route", () => {
  it("is not bounced to sign-in when it answers 401", async () => {
    respondWith(401, { success: false, message: "No.", error: {} });

    await baseQueryInterceptor(
      "/payments/public/collections/CXP-abc/status/",
      apiStub("collectionStatus"),
      { silent: true } as never,
    );

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.endSession).not.toHaveBeenCalled();
  });

  it("raises no toast for a 404 on a reference the server does not know", async () => {
    respondWith(404, { success: false, message: "Not found.", error: {} });

    const result = await baseQueryInterceptor(
      "/payments/public/collections/CXP-abc/status/",
      apiStub("collectionStatus"),
      { silent: true } as never,
    );

    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(result.error).toMatchObject({ status: 404 });
  });

  it("sends no Authorization header or tenant assertion", async () => {
    const fetchMock = respondWith(200, { success: true, data: {} });

    await baseQueryInterceptor(
      "/payments/public/collections/CXP-abc/status/",
      apiStub("collectionStatus"),
      { silent: true } as never,
    );

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.headers.get("authorization")).toBeNull();
    expect(request.url).not.toContain("tenant=");
  });
});
