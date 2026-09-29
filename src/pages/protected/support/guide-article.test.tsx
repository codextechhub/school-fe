/**
 * Does a guide's own page say the school's word above the article?
 *
 * The heading, summary and "On this page" list come from the registry, not
 * from the article body, so they are checked apart from it. Greenfield Academy
 * runs semesters: its administrator opening the sessions guide reads "Set up
 * sessions and semesters" with "Create a session and its semesters" in the
 * contents, beside a sidebar that says Sessions & Semesters. Bright Star
 * School, which keeps terms, reads the same guide in terms.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuideWordsContext } from "@/features/guides/guide-words";
import { TERM_WORDS, termWordsFor, type TermWords } from "@/lib/school-words";

import GuideArticlePage from "./guide-article";

// A reader who may open every guide, with no store behind them.
vi.mock("@/features/guides/use-guide-reader", async () => {
  const { P, resolvePermissionKey } = await import("@/permissions");
  const permissions = [resolvePermissionKey(P.BROWSE_SESSIONS)!];
  const reader = { permissions, hasCapability: () => true };
  return { useGuideReader: () => reader };
});

vi.mock("@/redux/services/support/guide-analytics-api", () => ({
  useRecordGuideAnalyticsMutation: () => [vi.fn()],
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function open(slug: string, words: TermWords) {
  await act(async () => {
    root.render(
      <GuideWordsContext value={words}>
        <MemoryRouter initialEntries={[`/support/guides/${slug}`]}>
          <Routes>
            <Route path="/support/guides/:slug" element={<GuideArticlePage />} />
          </Routes>
        </MemoryRouter>
      </GuideWordsContext>,
    );
  });
  return {
    heading: container.querySelector("h1")?.textContent ?? "",
    summary: container.querySelector("header p.mt-3")?.textContent ?? "",
    contents: [...container.querySelectorAll('nav[aria-label="On this page"] li')]
      .map((item) => item.textContent ?? ""),
  };
}

describe("a guide's page in the school's word", () => {
  it("reads semester at a semester school", async () => {
    const page = await open("set-up-sessions-and-terms", termWordsFor("SEMESTER"));
    expect(page.heading).toBe("Set up sessions and semesters");
    expect(page.summary).toContain("Create a school year with its semesters,");
    expect(page.contents).toContain("Create a session and its semesters");
    expect(page.contents.join(" ")).not.toMatch(/\bterms?\b|\{/);
  });

  it("reads term at a school that keeps terms", async () => {
    const page = await open("set-up-sessions-and-terms", TERM_WORDS);
    expect(page.heading).toBe("Set up sessions and terms");
    expect(page.contents).toContain("Create a session and its terms");
  });
});
