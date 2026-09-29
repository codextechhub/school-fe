/**
 * Do the guides say the school's own word for a part of its year?
 *
 * Greenfield Academy runs semesters; Bright Star School keeps the terms every
 * school starts with. Greenfield's screens read Sessions & Semesters, Semester
 * view and Add semester, so a guide telling its bursar to "open Sessions &
 * Terms" names a link that is not there.
 */
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { TERM_WORDS, termWordsFor, type TermWords } from "@/lib/school-words";

import { fillTermWords, GuideWordsContext } from "./guide-words";
import { GUIDE_REGISTRY } from "./registry";
import { searchGuides } from "./search";
import { WALKTHROUGH_REGISTRY } from "./walkthroughs/registry";

const SEMESTER = termWordsFor("SEMESTER");

const published = GUIDE_REGISTRY.filter((guide) => guide.status === "published");

async function render(id: string, words?: TermWords): Promise<string> {
  const guide = GUIDE_REGISTRY.find((candidate) => candidate.id === id)!;
  const { default: Article } = await guide.article!();
  const article = createElement(MemoryRouter, null, createElement(Article as ComponentType));
  return renderToStaticMarkup(
    words ? createElement(GuideWordsContext, { value: words }, article) : article,
  );
}

/** Labels the app prints in the school's word, as they read at a term school. */
const TERM_LABELS = [
  "Sessions &amp; Terms",
  "Term view",
  "Add term",
  "Add a term",
  "Terms running",
  "Link to this term",
  "Outside every term",
  "Between terms",
  "School term",
];

describe("guide articles in the school's word", () => {
  it.each(published.map((guide) => [guide.id] as const))(
    "%s names no term-labelled screen at a semester school",
    async (id) => {
      const html = await render(id, SEMESTER);
      const stale = TERM_LABELS.filter((label) => html.includes(label));
      expect(stale).toEqual([]);
    },
  );

  it("says term with no school word supplied, as a test or a fresh school does", async () => {
    const html = await render("school.academics.sessions-and-terms");
    expect(html).toContain("Sessions &amp; Terms");
    expect(html).toContain("Add term");
  });

  it("walks a semester school through its own labels", async () => {
    const html = await render("school.academics.sessions-and-terms", SEMESTER);
    expect(html).toContain("Sessions &amp; Semesters");
    expect(html).toContain("Add semester");
    expect(html).toContain("Semesters running");
    expect(html).toContain("S1");
  });

  it("keeps stored names and unrelated terms as written", async () => {
    const fees = await render("school.finance.bill-school-fees", SEMESTER);
    expect(fees).toContain("JSS 1 First Term fees");
    const suppliers = await render("school.procurement.manage-suppliers", SEMESTER);
    expect(suppliers).toContain("Payment terms");
  });
});

describe("walkthrough text in the school's word", () => {
  const steps = WALKTHROUGH_REGISTRY.flatMap((walkthrough) => walkthrough.steps)
    .filter((step) => step.kind !== "branch");

  it("fills every placeholder, leaving no braces for either word", () => {
    for (const words of [TERM_WORDS, SEMESTER]) {
      const leftovers = steps
        .map((step) => fillTermWords(`${step.title} ${step.body}`, words))
        .filter((text) => /\{(term|Term|terms|Terms)\}/.test(text));
      expect(leftovers).toEqual([]);
    }
  });

  it("reads Add semester in the session form's step at a semester school", () => {
    const step = steps.find((candidate) => candidate.id === "terms" && candidate.target === "session-drawer.terms")!;
    expect(fillTermWords(step.title, SEMESTER)).toBe("Fill in each semester");
    expect(fillTermWords(step.body, SEMESTER)).toContain("Add semester");
    expect(fillTermWords(step.body, SEMESTER)).not.toMatch(/\bterms?\b/);
  });

  it("never rewords text without a placeholder", () => {
    expect(fillTermWords("Check the payment terms", SEMESTER)).toBe("Check the payment terms");
  });
});

describe("guide search across both words", () => {
  const ids = (query: string) => searchGuides(published, query).map((result) => result.guide.id);

  it.each([
    ["term view", "semester view"],
    ["add a term", "add a semester"],
    ["term names", "semester names"],
    ["term dates", "semester dates"],
    ["term", "semester"],
  ])("finds the same guides for %s and %s", (term, semester) => {
    expect(ids(semester)).toEqual(ids(term));
    expect(ids(semester).length).toBeGreaterThan(0);
  });

  it("puts the guide for the screen first", () => {
    expect(ids("semester view")[0]).toBe("school.calendar.term-view");
    expect(ids("add a semester")[0]).toBe("school.academics.sessions-and-terms");
    expect(ids("semester names")[0]).toBe("school.setup.settings-academics");
  });

  it("reads a half-typed semester as term", () => {
    expect(ids("semes")).toEqual(ids("term"));
  });
});
