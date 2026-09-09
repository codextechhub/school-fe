import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

import { authSliceReducer } from "@/redux/features/auth/auth-slice";
import { baseApi } from "../base-api";
import { authApi } from "./auth-api";
import { clearAccessToken, getAccessToken } from "@/utils/access-token";

const makeStore = () =>
  configureStore({
    reducer: { auth: authSliceReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const loginPayload = (tenantKind: string) => ({
  success: true,
  data: {
    access: "access-token",
    session_id: 1,
    user: { id: 1, email: "ada@bright-star.test", full_name: "Ada Obi", role: "teacher" },
    permissions: [],
    school: null,
    tenant: { slug: "bright-star", name: "Bright Star", kind: tenantKind },
  },
});

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  // The app reads its school off the address it is served at.
  vi.stubGlobal("location", { ...window.location, hostname: "bright-star.xvs.codexng.com" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearAccessToken();
  sessionStorage.clear();
  document.cookie = "csrftoken=; Max-Age=0; Path=/";
});

describe("a sign-in names the school it is addressed to", () => {
  it("sends the slug from the subdomain, in the body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(loginPayload("SCHOOL")));
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    await store.dispatch(
      authApi.endpoints.login.initiate({ email: "ada@bright-star.test", password: "pw" }),
    );

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.credentials).toBe("include");
    // A body key, not the ?tenant= query assertion the authenticated endpoints
    // take: there is no token yet to check one against.
    expect(request.url).not.toContain("tenant=");
    expect(await new Request(request).json()).toEqual({
      email: "ada@bright-star.test",
      password: "pw",
      tenant: "bright-star",
    });
  });

  it("sends the same slug on a password reset request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, message: "Sent." }));
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    await store.dispatch(
      authApi.endpoints.forgotPassword.initiate({ email: "ada@bright-star.test" }),
    );

    expect(await new Request(fetchMock.mock.calls[0][0] as Request).json()).toEqual({
      email: "ada@bright-star.test",
      tenant: "bright-star",
    });
  });

  it("sends an empty tenant when the address names no school", async () => {
    vi.stubGlobal("location", { ...window.location, hostname: "xvs.codexng.com" });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(loginPayload("SCHOOL")));
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    await store.dispatch(
      authApi.endpoints.login.initiate({ email: "ada@bright-star.test", password: "pw" }),
    );

    // Never the string "xvs". The form is not offered at this address either,
    // but if it is ever reached the backend must refuse it rather than be handed
    // a school that does not exist.
    const body = await new Request(fetchMock.mock.calls[0][0] as Request).json();
    expect(body.tenant).toBe("");
  });
});

// This guard broke silently once: it tested `user.user_type === "CX_STAFF"`,
// the API dropped that column, and the comparison could no longer be true - so
// Codex staff were being given school sessions. It is pinned here.
describe("the school portal refuses a platform account", () => {
  it("opens no session for a platform-tenant login", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(loginPayload("PLATFORM")));
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    await store.dispatch(
      authApi.endpoints.login.initiate({ email: "staff@codexng.com", password: "pw" }),
    );

    expect(getAccessToken()).toBe("");
    expect(store.getState().auth.user).toBeFalsy();
  });

  it("opens a session for a school-tenant login", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(loginPayload("SCHOOL")));
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    await store.dispatch(
      authApi.endpoints.login.initiate({ email: "ada@bright-star.test", password: "pw" }),
    );

    expect(getAccessToken()).toBe("access-token");
    expect(store.getState().auth.user).toBeTruthy();
    expect(store.getState().auth).not.toHaveProperty("access");
    expect(store.getState().auth).not.toHaveProperty("refresh");
  });
});

describe("cookie-authenticated logout", () => {
  it("sends CSRF with no credential in the body", async () => {
    document.cookie = "csrftoken=csrf-value; Path=/";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    await store.dispatch(authApi.endpoints.logout.initiate());

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.credentials).toBe("include");
    expect(request.headers.get("X-CSRFToken")).toBe("csrf-value");
    expect(await new Request(request).json()).toEqual({});
  });
});
