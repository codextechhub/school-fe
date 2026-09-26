import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { selectBranchReach, selectUser } from "@/redux/features/auth/auth-slice";
import type { BranchReach } from "@/redux/features/auth/auth-types";
import {
  type BranchLens,
  selectBranchLens,
  setBranchLens,
} from "@/redux/features/academics/lens-slice";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";

interface LensBranch {
  id: number;
  name: string;
}

/**
 * The lens decisions, apart from React and the store so they can be tested as
 * plain data. `reach` is the session's branch reach, null until a session
 * carries one; `homeBranchId` is the user's home posting, which stands in for
 * the reach until then.
 */
export function resolveBranchLens<B extends LensBranch>({
  branches,
  reach,
  homeBranchId,
  lens,
  loading,
}: {
  branches: B[];
  reach: BranchReach | null;
  homeBranchId: number | null;
  lens: BranchLens;
  loading: boolean;
}) {
  const reachIds = reach
    ? reach.whole_tenant ? null : reach.branch_ids
    : homeBranchId != null ? [homeBranchId] : null;
  const choices = reachIds === null ? branches : branches.filter((b) => reachIds.includes(b.id));

  const applies = branches.length > 1;
  const canChoose = choices.length > 1;
  const pinnedBranch = applies && reachIds?.length === 1 ? reachIds[0] : null;

  // A pinned reader reads their one branch; anyone else keeps a lens only while
  // it names a branch they may still choose.
  const branch: BranchLens =
    pinnedBranch ??
    (lens === "all" || loading || choices.some((b) => b.id === lens) ? lens : "all");

  return {
    applies,
    canChoose,
    pinnedBranch,
    branch,
    choices,
    allLabel: reachIds === null ? "All branches" : "All my branches",
  };
}

/**
 * The branch lens, and the rules that make it honest.
 *
 * Two different questions are answered here, and they must not be confused:
 *
 * **Does the school run more than one branch?** (`applies`) Screens use it to
 * decide whether branches exist at all: a scope column, a "Whole school" label,
 * a branch control in a create drawer. A single-branch school gets none of it,
 * and the API drops every branch-shaped field for such a school anyway.
 *
 * **Does this reader have more than one branch to choose from?** (`canChoose`)
 * Only then is the picker a real question. The server narrows every read to
 * the reader's own reach (`visible_branch_ids`), so a bursar posted to Main
 * Branch at a two-branch school sees Main Branch rows whatever the picker says.
 * Offering them "All branches" or "Annex" would render a filter that quietly
 * does nothing, so the picker is not drawn. Somebody posted to two of three
 * branches is offered exactly those two, and "All my branches".
 *
 * The reach comes from the session (`branch_reach`, sent with the login and
 * every `/me`). Until a session carries it, the home posting stands in for it,
 * which is what the server itself does for a user with no role grants.
 *
 * A reader whose reach is one branch is pinned to it (`pinnedBranch`): the
 * lens reads that branch, and create drawers file new records under it.
 */
export function useBranchLens() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const reach = useAppSelector(selectBranchReach);
  const lens = useAppSelector(selectBranchLens);

  const { data, isLoading } = useGetMyBranchesQuery();
  const branches = useMemo(() => data?.data ?? [], [data]);

  const resolved = useMemo(
    () => resolveBranchLens({
      branches,
      reach,
      homeBranchId: user?.branch_id ?? null,
      lens,
      loading: isLoading,
    }),
    [branches, reach, user?.branch_id, lens, isLoading],
  );
  const { applies, canChoose, pinnedBranch, branch, choices, allLabel } = resolved;

  useEffect(() => {
    if (branch !== lens) dispatch(setBranchLens(branch));
  }, [dispatch, branch, lens]);

  const label =
    branch === "all"
      ? allLabel
      : branches.find((b) => b.id === branch)?.name ??
        user?.branch_name ??
        "This branch";

  return {
    /** False at a single-branch school: nothing about branches is shown. */
    applies,
    /** True when the reader may pick between two or more branches. */
    canChoose,
    /** The one branch the reader may work in, when their reach is exactly one. */
    pinnedBranch,
    branch,
    label,
    /** "All branches" for a whole-school reader, "All my branches" otherwise. */
    allLabel,
    /** Every branch the school runs. */
    branches,
    /** The branches this reader may pick between. */
    choices,
    isLoading,
    setBranch: (next: BranchLens) => dispatch(setBranchLens(next)),
  };
}
