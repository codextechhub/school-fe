import { useCallback } from "react";

import { useBranchLens } from "@/hooks/use-branch-lens";
import { useAppSelector } from "@/redux/store";
import { selectBranchReach, selectUser } from "@/redux/features/auth/auth-slice";

/**
 * The branches the reader may post people to and grant roles at.
 *
 * A whole-school reader is offered every branch and "across the whole school".
 * A branch-bound reader is offered only their own branches and never the whole
 * school: a school-wide posting puts a person on every branch's roster, and a
 * school-wide grant lets its holder read every branch's records, and neither is
 * a branch administrator's to hand out. The server refuses both whatever a
 * drawer draws; this keeps the drawers from offering them.
 *
 * `wholeSchool` follows the lens's own rule: until the session carries a
 * branch reach, the home posting stands in for it, and a reader with no home
 * posting is whole-school.
 *
 * `soleBranch` is the one branch a reader covering exactly one works in, so a
 * drawer can file under it without asking.
 */
export function useReaderReach() {
  const { choices, isLoading } = useBranchLens();
  const reach = useAppSelector(selectBranchReach);
  const user = useAppSelector(selectUser);

  const wholeSchool = reach ? reach.whole_tenant : user?.branch_id == null;
  const soleBranch = !wholeSchool && choices.length === 1 ? choices[0] : null;
  const covers = useCallback(
    (ids: number[]) =>
      wholeSchool ||
      (ids.length > 0 && ids.every((id) => choices.some((b) => b.id === id))),
    [wholeSchool, choices],
  );

  return {
    wholeSchool,
    /** The branches this reader may name. */
    branches: choices,
    soleBranch,
    isLoading,
    /** Whether every branch in `ids` is one the reader may name. An empty list is the whole school. */
    covers,
  };
}
