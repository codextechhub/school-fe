import { useState } from "react";

import { useBranchLens } from "@/hooks/use-branch-lens";

/**
 * Which branch a new group or broadcast belongs to.
 *
 * Branch is a dimension only where it changes meaning. A school with one
 * branch, or a reader whose reach is exactly one, gets no control: the group
 * or broadcast is filed under that branch, or under the whole school at a
 * one-branch school. A reader who may choose between several gets a select,
 * with **All branches** first for somebody whose reach is the whole school,
 * because a school-wide group needs that reach.
 */
export function useComposeBranch() {
  const lens = useBranchLens();
  const initial: number | null = lens.wholeSchool
    ? null
    : (lens.pinnedBranch ?? lens.choices[0]?.id ?? null);
  const [chosen, setChosen] = useState<number | null>(initial);

  const showControl = lens.applies && lens.canChoose;
  const branchId: number | null = !lens.applies
    ? null
    : showControl
      ? chosen
      : (lens.pinnedBranch ?? lens.choices[0]?.id ?? null);

  return {
    showControl,
    branchId,
    setBranchId: setChosen,
    choices: lens.choices,
    wholeSchool: lens.wholeSchool,
    allLabel: lens.allLabel,
  };
}

export type ComposeBranch = ReturnType<typeof useComposeBranch>;
