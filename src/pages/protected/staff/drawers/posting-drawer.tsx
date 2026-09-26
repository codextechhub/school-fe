import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Info, Network } from "lucide-react";

import { BranchReachPicker } from "@/components/custom/branch-reach-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import {
  useGetStaffMemberQuery,
  useGetStaffRolesQuery,
  useMoveStaffPostingMutation,
} from "@/redux/services/staff/staff-api";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { useReaderReach } from "./reader-reach";

/**
 * Move where somebody is based.
 *
 * **A posting and a reach are different facts, and this changes only the
 * first.** Where somebody is based is a chosen branch set or the whole school; which
 * branches their access extends to comes from their role grants and can be
 * wider. Moving Mrs. Adeyemi from Lekki to Ikeja does not take Lekki away from
 * her Bursar grant, and the drawer says so before the move rather than leaving
 * a head teacher to discover it.
 *
 * **Assignments do not travel with the person.** Somebody moved away from a
 * branch still teaches the classes they were given there, and the server names
 * them back; the warning is repeated as a toast because it is the one thing
 * about this move that surprises people.
 *
 * **Only the reader's own branches are offered.** A branch administrator
 * covering Ikeja and Lekki picks between those two and is never offered
 * School-wide, which would put the person on every branch's roster. Only a
 * whole-school reader sees every branch and the School-wide choice. The server
 * refuses anything else whatever this drawer draws.
 */
export function PostingDrawer({
  staffIds,
  personName,
  onDone,
  onClose,
}: {
  staffIds: number[];
  /** Named where it is one person, counted where it is several. */
  personName?: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const { wholeSchool, branches, isLoading: branchesLoading } = useReaderReach();
  const person = useGetStaffMemberQuery(staffIds[0] ?? 0, { skip: staffIds.length !== 1 });
  const [move, { isLoading: saving }] = useMoveStaffPostingMutation();
  const roles = useGetStaffRolesQuery(staffIds[0] ?? 0, {
    skip: staffIds.length !== 1,
  });

  const [choice, setChoice] = useState<{ mode: "school" | "selected"; ids: number[] } | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentIds = person.data?.data.posting_branch_ids ?? [];
  const mode =
    choice?.mode ??
    (!wholeSchool
      ? "selected"
      : staffIds.length === 1
        ? currentIds.length ? "selected" : "school"
        : null);
  const ids = choice?.ids ?? currentIds;
  const selectedIds = mode === "school" ? [] : ids;
  const target = selectedIds.length
    ? selectedIds.map((id) => branches.find((branch) => branch.id === id)?.name ?? `Branch ${id}`).join(" and ")
    : "across the whole school";

  async function save() {
    try {
      const result = await move({
        staff_ids: staffIds,
        branch_ids: selectedIds,
        reason: reason.trim() || undefined,
      }).unwrap();

      toast.success(
        `${result.data.moved} ${result.data.moved === 1 ? "person is" : "people are"} now posted to ${target}. Their roles reach exactly what they did before.`,
      );
      for (const warning of result.data.warnings) {
        toast.warning(warning.message);
      }
      onDone();
      onClose();
    } catch (error) {
      const perField = fieldErrors(error);
      if (Object.keys(perField).length) {
        setErrors(perField);
        return;
      }
      toast.error(
        apiErrorMessage(error, "We could not move that posting. Try again."),
      );
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={
        personName
          ? `Change ${personName}'s posting`
          : `Change the posting of ${staffIds.length} people`
      }
      subtitle="Where they are based. Not which branches their roles reach."
      saveLabel="Move posting"
      onSave={() => void save()}
      canSave={staffIds.length > 0 && !person.isLoading && !person.isError && !branchesLoading && branches.length > 0 && mode !== null && (mode === "school" || selectedIds.length > 0)}
      saving={saving}
    >
      <div className="grid gap-4">
        <Field
          label="Posted to"
          error={errors.branch_ids}
          hint={
            wholeSchool
              ? "Selected branches are equal postings. School-wide also includes branches opened later."
              : "Selected branches are equal postings. You can post people only to your own branches."
          }
        >
          <div className="space-y-3">
            {wholeSchool && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" aria-pressed={mode === "school"} onClick={() => setChoice({ mode: "school", ids: [] })} className={`rounded-lg border p-3 text-left text-sm ${mode === "school" ? "border-primary bg-pry-01/40 text-primary" : "border-border"}`}>School-wide</button>
                <button type="button" aria-pressed={mode === "selected"} onClick={() => setChoice({ mode: "selected", ids })} className={`rounded-lg border p-3 text-left text-sm ${mode === "selected" ? "border-primary bg-pry-01/40 text-primary" : "border-border"}`}>Selected branches</button>
              </div>
            )}
            {mode === "selected" && <BranchReachPicker branches={branches} selected={ids} onChange={(next) => setChoice({ mode: "selected", ids: next })} />}
          </div>
        </Field>

        <Field label="Reason" error={errors.reason}>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Covering the Ikeja intake…"
            className={inputClass}
          />
        </Field>

        {staffIds.length === 1 && (
          <section className="rounded-lg border border-white-02 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Network className="size-4 text-primary" />
              <h3 className="text-xs font-semibold text-black-01">
                Role reach stays the same
              </h3>
            </div>

            {roles.isLoading ? (
              <div className="mt-3 grid gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : roles.data ? (
              <div className="mt-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {roles.data.data.reach.school_wide ? (
                    <span className="rounded-full bg-pry-01 px-2.5 py-1 text-xs font-medium text-primary">
                      Every branch
                    </span>
                  ) : roles.data.data.reach.branches.length ? (
                    roles.data.data.reach.branches.map((entry) => (
                      <span
                        key={entry.id}
                        className="rounded-full bg-gray-04 px-2.5 py-1 text-xs text-gray-01"
                      >
                        {entry.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-01">
                      School-wide records only
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-05">
                  {roles.data.data.reach.note}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-05">
                Reach is managed from this person's Roles &amp; access tab.
              </p>
            )}
          </section>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          This moves where they are based. It does not change which branches
          their roles reach, and it does not cancel any class they teach.
        </p>

        {staffIds.length > 1 && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            All {staffIds.length} selected people receive the same posting set.
          </p>
        )}
      </div>
    </DrawerShell>
  );
}
