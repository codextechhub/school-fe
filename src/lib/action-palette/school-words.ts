/**
 * Action labels in the school's own word for a term.
 *
 * The registry is a static list, so its labels say "term". A school that runs
 * semesters should read "View semester calendar", the same word its sidebar
 * and page titles use, so the labels are reworded here, once, before the
 * palette ranks them. Aliases are left alone: the registry carries both words
 * as match keys, so either one typed finds the action at any school.
 */
import { labelInSchoolWords, type TermWords } from "@/lib/school-words";
import type { ActionDef } from "./types";

export { labelInSchoolWords };

/** `actions`, with each label in the school's word. The same list for a term school. */
export function inSchoolWords(
  actions: readonly ActionDef[],
  words: TermWords,
): readonly ActionDef[] {
  if (words.termWord === "TERM") return actions;
  return actions.map((action) => {
    const label = labelInSchoolWords(action.label, words);
    return label === action.label ? action : { ...action, label };
  });
}
