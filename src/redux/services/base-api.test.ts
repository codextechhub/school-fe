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

  it("never moves the reader for a silent background request", async () => {
    // Guide telemetry is silent: a school being set up reading a guide must
    // stay on the guide even if the event is refused.
    setPath("/support/guides/get-started-with-xvs");
    respondWith(403, {
      success: false,
      message: "This school is still being set up.",
      error: { code: "TENANT_NOT_LIVE", detail: {} },
    });

    await baseQueryInterceptor("/support/guides/analytics/events/", apiStub("mutation"), { silent: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigate).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
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

/**
 * A refused action (409) is said out loud, or the click looks broken. Amaka,
 * a bursar at Lagoon View, deletes last year's supplier bill; the law keeps it
 * until the end of 2032, and they are told so in their school's date format. A
 * conflict a screen already shows itself, or one on a read nobody asked for,
 * stays quiet.
 */
describe("a refused action (409)", () => {
  /** A mutation whose school writes dates as 31/12/2032. */
  const actionStub = () => ({
    ...apiStub("mutation"),
    getState: () => ({
      auth: { tenant: { slug: "lagoon-view", display: { date_format: "DD_MM_YYYY" } } },
    }),
  });

  it("toasts the server's message", async () => {
    respondWith(409, {
      success: false,
      message: "This period is being closed. Try again when the close has finished.",
      error: { code: "PERIOD_CLOSE_ERROR", detail: {} },
    });

    const result = await baseQueryInterceptor("/finance/periods/4/close/", actionStub(), {});

    expect(result.error?.status).toBe(409);
    expect(toastError).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith(
      "This period is being closed. Try again when the close has finished.",
    );
  });

  it("words a kept record's refusal with the date in the school's format", async () => {
    respondWith(409, {
      success: false,
      message: "Supplier bill VI-0042 is a record the law requires to be kept until 2032-12-31, so it cannot be deleted.",
      error: { code: "RECORD_RETAINED", detail: { retained_until: "2032-12-31" } },
    });

    await baseQueryInterceptor(
      { url: "/procurement/vendor-invoices/42/", method: "DELETE" },
      actionStub(),
      {},
    );

    expect(toastError).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith(
      "This record is kept until 31/12/2032 and can't be deleted.",
    );
  });

  it("falls back to a plain sentence when the body carries none", async () => {
    respondWith(409, { success: false, error: { code: "SOMETHING_NEW", detail: {} } });

    await baseQueryInterceptor("/students/7/", actionStub(), {});

    expect(toastError).toHaveBeenCalledWith(
      "That could not be done right now. Refresh the page and try again.",
    );
  });

  it("stays quiet on a refused read", async () => {
    respondWith(409, {
      success: false,
      message: "That record changed while it was being read.",
      error: { code: "SOMETHING_CHANGED", detail: {} },
    });

    const result = await baseQueryInterceptor("/finance/periods/", apiStub("query"), {});

    expect(result.error?.status).toBe(409);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("stays quiet on a code the screen shows itself", async () => {
    respondWith(409, {
      success: false,
      message: "There is already a department called Sciences.",
      error: { code: "DUPLICATE_NAME", detail: { field: "name" } },
    });

    const result = await baseQueryInterceptor("/academics/departments/", actionStub(), {});

    expect(result.error?.status).toBe(409);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("recognises a screen's code in the top-level spelling as well", async () => {
    // The fee generation routes answer with `code` beside `message`, not inside `error`.
    respondWith(409, {
      success: false,
      message: "Fee structure 3 has no term.",
      code: "TERM_NOT_LINKED",
    });

    await baseQueryInterceptor("/fal/fee-structures/3/generate/", actionStub(), {});

    expect(toastError).not.toHaveBeenCalled();
  });
});

/**
 * A refused request (400, 422) toasts the sentence the reader can act on.
 *
 * Mrs Adeyemi at Bright Star adds "JSS1" and "JSS2" to Junior Secondary, where
 * JSS1 already exists. The server refuses the batch with a typed refusal whose
 * `detail` lists the offending names, and its `message` is the explanation; the
 * toast is the explanation, not "JSS1". A serializer's field error, by
 * contrast, is most specific in `detail`, so that one still wins there.
 */
describe("a refused request (400, 422)", () => {
  it("says a typed refusal's message, not the first string in its detail", async () => {
    respondWith(422, {
      success: false,
      message: "Some of these levels already exist in this programme.",
      error: { code: "DUPLICATE_IN_BATCH", detail: { names: ["JSS1"] } },
    });

    await baseQueryInterceptor("/academics/programs/7/levels/bulk/", apiStub("mutation"), {});

    expect(toastError).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith("Some of these levels already exist in this programme.");
  });

  it("says a serializer's field errors as the server wrote them, each field named in words", async () => {
    respondWith(400, {
      success: false,
      message: "Name: This field may not be blank.; Code: Ensure this field has no more than 10 characters.",
      error: {
        code: "REQUEST_ERROR",
        detail: { name: ["This field may not be blank."], code: ["Ensure this field has no more than 10 characters."] },
      },
    });

    await baseQueryInterceptor("/academics/departments/", apiStub("mutation"), {});

    expect(toastError).toHaveBeenCalledWith("Name: This field may not be blank.; Code: Ensure this field has no more than 10 characters.");
  });

  it("says a field error from its detail when the server's sentence is the generic one", async () => {
    respondWith(400, {
      success: false,
      message: "An error occurred. Check the error details for more information.",
      error: { code: "REQUEST_ERROR", detail: { name: ["This field may not be blank."] } },
    });

    await baseQueryInterceptor("/academics/departments/", apiStub("mutation"), {});

    expect(toastError).toHaveBeenCalledWith("This field may not be blank.");
  });

  it("raises no toast for a refusal that carries no sentence, rather than its code", async () => {
    respondWith(400, { success: false, error: { code: "SOMETHING_NEW", detail: {} } });

    await baseQueryInterceptor("/students/7/", apiStub("mutation"), {});

    expect(toastError).not.toHaveBeenCalled();
  });
});
