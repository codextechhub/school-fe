import { beforeEach, describe, expect, it, vi } from "vitest";

const setFavicon = vi.fn();
vi.mock("@/utils/favicon", () => ({
  DEFAULT_FAVICON: "/svg/logo-blue.svg",
  setFavicon: (href: string) => setFavicon(href),
}));

// The hook's body runs the effect; useEffect is stubbed to call it straight
// through so the behaviour can be tested without a renderer.
vi.mock("react", () => ({ useEffect: (fn: () => void) => fn() }));

const { useBrandFavicon } = await import("./use-brand-favicon");

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = "";
  static outcome: "load" | "error" = "load";
  set src(value: string) {
    this.#src = value;
    queueMicrotask(() =>
      FakeImage.outcome === "load" ? this.onload?.() : this.onerror?.(),
    );
  }
  get src() {
    return this.#src;
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("useBrandFavicon", () => {
  beforeEach(() => {
    setFavicon.mockClear();
    vi.stubGlobal("Image", FakeImage);
  });

  it("falls back to the product mark when there is no crest to point at", () => {
    useBrandFavicon("");
    expect(setFavicon).toHaveBeenCalledWith("/svg/logo-blue.svg");
  });

  it("points the tab at a crest that loads", async () => {
    FakeImage.outcome = "load";
    useBrandFavicon("http://api.test/logo/");
    await flush();
    expect(setFavicon).toHaveBeenCalledWith("http://api.test/logo/");
  });

  it("falls back rather than leaving a stale icon when the crest 404s", async () => {
    // A <link rel="icon"> aimed at a 404 does not fall back on its own; it
    // keeps whatever was there, which on a school with no crest would be the
    // previous tab's icon rather than the product mark.
    FakeImage.outcome = "error";
    useBrandFavicon("http://api.test/missing/");
    await flush();
    expect(setFavicon).toHaveBeenLastCalledWith("/svg/logo-blue.svg");
    expect(setFavicon).not.toHaveBeenCalledWith("http://api.test/missing/");
  });
});
