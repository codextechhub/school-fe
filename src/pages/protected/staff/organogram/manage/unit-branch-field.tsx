/**
 * Which branch an org unit belongs to: the whole school, or one branch.
 *
 * The answer stops being a choice in three cases, and each is stated as a
 * sentence instead of offered and then refused:
 *
 * - the school runs one branch, so the field is not drawn at all;
 * - the unit sits under a branch unit, and a child cannot be wider than its
 *   parent, so it takes the parent's branch (`lockedTo`);
 * - the reader works in one branch only, so everything they create is filed
 *   there.
 *
 * A reader who works in several branches but not the whole school is offered
 * those branches and not "The whole school": a school-wide unit speaks for
 * branches they do not work in, and the server refuses it.
 *
 * `value` is a branch id, `null` for the whole school, or `-1` while "One
 * branch" is chosen and no branch has been picked yet.
 */

import { SearchSelect } from "@/components/custom/search-select";
import { cn } from "@/lib/utils";
import { NO_BRANCH_PICKED, useUnitBranchRules, type BranchLock } from "./unit-branch-rules";

export function UnitBranchField({
  value,
  onChange,
  lockedTo,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  lockedTo?: BranchLock | null;
}) {
  const { applies, pinnedBranch, wholeSchool, choices, nameOf } = useUnitBranchRules();
  if (!applies) return null;

  const lock: BranchLock | null =
    lockedTo ??
    (pinnedBranch != null
      ? {
          id: pinnedBranch,
          name: nameOf(pinnedBranch),
          reason: "You work in this branch only, so anything you create belongs to it.",
        }
      : null);

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-[13px] font-medium text-gray-06">Applies to *</p>
      {lock ? (
        <div className="rounded-lg border border-white-02 bg-white-05 px-3 py-2.5">
          <p className="text-sm text-black-01">{lock.name}</p>
          <p className="mt-0.5 text-xs text-gray-05 text-pretty">{lock.reason}</p>
        </div>
      ) : (
        <>
          {wholeSchool && (
            <div className="grid gap-2 sm:grid-cols-2">
              <ScopeOption on={value === null} label="The whole school" onClick={() => onChange(null)} />
              <ScopeOption
                on={value !== null}
                label="One branch"
                onClick={() => onChange(value ?? NO_BRANCH_PICKED)}
              />
            </div>
          )}
          {(value !== null || !wholeSchool) && (
            <div className={cn(wholeSchool && "mt-2")}>
              <SearchSelect
                id="unit-branch"
                placeholder="Search branches"
                value={value === null || value === NO_BRANCH_PICKED ? "" : String(value)}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : NO_BRANCH_PICKED)}
                options={choices.map((b) => ({ value: String(b.id), label: b.name }))}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-gray-05 text-pretty">
            A branch unit and its posts are managed by that branch&apos;s administrators.
          </p>
        </>
      )}
    </div>
  );
}

function ScopeOption({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-sm",
        on ? "border-primary bg-pry-01 text-primary" : "border-white-02 text-gray-06",
      )}
    >
      {label}
    </button>
  );
}
