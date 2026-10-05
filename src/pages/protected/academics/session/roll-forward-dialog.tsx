import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CopyPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchSelect } from "@/components/custom/search-select";
import { parseApiError } from "@/utils/api-error";
import {
  useGetSessionsQuery,
  useRollForwardSessionMutation,
} from "@/redux/services/academics/academics-api";
import type { AcademicSession } from "@/redux/services/academics/academics-types";

/**
 * Starting a year from the one before it.
 *
 * Levels, classes and subjects belong to a year, which keeps last year honest -
 * and would be punishing on its own: a school that has just created 2027/2028
 * would face sixteen levels, eight classes and seven subjects to retype, all
 * identical to last year's. So a new year is seeded from an existing one and
 * the school edits the differences.
 *
 * What is copied is spelled out rather than summarised, because the two things
 * people expect to come with it - pupils, and last year's edits - are exactly
 * the two that do not. The server refuses a year that already has structure, so
 * the dangerous reading of this button (press it twice, get everything twice)
 * cannot happen.
 */

export function RollForwardDialog({
  target,
  open,
  onClose,
}: {
  /** The year being seeded. */
  target: AcademicSession | null;
  open: boolean;
  onClose: () => void;
}) {
  const [source, setSource] = useState("");
  const [roll, { isLoading }] = useRollForwardSessionMutation();

  // Every year, not the list screen's page: the one worth copying from is
  // usually the one that just ended, which a status filter could have hidden.
  const { data } = useGetSessionsQuery({ status: "all" }, { skip: !open });

  const options = useMemo(
    () =>
      (data?.data ?? [])
        .filter((s) => s.id !== target?.id)
        .map((s) => ({
          value: String(s.id),
          label: `${s.name}${s.status === "ACTIVE" ? " · running now" : ""}`,
        })),
    [data, target],
  );

  const submit = async () => {
    if (!target || !source) return;
    try {
      const result = await roll({ id: target.id, from: Number(source) }).unwrap();
      const { levels, classes, subjects } = result.data;
      toast.success(
        `${levels} levels, ${classes} classes and ${subjects} subjects copied into ${target.name}.`,
      );
      setSource("");
      onClose();
    } catch (error) {
      // The interceptor toasts every refusal but this one, which the dialog owns.
      const parsed = parseApiError(error);
      if (parsed.code === "TARGET_YEAR_NOT_EMPTY") {
        toast.error(parsed.message || "That year already has levels, classes or subjects.");
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSource("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CopyPlus className="size-4.5 text-primary" />
            Start {target?.name ?? "this year"} from another year
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Copies the structure across so you edit the differences instead of
            building it again.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
              Copy from *
            </label>
            <SearchSelect
              aria-label="Year to copy from"
              placeholder="Pick a year"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={options}
            />
          </div>

          <div className="rounded-lg border border-border bg-white-05 px-3.5 py-3 text-sm text-gray-01">
            <p className="font-medium text-black-01">What comes across</p>
            <ul className="mt-1.5 grid gap-1 text-[13px]">
              <li>Levels, and which level each one promotes into.</li>
              <li>Classes, with their branch, arm and capacity.</li>
              <li>Subjects, and the levels they are taught at.</li>
            </ul>
            <p className="mt-2.5 text-[13px] text-gray-05 text-pretty">
              Not pupils, and nothing archived. Who sat in JSS1 A last year
              stays last year's record, and a level you withdrew stays
              withdrawn.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!source || isLoading}>
            {isLoading ? "Copying…" : "Copy structure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
