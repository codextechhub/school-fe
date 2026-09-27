import { afterEach, describe, expect, it, vi } from "vitest";

import { resetGuideArticleScroll, scrollToGuideSection } from "./article-navigation";

afterEach(() => {
  document.body.replaceChildren();
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("guide article navigation", () => {
  it("resets the page to the top when an article opens", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    resetGuideArticleScroll();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("smoothly scrolls to a contents section and records its hash", () => {
    window.history.replaceState({}, "", "/support/guides/example?source=search");
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
    const section = document.createElement("section");
    section.id = "common-problems";
    section.scrollIntoView = vi.fn();
    document.body.append(section);

    expect(scrollToGuideSection(section.id)).toBe(true);
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(window.location.pathname).toBe("/support/guides/example");
    expect(window.location.search).toBe("?source=search");
    expect(window.location.hash).toBe("#common-problems");
  });

  it("respects reduced-motion preferences", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const section = document.createElement("section");
    section.id = "before-you-start";
    section.scrollIntoView = vi.fn();
    document.body.append(section);

    scrollToGuideSection(section.id);

    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("does nothing when a registry section is missing from the article", () => {
    expect(scrollToGuideSection("missing-section")).toBe(false);
    expect(window.location.hash).toBe("");
  });
});
