import { useMemo } from "react";
import { selectBranchReach, selectUser } from "@/redux/features/auth/auth-slice";
import { useGetAllMyBranchesQuery } from "@/redux/services/branches/branches-api";
import type { SchoolBranch } from "@/redux/services/branches/branches-types";
import { useAppSelector } from "@/redux/store";

/**
 * The branches a settings section may offer this reader, and whether they act
 * for the whole school.
 *
 * `/i/me/branches/` lists every branch the school runs, but the settings
 * endpoints answer 404 for a branch outside the reader's reach. A picker built
 * from the full list offers a branch administrator the other branches and then
 * shows a load error when they pick one. So the choices are narrowed to the
 * session's branch reach, the same list the server checks. Until a session
 * carries a reach, the home posting stands in for it, as it does for the
 * branch lens.
 *
 * `applies` is false at a single-branch school, where no picker is drawn.
 */
export function useSettingsBranches(): {
  applies: boolean;
  wholeSchool: boolean;
  choices: SchoolBranch[];
  isLoading: boolean;
} {
  const reach = useAppSelector(selectBranchReach);
  const homeBranchId = useAppSelector(selectUser)?.branch_id ?? null;
  const { data, isLoading } = useGetAllMyBranchesQuery();

  return useMemo(() => {
    const branches = data ?? [];
    const reachIds = reach
      ? reach.whole_tenant ? null : reach.branch_ids
      : homeBranchId != null ? [homeBranchId] : null;
    return {
      applies: branches.length > 1,
      wholeSchool: reachIds === null,
      choices: reachIds === null ? branches : branches.filter((b) => reachIds.includes(b.id)),
      isLoading,
    };
  }, [data, reach, homeBranchId, isLoading]);
}
