/**
 * The school's word for a part of its year, as the guides print it.
 *
 * A school calls a part of its year a term or a semester, and every screen
 * says the school's own word. A guide that names those screens has to say it
 * too, or a semester school reads "select Add term" beside a button that says
 * Add semester.
 *
 * Articles and the walkthrough coach read the word from this context and never
 * from the store, so they stay pure: a test renders an article with no Redux
 * provider and gets "term", the word a school has before it chooses. The app
 * supplies the school's own word once, through `GuideWordsProvider`, around
 * everything the dashboard renders.
 *
 * Text written once as data (walkthrough steps, and a guide's title, summary,
 * contents list and category description) names the word through opt-in
 * placeholders, `{term}`, `{Term}`, `{terms}` and `{Terms}`, and is printed
 * through `fillTermWords` or `guideInSchoolWords`. Only a placeholder is
 * reworded, so "payment terms" and a stored name such as "First Term" stay as
 * written. The guide search reads the same text with the placeholders filled
 * as "term" and treats "semester" as the same word, so either finds a guide.
 */
import { createContext, useContext } from "react";

import { TERM_WORDS, type TermWords } from "@/lib/school-words";

import type { GuideArticleSection } from "./types";

export type { TermWords };

export const GuideWordsContext = createContext<TermWords>(TERM_WORDS);

/** The school's word in its four forms: term, Term, terms, Terms. */
export function useGuideWords(): TermWords {
  return useContext(GuideWordsContext);
}

const TOKEN = /\{(term|Term|terms|Terms)\}/g;

/** Any `{...}` placeholder, known or not, for validation. */
export const TERM_TOKEN_PATTERN = /\{[^{}]*\}/g;

/** The placeholders fixed text may carry. */
export const TERM_TOKENS = ["{term}", "{Term}", "{terms}", "{Terms}"] as const;

const KNOWN_TOKENS: ReadonlySet<string> = new Set(TERM_TOKENS);

/** The placeholders in `text` that are not one of {@link TERM_TOKENS}. */
export function unknownTermTokens(text: string): string[] {
  return (text.match(TERM_TOKEN_PATTERN) ?? []).filter((token) => !KNOWN_TOKENS.has(token));
}

/**
 * Fixed text with each placeholder in the school's word: "Fill in each
 * {term}" reads "Fill in each semester" at a semester school.
 *
 * For text written once as data, such as walkthrough steps. The placeholder is
 * opt-in, so "payment terms" in a procurement step is never reworded.
 */
export function fillTermWords(text: string, words: TermWords): string {
  return text.replace(TOKEN, (_, form: keyof TermWords) => String(words[form]));
}

/** The parts of a guide record a reader sees printed. */
type GuideText = {
  title: string;
  summary: string;
  sections?: readonly GuideArticleSection[];
};

/**
 * A guide record with its title, summary and "On this page" list in the
 * school's word, and everything else as registered.
 *
 * Every screen that prints a guide's title or summary reads the record through
 * this (by way of `useGuideRegistry`), so the guides home, the help panel, the
 * header search and the article heading say what the article body says.
 */
export function guideInSchoolWords<T extends GuideText>(guide: T, words: TermWords): T {
  return {
    ...guide,
    title: fillTermWords(guide.title, words),
    summary: fillTermWords(guide.summary, words),
    ...(guide.sections && {
      sections: guide.sections.map((section) => ({ ...section, title: fillTermWords(section.title, words) })),
    }),
  };
}
