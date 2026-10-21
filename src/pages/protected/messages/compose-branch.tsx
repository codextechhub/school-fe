import { Field, inputClass } from "@/pages/protected/students/drawers/drawer-shell";

import type { ComposeBranch } from "./use-compose-branch";

/**
 * The branch control of a new group or broadcast, drawn only where the reader
 * has a real choice of branch. See `useComposeBranch` for when that is.
 */
export function BranchSelect({
  branch,
  onChange,
  hintForBranch,
  hintForAll,
}: {
  branch: ComposeBranch;
  onChange?: (id: number | null) => void;
  /** Said while one branch is chosen. */
  hintForBranch: string;
  /** Said while the whole school is chosen. */
  hintForAll: string;
}) {
  if (!branch.showControl) return null;
  return (
    <Field label="Branch" hint={branch.branchId === null ? hintForAll : hintForBranch}>
      <select
        value={branch.branchId ?? ""}
        onChange={(event) => {
          const next = event.target.value === "" ? null : Number(event.target.value);
          branch.setBranchId(next);
          onChange?.(next);
        }}
        className={inputClass}
      >
        {branch.wholeSchool ? <option value="">{branch.allLabel}</option> : null}
        {branch.choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
