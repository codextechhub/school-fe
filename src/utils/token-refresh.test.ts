import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module keeps singleton state (in-flight promise, invalidation flag), so
// each test imports a fresh copy.
const freshImports = async () => {
  vi.resetModules();
  const tokenMod = await import("./token-refresh");
  const accessMod = await import("./access-token");
  return { ...tokenMod, ...accessMod };
};

const okResponse = (data: { access?: string; session_id?: number }) =>
  new Response(JSON.stringify({ data }), { status: 200 });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("refreshTokenSingleFlight", () => {
  it("refreshes with the HttpOnly cookie and stores access only in memory", async () => {
    document.cookie = "csrftoken=csrf-value; Path=/";
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ access: "new-access", session_id: 17 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshImports();
    const outcome = await mod.refreshTokenSingleFlight();

    expect(outcome).toEqual({ ok: true, access: "new-access", sessionId: 17 });
    expect(mod.getAccessToken()).toBe("new-access");
    const request = fetchMock.mock.calls[0][0] as string;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request).toContain("/user/auth/token/refresh/");
    expect(init.credentials).toBe("include");
    expect(init.body).toBe("{}");
    expect((init.headers as Record<string, string>)["X-CSRFToken"]).toBe("csrf-value");
  });

  it("shares one request among concurrent callers (single-flight)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ access: "a" }));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshImports();
    const [a, b, c] = await Promise.all([
      mod.refreshTokenSingleFlight(),
      mod.refreshTokenSingleFlight(),
      mod.refreshTokenSingleFlight(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("maps 401 to token_invalid (force re-auth)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));

    const mod = await freshImports();
    expect(await mod.refreshTokenSingleFlight()).toEqual({ ok: false, reason: "token_invalid" });
  });

  it("maps 5xx to server_error (transient - stay signed in)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 503 })));

    const mod = await freshImports();
    expect(await mod.refreshTokenSingleFlight()).toEqual({ ok: false, reason: "server_error" });
  });

  it("maps network failure to network_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const mod = await freshImports();
    expect(await mod.refreshTokenSingleFlight()).toEqual({ ok: false, reason: "network_error" });
  });

  it("refuses to run after the session is invalidated", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshImports();
    mod.markSessionInvalidated();

    expect(await mod.refreshTokenSingleFlight()).toEqual({ ok: false, reason: "no_token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps restore blocked after browser session storage is cleared", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshImports();
    mod.blockSessionRestore();
    sessionStorage.clear();

    expect(mod.isSessionRestoreBlocked()).toBe(true);
    expect(await mod.refreshTokenSingleFlight()).toEqual({ ok: false, reason: "no_token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("discards an in-flight result when the session is torn down mid-request", async () => {
    let resolveFetch!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((res) => (resolveFetch = res))));

    const mod = await freshImports();
    const pending = mod.refreshTokenSingleFlight();

    // Logout happens while the refresh is still on the wire.
    mod.markSessionInvalidated();
    resolveFetch(okResponse({ access: "zombie-access" }));
    const outcome = await pending;

    expect(outcome.ok).toBe(false);
    expect(mod.getAccessToken()).toBe("");
  });

  it("resetSessionInvalidation re-enables refresh for a new login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse({ access: "a2" })));

    const mod = await freshImports();
    mod.markSessionInvalidated();
    mod.resetSessionInvalidation();

    expect((await mod.refreshTokenSingleFlight()).ok).toBe(true);
  });
});
