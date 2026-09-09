import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const freshImports = async () => {
  vi.resetModules();
  const endSessionMod = await import("./end-session");
  const tokenMod = await import("./token-refresh");
  const accessMod = await import("./access-token");
  return { ...endSessionMod, ...tokenMod, ...accessMod };
};

beforeEach(() => {
  document.cookie = "token=legacy-access; Path=/";
  localStorage.setItem("_last_activity", String(Date.now()));
  localStorage.setItem("persist:root", '{"auth":"{}"}');
  sessionStorage.setItem("anything", "1");
});

afterEach(() => {
  document.cookie = "token=; Max-Age=0; Path=/";
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("endSession", () => {
  it("clears memory access, the legacy access cookie, storages and activity", async () => {
    const { endSession, getAccessToken, setAccessToken } = await freshImports();
    setAccessToken("memory-access");
    endSession();

    expect(getAccessToken()).toBe("");
    expect(document.cookie).not.toContain("token=");
    expect(sessionStorage.getItem("anything")).toBeNull();
    expect(localStorage.getItem("_last_activity")).toBeNull();
    expect(localStorage.getItem("_auth_restore_blocked")).toBe("1");
  });

  it("synchronously removes the persisted Redux state (persist:root)", async () => {
    const { endSession } = await freshImports();
    // The debounced redux-persist write of resetAuth loses the race against the
    // hard-navigate, so endSession must drop persist:root itself.
    endSession();

    expect(localStorage.getItem("persist:root")).toBeNull();
  });

  it("writes the banner after clearing sessionStorage so it survives", async () => {
    const { endSession } = await freshImports();
    endSession("Session over. Log in again.");

    expect(sessionStorage.getItem("_auth_banner")).toBe("Session over. Log in again.");
  });

  it("blocks any subsequent token refresh in this JS context", async () => {
    const { endSession, refreshTokenSingleFlight } = await freshImports();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    endSession();
    // Even if the server still has a refresh cookie, this tab refuses restore.
    expect(await refreshTokenSingleFlight()).toEqual({ ok: false, reason: "no_token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
