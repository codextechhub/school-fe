/**
 * The branch rules the unit and post forms share: whether the school runs more
 * than one branch, the one branch a reader is pinned to, and whether the
 * reader may speak for the whole school.
 */

import { useBranchLens } from "@/hooks/use-branch-lens";
import { useAppSelector } from "@/redux/store";
import { selectBranchReach, selectUser } from "@/redux/features/auth/auth-slice";

export const NO_BRANCH_PICKED = -1;

export interface BranchLock {
  id: number | null;
  name: string;
  reason: string;
}

export function useUnitBranchRules() {
  const { applies, pinnedBranch, branches, choices } = useBranchLens();
  const reach = useAppSelector(selectBranchReach);
  const user = useAppSelector(selectUser);
  const wholeSchool = reach ? reach.whole_tenant : (user?.branch_id ?? null) === null;
  const nameOf = (id: number | null) =>
    id === null ? "The whole school" : branches.find((b) => b.id === id)?.name ?? "This branch";
  return { applies, pinnedBranch, wholeSchool, choices, nameOf };
}
