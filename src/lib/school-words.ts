/**
 * The school's academic vocabulary as plain values, for code that is not a
 * component. Screens read it through `useSchoolWords` (src/hooks), which
 * resolves it from the school's rules; everything here is pure so an attention
 * rule, a facet list or a validator can take the word as an argument and be
 * tested without a store.
 */
import type {
  AcademicRules,
  TermWord,
} from "@/redux/services/academics/academics-types";

/**
 * The school's own word for a part of its year, in the four forms a sentence
 * needs.
 *
 * Kept apart from the hook so a module that is not a component (an attention
 * rule, a filter's facet list, an action palette entry) can take it as an
 * argument. Those modules default to {@link TERM_WORDS}, the word a school has
 * before it says otherwise.
 */
export interface TermWords {
  termWord: TermWord;
  /** "term" or "semester", for the middle of a sentence. */
  term: string;
  /** "Term" or "Semester", for a label or the start of a sentence. */
  Term: string;
  terms: string;
  Terms: string;
}

/** Everything `useSchoolWords` returns. */
export interface SchoolWords extends TermWords {
  /** The names a new year's rows start with, one row per name. */
  termNames: string[];
  /** The arms the generate-arms drawer opens with. */
  defaultArms: string[];
  /** True once the school's own rules have answered. */
  settled: boolean;
}

/** The word for each value, singular and plural. */
const FORMS: Record<TermWord, { one: string; many: string }> = {
  TERM: { one: "Term", many: "Terms" },
  SEMESTER: { one: "Semester", many: "Semesters" },
};

/** The four forms of one word. */
export function termWordsFor(word: TermWord): TermWords {
  const { one, many } = FORMS[word] ?? FORMS.TERM;
  return {
    termWord: FORMS[word] ? word : "TERM",
    term: one.toLowerCase(),
    Term: one,
    terms: many.toLowerCase(),
    Terms: many,
  };
}

/** The word a school has before it says anything: "Term". */
export const TERM_WORDS: TermWords = termWordsFor("TERM");

/** The word implied by a school profile's term structure. */
export function termWordFromStructure(structure?: string | null): TermWord {
  return structure === "2_SEMESTERS" ? "SEMESTER" : "TERM";
}

const ORDINALS = ["First", "Second", "Third", "Fourth"];

/**
 * The names a new year starts with when the school has stated none: three
 * terms, or two semesters. The same rule the server applies to a school that
 * has never saved its academic rules.
 */
export function defaultTermNames(word: TermWord): string[] {
  const count = word === "SEMESTER" ? 2 : 3;
  const { Term } = termWordsFor(word);
  return ORDINALS.slice(0, count).map((ordinal) => `${ordinal} ${Term}`);
}

export const DEFAULT_ARMS = ["A", "B", "C"];

/**
 * The school's words from whatever is known.
 *
 * The rules when they have answered. Until then, or when they fail, the school
 * profile's term structure, which a school states during onboarding and which
 * the server derives the word from anyway. With neither, "Term".
 */
export function resolveSchoolWords({
  rules,
  termStructure,
}: {
  rules?: AcademicRules | null;
  termStructure?: string | null;
}): SchoolWords {
  const word = rules?.term_word ?? termWordFromStructure(termStructure);
  const termNames = rules?.term_names?.filter((name) => name.trim()) ?? [];
  const defaultArms = rules?.default_arms?.filter((arm) => arm.trim()) ?? [];
  return {
    ...termWordsFor(word),
    termNames: termNames.length ? termNames : defaultTermNames(word),
    defaultArms: defaultArms.length ? defaultArms : DEFAULT_ARMS,
    settled: !!rules,
  };
}

/**
 * The arms as the generate-arms field shows them: "A, B, C". The drawer splits
 * the field on commas, so this is the text that generates exactly these arms.
 */
export function armsFieldText(arms: readonly string[]): string {
  return arms.map((arm) => arm.trim()).filter(Boolean).join(", ");
}

const GENERIC = /\b(Terms|terms|Term|term)\b/g;

/**
 * A fixed label with each generic "term" in the school's word, case kept:
 * "Term Calendar View" reads "Semester Calendar View".
 *
 * For labels that are written once, away from any component: route titles and
 * action palette entries. Copy inside a screen names `words.term` directly
 * instead, so the sentence says which word it means.
 */
export function labelInSchoolWords(label: string, words: TermWords): string {
  if (words.termWord === "TERM") return label;
  return label.replace(GENERIC, (found) => words[found as keyof TermWords]);
}
