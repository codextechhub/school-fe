import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppRedirect from "./app-redirect";

/**
 * A parent types lagoon-view.xvs.codexng.com/parent without the slash, or a
 * pupil /student?pupil=12. The host serves this app for those, and this page
 * sends each on to its app's own address, query kept.
 */
describe("AppRedirect", () => {
  const replace = vi.fn();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(() => {
    replace.mockReset();
    vi.unstubAllGlobals();
  });

  const render = async (path: "/student/" | "/parent/", search = "", hash = "") => {
    vi.stubGlobal("location", { ...window.location, search, hash, replace });
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(<AppRedirect path={path} />));
    await act(async () => root.unmount());
  };

  it("sends a bare /parent to the parent app", async () => {
    await render("/parent/");
    expect(replace).toHaveBeenCalledWith("/parent/");
  });

  it("keeps the query and hash on the way to the student app", async () => {
    await render("/student/", "?pupil=12", "#fees");
    expect(replace).toHaveBeenCalledWith("/student/?pupil=12#fees");
  });
});
