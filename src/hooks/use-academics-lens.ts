import { useBranchLens } from "@/hooks/use-branch-lens";
import { useSessionLens } from "@/hooks/use-session-lens";

/**
 * The two lenses every academic-structure screen reads through: WHICH BRANCH
 * and WHICH YEAR.
 *
 * One hook rather than two, because they are always wanted together and a
 * screen that reads only the branch is a screen showing last year's classes
 * under this year's heading. Levels, classes and subjects belong to a session
 * now, so the year is a filter and not a caption - the mistake this module
 * spent its first version making.
 *
 * `lens` is shaped to spread straight into a list query:
 *
 *     useGetClassesQuery({ ...lens, search, page })
 *
 * so the year travels with the branch by default and a call site has to go out
 * of its way to drop it.
 *
 * The year is left OFF the args while the session list is still loading:
 * firing the request without it would answer about the server's default year
 * and then refetch, which shows the wrong rows for one frame.
 */

export function useAcademicsLens() {
  const branchLens = useBranchLens();
  const sessionLens = useSessionLens();

  return {
    /** Spread into any academics list query. */
    lens: {
      branch: branchLens.branch,
      session: sessionLens.current?.id,
    },
    branch: branchLens.branch,
    /**
     * Whether this reader works across branches, so rows say where they apply.
     *
     * False at a one-branch school, and false for a reader who works in one
     * branch: their rows are all theirs or school-wide, and which of the two a
     * row is changes nothing they can do there (`can_manage` already says what
     * they may change). Screens drop the Scope column, the "School-wide" and
     * branch chips and the branch filter for them. Create drawers do not read
     * this: they ask `useBranchLens` whether the school runs several branches,
     * because a new row still has to be filed under one.
     */
    multiBranch: branchLens.canChoose,
    session: sessionLens.current?.id,
    /** The whole row, for the screens that pass a year somewhere. */
    currentSession: sessionLens.current ?? null,
    sessionName: sessionLens.current?.name ?? null,
    /** ACTIVE / DRAFT / ARCHIVED, for screens that say so out loud. */
    sessionStatus: sessionLens.current?.status ?? null,
    /**
     * True while an archived year is being read.
     *
     * The server refuses every structure write into one, so the screens have
     * to stop OFFERING them: an Edit that answers 409 is worse than no Edit.
     * AND this into a screen's canEdit/canCreate rather than hiding rows -
     * reading last year back is exactly what the year column is for.
     */
    readOnlyYear: sessionLens.current?.status === "ARCHIVED",
    /** False before the first year is written, or when there is only one. */
    multiSession: sessionLens.applies,
    isLoading: branchLens.isLoading || sessionLens.isLoading,
  };
}
