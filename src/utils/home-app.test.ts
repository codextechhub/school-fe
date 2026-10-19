import { afterEach, describe, expect, it, vi } from "vitest";

import { openHomeApp, openHomeAppSignIn } from "./home-app";

/**
 * A parent signing in on Lagoon View's own page opens the parent app at
 * /parent/, signed in. After activating or resetting a password, which signs
 * nobody in, they land on the parent app's sign-in.
 */
describe("sending a parent to the parent app", () => {
  const assign = vi.fn();

  afterEach(() => {
    assign.mockReset();
    vi.unstubAllGlobals();
  });

  const stubLocation = () => vi.stubGlobal("location", { ...window.location, assign });

  it("opens the app at its address", () => {
    stubLocation();
    openHomeApp({ path: "/parent/" });
    expect(assign).toHaveBeenCalledWith("/parent/");
  });

  it("opens its sign-in, whether or not the path ends in a slash", () => {
    stubLocation();
    openHomeAppSignIn({ path: "/parent" });
    expect(assign).toHaveBeenCalledWith("/parent/sign-in");
  });
});
