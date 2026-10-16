import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  STUDENT_APP_HANDOVER_KEY,
  handOverToStudentApp,
  openStudentAppSignIn,
} from "./student-app-handover";

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

describe("handing a pupil's sign-in to the student app", () => {
  it("leaves only the opaque account for the student app and opens it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { account: "a1b2", access: "secret-access", app_path: "/student/" } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await handOverToStudentApp()).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/user\/auth\/device\/hand-over\/$/);
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("X-CSRFToken")).toBe("csrf-test");
    expect(sessionStorage.getItem(STUDENT_APP_HANDOVER_KEY)).toBe("a1b2");
    // The access token is not passed on: the student app fetches its own.
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("secret-access");
    expect(assign).toHaveBeenCalledWith("/student/");
  });

  it("reports a refused hand-over and opens nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    expect(await handOverToStudentApp()).toBe(false);
    expect(sessionStorage.getItem(STUDENT_APP_HANDOVER_KEY)).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("sends a pupil to the student app's own sign-in, as an added pupil on a shared phone", () => {
    openStudentAppSignIn({ path: "/student/" });
    expect(assign).toHaveBeenCalledWith("/student/sign-in?add=1");
  });
});
