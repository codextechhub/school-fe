import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));
const { markAccessChanged } = vi.hoisted(() => ({ markAccessChanged: vi.fn() }));
vi.mock("@/lib/access-reload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/access-reload")>()),
  markAccessChanged,
}));

import { authSliceReducer, setAuthUser } from "@/redux/features/auth/auth-slice";
import { baseApi } from "../base-api";
import { authApi } from "./auth-api";

/**
 * An open tab notices when the person's own access changes.
 *
 * Tunde teaches at Bright Star and has the app open. The first `/me` after
 * the page loads is applied in place. Later checks that come back the same,
 * even listed in another order, leave him alone. When the administrator
 * takes Finance Admin off him, the next check marks the change and leaves
 * the screen he is on exactly as it was, so the app reloads at his next move.
 * A check that answers for somebody else (a proxy starting) is an identity
 * swap, applied as it is.
 *
 * These run in order: "the first answer since this page loaded" is state the
 * module keeps for the life of the page.
 */
const makeStore = () =>
  configureStore({
    reducer: { auth: authSliceReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const me = (userId: number, permissions: string[]) =>
  new Response(
    JSON.stringify({
      success: true,
      message: "ok",
      data: {
        user: { id: userId, email: "tunde@bright-star.test", full_name: "Tunde Bello" },
        permissions,
        field_access: {},
        branch_reach: { whole_tenant: true, branch_ids: [] },
        school: null,
        tenant: { slug: "bright-star", name: "Bright Star", kind: "SCHOOL" },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

const store = makeStore();
const check = () => store.dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }));

beforeEach(() => {
  vi.stubGlobal("location", { ...window.location, hostname: "bright-star.xvs.codexng.com" });
  markAccessChanged.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("an open tab and the person's access", () => {
  it("applies the first answer since the page loaded in place", async () => {
    store.dispatch(setAuthUser({ user: { id: 7 } as never, permissions: ["school.dashboard.view"] }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(me(7, ["finance.invoice.view", "school.dashboard.view"])));

    await check();

    expect(markAccessChanged).not.toHaveBeenCalled();
    expect(store.getState().auth.permissions).toEqual(["finance.invoice.view", "school.dashboard.view"]);
  });

  it("leaves the tab alone when the access comes back the same in another order", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(me(7, ["school.dashboard.view", "finance.invoice.view"])));

    await check();

    expect(markAccessChanged).not.toHaveBeenCalled();
  });

  it("marks a change to the same person's access without applying it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(me(7, ["school.dashboard.view"])));

    await check();

    expect(markAccessChanged).toHaveBeenCalled();
    expect([...(store.getState().auth.permissions ?? [])].sort()).toEqual(["finance.invoice.view", "school.dashboard.view"]);
  });

  it("does not reload when the answer is for somebody else", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(me(9, ["school.dashboard.view"])));

    await check();

    expect(markAccessChanged).not.toHaveBeenCalled();
    expect(store.getState().auth.user?.id).toBe(9);
  });
});
