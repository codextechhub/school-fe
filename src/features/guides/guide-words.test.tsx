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

import { fillTermWords, guideInSchoolWords, GuideWordsContext } from "./guide-words";
import { GUIDE_REGISTRY } from "./registry";
import { searchGuides } from "./search";
import { categoriesInSchoolWords, registryInSchoolWords } from "./use-guide-registry";
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

  it("quotes the fee and calendar labels a semester school's screens show", async () => {
    const due = await render("school.finance.fee-due-dates", SEMESTER);
    expect(due).toContain("End of the semester billed");
    expect(due).not.toContain("End of the term billed");
    const dashboard = await render("school.finance.finance-dashboard", SEMESTER);
    expect(dashboard).toContain("This semester");
    const calendar = await render("school.calendar.plan-the-calendar", SEMESTER);
    expect(calendar).toContain("Mid-semester break");
    expect(calendar).not.toMatch(/mid-term/i);
  });

  it("quotes the same labels in terms at a term school", async () => {
    expect(await render("school.finance.fee-due-dates")).toContain("End of the term billed");
    expect(await render("school.finance.finance-dashboard")).toContain("This term");
    expect(await render("school.calendar.plan-the-calendar")).toContain("Mid-term break");
  });

  it("keeps stored names and unrelated terms as written", async () => {
    const fees = await render("school.finance.bill-school-fees", SEMESTER);
    expect(fees).toContain("JSS 1 First Term fees");
    const suppliers = await render("school.procurement.manage-suppliers", SEMESTER);
    expect(suppliers).toContain("Payment terms");
  });
});

describe("guide titles, summaries and contents in the school's word", () => {
  const printed = (words: TermWords) => registryInSchoolWords(words).flatMap((guide) => [
    guide.title,
    guide.summary,
    ...(guide.sections ?? []).map((section) => section.title),
  ]);

  it("fills every placeholder, leaving no braces for either word", () => {
    for (const words of [TERM_WORDS, SEMESTER]) {
      expect(printed(words).filter((text) => /[{}]/.test(text))).toEqual([]);
      const categories = categoriesInSchoolWords(words).map((category) => category.description);
      expect(categories.filter((text) => /[{}]/.test(text))).toEqual([]);
    }
  });

  /**
   * Phrases that say "term" at every school: the school profile's field is
   * labelled Term structure whatever the school's word, and Academic structure
   * offers "Term or Semester" as the choice itself.
   */
  const SAID_AT_EVERY_SCHOOL = /\bterm structure\b|\bTerm or Semester\b/gi;

  it("names the school's word in the registry through placeholders only", () => {
    const literal = printed(SEMESTER)
      .filter((text) => /\bterms?\b/i.test(text.replace(SAID_AT_EVERY_SCHOOL, "")));
    expect(literal).toEqual([]);
  });

  it("reads semester in the registry text for a semester school", () => {
    const sessions = registryInSchoolWords(SEMESTER).find((guide) => guide.id === "school.academics.sessions-and-terms")!;
    expect(sessions.title).toBe("Set up sessions and semesters");
    expect(sessions.sections?.map((section) => section.title)).toContain("Create a session and its semesters");
    const view = registryInSchoolWords(SEMESTER).find((guide) => guide.id === "school.calendar.term-view")!;
    expect(view.title).toBe("Browse the year in semester view");
    const academics = categoriesInSchoolWords(SEMESTER).find((category) => category.id === "academics")!;
    expect(academics.description).toBe("Sessions, semesters, departments, programmes, classes, and subjects.");
  });

  it("keeps the same objects for the same words, so a memo does not rerun", () => {
    expect(registryInSchoolWords(SEMESTER)).toBe(registryInSchoolWords(SEMESTER));
    expect(categoriesInSchoolWords(SEMESTER)).toBe(categoriesInSchoolWords(SEMESTER));
  });

  it("never rewords registry text without a placeholder", () => {
    const guide = { title: "Agree payment terms", summary: "Long-term contracts and First Term fees.", sections: [] };
    expect(guideInSchoolWords(guide, SEMESTER)).toEqual(guide);
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

  it("indexes a placeholder title as term, so a typed title still matches it", () => {
    const [top] = searchGuides(published, "set up sessions and terms");
    expect(top.guide.id).toBe("school.academics.sessions-and-terms");
    expect(top.matchKind).toBe("title");
    expect(searchGuides(published, "set up sessions and semesters")[0]).toEqual(top);
  });

  it("finds the same guides in a semester school's worded registry", () => {
    const worded = registryInSchoolWords(SEMESTER).filter((guide) => guide.status === "published");
    for (const query of ["semester view", "add a term", "generate the semester's invoices", "mid-semester break"]) {
      const found = searchGuides(worded, query).map((result) => result.guide.id);
      expect(found, query).toEqual(ids(query));
      expect(found.length, query).toBeGreaterThan(0);
    }
  });
});
