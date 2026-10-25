import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  STUDENT_APP_HANDOVER_KEY,
  handOverToDeviceApp,
  handoverKey,
  openDeviceAppSignIn,
} from "./device-app-handover";

const assign = vi.fn();

beforeEach(() => {
  vi.stubGlobal("location", { ...window.location, assign });
  document.cookie = "csrftoken=csrf-test; Path=/";
});

afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockReset();
  sessionStorage.clear();
  document.cookie = "csrftoken=; Max-Age=0; Path=/";
});

const answer = (data: Record<string, string>, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify({ data }), { status }));

describe("the key an app reads its hand-over from", () => {
  it("keeps the student app's key exactly", () => {
    expect(STUDENT_APP_HANDOVER_KEY).toBe("xvs.student.handover");
    expect(handoverKey("/student/")).toBe("xvs.student.handover");
  });

  it("names the parent app's key from its path", () => {
    expect(handoverKey("/parent/")).toBe("xvs.parent.handover");
    expect(handoverKey("/parent/sign-in")).toBe("xvs.parent.handover");
  });
});

describe("handing a sign-in to a device app", () => {
  it("leaves only the opaque account for the student app and opens it", async () => {
    const fetchMock = answer({ account: "a1b2", access: "secret-access", app_path: "/student/" });
    vi.stubGlobal("fetch", fetchMock);

    expect(await handOverToDeviceApp({ path: "/student/" })).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/user\/auth\/device\/hand-over\/$/);
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("X-CSRFToken")).toBe("csrf-test");
    expect(sessionStorage.getItem("xvs.student.handover")).toBe("a1b2");
    expect(sessionStorage.getItem("xvs.parent.handover")).toBeNull();
    // The access token is not passed on: the app fetches its own.
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("secret-access");
    expect(assign).toHaveBeenCalledWith("/student/");
  });

  it("leaves the account under the parent key for the parent app and opens it", async () => {
    vi.stubGlobal("fetch", answer({ account: "p9z8", app_path: "/parent/" }));

    expect(await handOverToDeviceApp({ path: "/parent/" })).toBe(true);

    expect(sessionStorage.getItem("xvs.parent.handover")).toBe("p9z8");
    expect(sessionStorage.getItem("xvs.student.handover")).toBeNull();
    expect(assign).toHaveBeenCalledWith("/parent/");
  });

  it("follows the app the API names over the one the sign-in named", async () => {
    vi.stubGlobal("fetch", answer({ account: "p9z8", app_path: "/parent/" }));

    await handOverToDeviceApp({ path: "/student/" });

    expect(sessionStorage.getItem("xvs.parent.handover")).toBe("p9z8");
    expect(assign).toHaveBeenCalledWith("/parent/");
  });

  it("falls back to the sign-in's app when the answer names none", async () => {
    vi.stubGlobal("fetch", answer({ account: "p9z8" }));

    await handOverToDeviceApp({ path: "/parent/" });

    expect(sessionStorage.getItem("xvs.parent.handover")).toBe("p9z8");
    expect(assign).toHaveBeenCalledWith("/parent/");
  });

  it("opens the student app when nothing names an app", async () => {
    vi.stubGlobal("fetch", answer({ account: "a1b2" }));

    await handOverToDeviceApp();

    expect(sessionStorage.getItem("xvs.student.handover")).toBe("a1b2");
    expect(assign).toHaveBeenCalledWith("/student/");
  });

  it("reports a refused hand-over and opens nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    expect(await handOverToDeviceApp({ path: "/parent/" })).toBe(false);
    expect(sessionStorage.length).toBe(0);
    expect(assign).not.toHaveBeenCalled();
  });

  it("reports an answer with no account and opens nothing", async () => {
    vi.stubGlobal("fetch", answer({ app_path: "/parent/" }));
    expect(await handOverToDeviceApp({ path: "/parent/" })).toBe(false);
    expect(sessionStorage.length).toBe(0);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("opening a device app's own sign-in", () => {
  it("sends a pupil to the student app's sign-in, as an added pupil on a shared phone", () => {
    openDeviceAppSignIn({ path: "/student/" });
    expect(assign).toHaveBeenCalledWith("/student/sign-in?add=1");
  });

  it("sends a parent to the parent app's plain sign-in", () => {
    openDeviceAppSignIn({ path: "/parent/" });
    expect(assign).toHaveBeenCalledWith("/parent/sign-in");
  });

  it("adds the trailing slash a path may lack", () => {
    openDeviceAppSignIn({ path: "/parent" });
    expect(assign).toHaveBeenCalledWith("/parent/sign-in");
  });
});
