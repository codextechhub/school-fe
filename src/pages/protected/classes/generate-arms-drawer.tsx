import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/utils/api-error";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useGenerateArmsMutation } from "@/redux/services/academics/academics-api";
import type {
  Level,
  SchoolClass,
} from "@/redux/services/academics/academics-types";

/**
 * One class per arm, for a level: JSS1 A, JSS1 B, JSS1 C.
 *
 * The preview here says something different from the bulk-levels one, and the
 * difference is the server's. Bulk levels REFUSES the whole batch on a
 * duplicate; generate-arms SKIPS what is already there, deliberately, so a
 * school adding a fourth arm types A, B, C, D and gets one new class rather
 * than an error about the three it already has.
 *
 * So a row already present is marked "Already there" and the save stays
 * enabled - the count on the button is what will actually be created, not how
 * many lines were typed.
 */
export function GenerateArmsDrawer({
  open,
  levels,
  classes,
  onClose,
}: {
  open: boolean;
  levels: Level[];
  /** Everything currently in view, to work out what already exists. */
  classes: SchoolClass[];
  onClose: () => void;
}) {
  const [levelId, setLevelId] = useState<number | null>(null);
  const [arms, setArms] = useState("A, B, C");
  const [branch, setBranch] = useState<number | null>(null);
  const [generate, { isLoading }] = useGenerateArmsMutation();
  const {
    applies: multiBranch,
    isTied,
    branch: lensBranch,
    branches,
  } = useBranchLens();

  const key = open ? "open" : "shut";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      const first = levels[0] ?? null;
      setLevelId(first?.id ?? null);
      setArms("A, B, C");
      setBranch(defaultBranch(first));
    }
  }

  const level = levels.find((l) => l.id === levelId) ?? null;

  /**
   * Where the new classes go.
   *
   * A branch-only level decides for its classes - they cannot be wider than it
   * - so that case is stated rather than offered. A school-wide level does NOT
   * decide: a class is normally run by ONE branch even when its level is shared,
   * which is exactly the arrangement the seeded school has (JSS1 is school-wide
   * while JSS1 A runs at the main branch and JSS1 B at the annex). Leaving that
   * unasked created school-wide classes silently.
   */
  function defaultBranch(forLevel: Level | null): number | null {
    if (forLevel?.branch != null) return forLevel.branch;
    if (isTied && lensBranch !== "all") return lensBranch as number;
    if (lensBranch !== "all") return lensBranch as number;
    return branches[0]?.id ?? null;
  }

  const levelLocks = level?.branch != null;
  const effectiveBranch = levelLocks ? level.branch! : branch;

  const existing = useMemo(
    () =>
      new Set(
        classes
          // Per level AND branch, the constraint's own scope: "JSS1 A" may
          // exist at both branches.
          .filter(
            (c) =>
              c.level === levelId &&
              (c.branch ?? null) === (effectiveBranch ?? null),
          )
          .map((c) => c.name.trim().toLowerCase()),
      ),
    [classes, levelId, effectiveBranch],
  );

  const rows = useMemo(() => {
    if (!level) return [];
    const seen = new Set<string>();
    return arms
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((arm) => {
        const name = `${level.name} ${arm}`;
        const key = name.toLowerCase();
        const already = existing.has(key) || seen.has(key);
        seen.add(key);
        return { arm, name, already };
      });
  }, [arms, level, existing]);

  const toCreate = rows.filter((r) => !r.already).length;

  const save = async () => {
    if (!level) return;
    try {
      const result = await generate({
        level: level.id,
        arms: rows.map((r) => r.arm),
        branch: effectiveBranch,
      }).unwrap();
      toast.success(result.message);
      onClose();
    } catch (error) {
      toast.error(
        parseApiError(error).message || "Those could not be created.",
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="truncate font-mont text-base">
            Generate arms
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            Pick a level and list the arms. One class is created per arm.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-w-0 flex-1" viewportClassName="px-5 py-5">
          <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
            Level *
          </label>
          {levels.length === 0 ? (
            <p className="rounded-lg border border-white-02 bg-white-05 px-3 py-2.5 text-sm text-gray-05 text-pretty">
              There are no levels in view. Add one on the Programmes & Levels
              screen first, or widen the branch filter.
            </p>
          ) : (
            <select
              value={levelId ?? ""}
              onChange={(e) => {
                const next =
                  levels.find((l) => l.id === Number(e.target.value)) ?? null;
                setLevelId(next?.id ?? null);
                setBranch(defaultBranch(next));
              }}
              aria-label="Level"
              className="w-full rounded-lg border border-white-02 px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.program_name}
                </option>
              ))}
            </select>
          )}

          <div className="mt-4">
            <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
              Arms *
            </label>
            <input
              value={arms}
              onChange={(e) => setArms(e.target.value)}
              placeholder="A, B, C"
              className="w-full rounded-lg border border-white-02 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-gray-05">
              Separate with commas. Names like Science or Commercial work too.
            </p>
          </div>

          {multiBranch && (
            <div className="mt-4">
              <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
                Runs at *
              </label>
              {levelLocks || isTied ? (
                <div className="rounded-lg border border-white-02 bg-white-05 px-3 py-2.5">
                  <p className="text-sm text-black-01">
                    {branches.find((b) => b.id === effectiveBranch)?.name ??
                      "This branch"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-05 text-pretty">
                    {levelLocks
                      ? `${level?.name} belongs to this branch, so its classes do too.`
                      : "Your account is tied to this branch, so anything you create belongs to it."}
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={branch ?? ""}
                    onChange={(e) =>
                      setBranch(e.target.value ? Number(e.target.value) : null)
                    }
                    aria-label="Runs at"
                    className="w-full rounded-lg border border-white-02 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    <option value="">Every branch</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-05 text-pretty">
                    A class is normally run by one branch, even where its level
                    is shared.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-[13px] font-medium text-gray-06">
              What will be created
            </p>
            {rows.length === 0 ? (
              <p className="text-xs text-gray-05">Nothing to create yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-white-02">
                {rows.map((row, i) => (
                  <div
                    key={`${row.name}-${i}`}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                      i > 0 && "border-t border-white-02",
                    )}
                  >
                    <span className="min-w-0 truncate text-black-01">
                      {row.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        row.already ? "text-gray-05" : "text-green-01-text",
                      )}
                    >
                      {row.already ? "Already there" : "New"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {rows.length > 0 && toCreate === 0 && (
              <p className="mt-2 text-xs text-gray-05 text-pretty">
                Every one of these already exists at {level?.name}. Nothing to
                do.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white-02 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={!level || toCreate === 0 || isLoading}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {toCreate > 1 ? `Create ${toCreate} classes` : "Create class"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
