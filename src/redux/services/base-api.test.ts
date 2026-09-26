import { beforeEach, describe, expect, it, vi } from "vitest";

// Both factories are hoisted above the imports, so their spies have to live on
// a hoisted holder rather than in module-level consts.
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastError: vi.fn(),
}));

// The route table imports pages that import base-api, so the real module is
// never pulled in here - the interceptor only ever reaches for it lazily.
vi.mock("@/routes", () => ({ router: { navigate: mocks.navigate } }));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, info: vi.fn(), success: vi.fn() },
}));

import { baseQueryInterceptor } from "./base-api";
import { routesPath } from "@/routes/routesPath";

const { navigate, toastError } = mocks;

/** Minimal stand-in for the `api` object fetchBaseQuery is handed. */
const apiStub = (type: "query" | "mutation" = "query") => ({
  signal: new AbortController().signal,
  dispatch: vi.fn(),
  getState: () => ({ auth: { tenant: { slug: "brightfield" } } }),
  extra: undefined,
  endpoint: type === "query" ? "getStudents" : "updateStudent",
  type,
  forced: false,
  abort: vi.fn(),
});

const respondWith = (status: number, body: unknown) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
};

const setPath = (pathname: string) => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { pathname, href: `http://test.local${pathname}` },
  });
};

beforeEach(() => {
  navigate.mockClear();
  toastError.mockClear();
  setPath("/students");
});

describe("TENANT_NOT_LIVE handling", () => {
  it("sends the caller to the one 'opens at go-live' screen, without a toast", async () => {
    // A school that has not gone live reaching any surface but onboarding. It
    // authenticated fine and owns the tenant it asserted, so this must never
    // read as a permission failure.
    respondWith(403, {
      success: false,
      message: "This school is still being set up.",
      error: { code: "TENANT_NOT_LIVE", detail: {} },
    });

    await baseQueryInterceptor("/students/", apiStub(), {});
    // The navigate is reached through a dynamic import; let it settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigate).toHaveBeenCalledWith(
      routesPath.PROTECTED.ONBOARDING.NOT_LIVE,
      { replace: true },
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("does not yank a reader off an onboarding screen when a background call is refused", async () => {
    setPath(routesPath.PROTECTED.ONBOARDING.INDEX);
    respondWith(403, {
      success: false,
      message: "This school is still being set up.",
      error: { code: "TENANT_NOT_LIVE", detail: {} },
    });

    await baseQueryInterceptor("/students/", apiStub(), {});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigate).not.toHaveBeenCalled();
  });

  it("leaves an ordinary 403 alone - that one really is a permission failure", async () => {
    respondWith(403, {
      success: false,
      message: "You do not have permission to do that.",
      error: { code: "PERMISSION_DENIED", detail: {} },
    });

    await baseQueryInterceptor("/students/", apiStub("mutation"), {});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigate).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("You do not have permission to do that.");
  });

  it("shows the readable permission name instead of the machine key", async () => {
    respondWith(403, {
      success: false,
      message: "'finance.invoice.create' is restricted and cannot be placed in a permission group.",
      error: { code: "PERMISSION_DENIED", detail: {} },
    });

    await baseQueryInterceptor("/roles/", apiStub("mutation"), {});

    expect(toastError).toHaveBeenCalledWith(
      "'Create invoice' is restricted and cannot be placed in a permission group.",
    );
  });
});

/**
 * A refused read is left to the screen that asked. Chukwuemeka, a bursar,
 * opens Cost & Dimension Analysis; the report loads, but the dimension list
 * behind one filter is refused. He must not be told he was refused something
 * he never asked for.
 */
describe("a refused read", () => {
  it("stays quiet and leaves the error to the query", async () => {
    respondWith(403, {
      success: false,
      message: "You do not have permission to perform this action.",
      error: { code: "PERMISSION_DENIED", detail: {} },
    });

    const result = await baseQueryInterceptor("/finance/dimensions/", apiStub("query"), {});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.error?.status).toBe(403);
    expect(toastError).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("field_write_denied handling", () => {
  it("returns the refusal to the form without a toast or a redirect", async () => {
    // The form shows each message beside its own field; a toast would repeat it where nobody can place it.
    respondWith(403, {
      success: false,
      message: "Some fields cannot be changed.",
      error: {
        code: "field_write_denied",
        detail: { allergies: ["You cannot change this field."] },
      },
    });

    const result = await baseQueryInterceptor("/students/7/", apiStub(), {});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toastError).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(result.error?.status).toBe(403);
  });
});
