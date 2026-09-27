import { GUIDE_CATEGORIES } from "./categories";
import type { GuideRecord, ScoredGuide } from "./types";

const normalize = (value: string) => value
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const words = (value: string) => normalize(value).split(" ").filter(Boolean);

function unorderedPrefixMatches(queryWords: readonly string[], valueWords: readonly string[]): boolean {
  const remaining = [...valueWords];
  return queryWords.every((queryWord) => {
    const index = remaining.findIndex((word) => word.startsWith(queryWord));
    if (index < 0) return false;
    remaining.splice(index, 1);
    return true;
  });
}

function scoreGuide(guide: GuideRecord, query: string): Pick<ScoredGuide, "matchKind" | "score"> | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;

  const title = normalize(guide.title);
  const aliases = guide.aliases.map(normalize);
  const routes = guide.routes.map(normalize);
  const sections = guide.sections?.map((section) => normalize(section.title)) ?? [];
  if (title === normalizedQuery) return { matchKind: "title", score: 400 };
  if (aliases.includes(normalizedQuery)) return { matchKind: "alias", score: 350 };
  if (routes.includes(normalizedQuery)) return { matchKind: "content", score: 340 };
  if (sections.includes(normalizedQuery)) return { matchKind: "content", score: 330 };

  const category = GUIDE_CATEGORIES.find((candidate) => candidate.id === guide.category);
  const weightedFields = [
    { values: [guide.title], score: 320 },
    { values: [...guide.aliases], score: 310 },
    { values: guide.sections?.map((section) => section.title) ?? [], score: 300 },
    { values: [...guide.tags], score: 290 },
    { values: [guide.summary], score: 280 },
    { values: [category?.title ?? ""], score: 270 },
    { values: [...guide.routes], score: 260 },
    { values: guide.audiences.map((audience) => audience.replaceAll("-", " ")), score: 260 },
  ];
  const searchable = weightedFields.flatMap((field) => field.values);
  const queryWords = words(normalizedQuery);
  const searchableWords = searchable.flatMap(words);

  for (const field of weightedFields) {
    if (field.values.some((value) => unorderedPrefixMatches(queryWords, words(value)))) {
      return { matchKind: "prefix", score: field.score };
    }
  }

  // Treat the guide metadata as one searchable document. Query words may be
  // entered in any order and may come from different fields, for example
  // "password forgot" or "account invite". Each partial still consumes a
  // distinct word, so repeated fragments cannot manufacture a match.
  if (unorderedPrefixMatches(queryWords, searchableWords)) {
    return { matchKind: "prefix", score: 250 };
  }
  const compactQuery = normalizedQuery.replaceAll(" ", "");
  if (searchable.some((value) => normalize(value).replaceAll(" ", "").includes(compactQuery))) {
    return { matchKind: "content", score: 150 };
  }
  return null;
}

/** Rank guide metadata without exposing records that the caller has filtered out. */
export function searchGuides(guides: readonly GuideRecord[], query: string, limit?: number): ScoredGuide[] {
  const ranked = guides
    .map((guide, registryOrder) => {
      const match = scoreGuide(guide, query);
      return match ? { guide, ...match, registryOrder } : null;
    })
    .filter((result): result is ScoredGuide & { registryOrder: number } => result !== null)
    .sort((a, b) => b.score - a.score || a.registryOrder - b.registryOrder)
    .map((result) => ({ guide: result.guide, matchKind: result.matchKind, score: result.score }));

  return limit == null ? ranked : ranked.slice(0, Math.max(0, limit));
}
