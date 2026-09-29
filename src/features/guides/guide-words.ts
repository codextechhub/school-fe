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
 * Guide metadata (titles, summaries, tags, aliases, section titles) is static
 * and says "term"; the guide search treats "semester" as the same word, so
 * either finds a guide.
 */
import { createContext, useContext } from "react";

import { TERM_WORDS, type TermWords } from "@/lib/school-words";

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
