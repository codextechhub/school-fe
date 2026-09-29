/**
 * The guide registry and its categories as the reader's school words them.
 *
 * `GUIDE_REGISTRY` and `GUIDE_CATEGORIES` hold text written once, with
 * `{term}`-style placeholders where it means a part of the year. A screen that
 * prints a guide's title, summary, contents list or a category's description
 * reads them through these hooks rather than the raw constants, so a semester
 * school's guides home, help panel and header search say "semester".
 *
 * Each worded copy is built once per set of words and kept, so the arrays are
 * the same objects from render to render and from one screen to the next, and
 * a `useMemo` that depends on them does not rerun for nothing.
 */
import type { TermWords } from "@/lib/school-words";

import { GUIDE_CATEGORIES } from "./categories";
import { fillTermWords, guideInSchoolWords, useGuideWords } from "./guide-words";
import { GUIDE_REGISTRY } from "./registry";
import type { GuideCategory, GuideRecord } from "./types";

const registries = new WeakMap<TermWords, readonly GuideRecord[]>();
const categoryLists = new WeakMap<TermWords, readonly GuideCategory[]>();

/** Every guide, with its printed text in `words`. */
export function registryInSchoolWords(words: TermWords): readonly GuideRecord[] {
  let worded = registries.get(words);
  if (!worded) {
    worded = GUIDE_REGISTRY.map((guide) => guideInSchoolWords(guide, words));
    registries.set(words, worded);
  }
  return worded;
}

/** Every category, with its description in `words`. */
export function categoriesInSchoolWords(words: TermWords): readonly GuideCategory[] {
  let worded = categoryLists.get(words);
  if (!worded) {
    worded = GUIDE_CATEGORIES.map((category) => ({
      ...category,
      description: fillTermWords(category.description, words),
    }));
    categoryLists.set(words, worded);
  }
  return worded;
}

/** The guide registry in the school's word. */
export function useGuideRegistry(): readonly GuideRecord[] {
  return registryInSchoolWords(useGuideWords());
}

/** The guide categories in the school's word. */
export function useGuideCategories(): readonly GuideCategory[] {
  return categoriesInSchoolWords(useGuideWords());
}
