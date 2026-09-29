import { useMemo, type ReactNode } from "react";

import { useSchoolWords } from "@/hooks/use-school-words";
import { termWordsFor } from "@/lib/school-words";

import { GuideWordsContext } from "./guide-words";

/**
 * Supplies the school's word for a part of its year to every guide article
 * and walkthrough below it.
 *
 * The one place the guides read the store. Mounted by `WalkthroughProvider`,
 * which wraps the whole dashboard, so the guide pages, the help panel and the
 * walkthrough coach all sit inside it. The value changes only when the word
 * does, not when the school's term names or arms do, so articles do not
 * re-render for a change they never print.
 */
export function GuideWordsProvider({ children }: { children: ReactNode }) {
  const { termWord } = useSchoolWords();
  const words = useMemo(() => termWordsFor(termWord), [termWord]);
  return <GuideWordsContext value={words}>{children}</GuideWordsContext>;
}
