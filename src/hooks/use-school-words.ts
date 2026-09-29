import { useMemo } from "react";
import { useGetAcademicRulesQuery } from "@/redux/services/academics/academics-api";
import { schoolApi } from "@/redux/services/school/school-api";
import { resolveSchoolWords, type SchoolWords } from "@/lib/school-words";

export type { SchoolWords, TermWords } from "@/lib/school-words";

/**
 * The school's word for a term (Term or Semester), its term names and its
 * default arms, for printing and for pre-filling forms.
 *
 * Reads `/v1/academics/rules/`, cached for the session. While that is in
 * flight, or if it fails, the answer comes from the school profile's term
 * structure when the profile is already in the cache: it is read, never
 * fetched, so a screen that only wanted the word does not start a profile
 * request. With neither, the word is "Term", which is what every school had
 * before it could choose, so a screen never waits on this to render.
 */
export function useSchoolWords(): SchoolWords {
  const { data } = useGetAcademicRulesQuery();
  const { data: profile } = schoolApi.endpoints.getSchoolProfile.useQueryState();
  const rules = data?.data;
  const termStructure = profile?.data?.term_structure;
  return useMemo(
    () => resolveSchoolWords({ rules, termStructure }),
    [rules, termStructure],
  );
}
