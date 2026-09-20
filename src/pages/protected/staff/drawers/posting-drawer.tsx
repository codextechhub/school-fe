import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Info, Network } from "lucide-react";

import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useGetStaffRolesQuery,
  useMoveStaffPostingMutation,
} from "@/redux/services/staff/staff-api";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";

/**
 * Move where somebody is based.
 *
 * **A posting and a reach are different facts, and this changes only the
 * first.** Where somebody is based is one branch or the whole school; which
 * branches their access extends to comes from their role grants and can be
 * wider. Moving Mrs. Adeyemi from Lekki to Ikeja does not take Lekki away from
 * her Bursar grant, and the drawer says so before the move rather than leaving
 * a head teacher to discover it.
 *
 * **Assignments do not travel with the person.** Somebody moved away from a
 * branch still teaches the classes they were given there, and the server names
 * them back; the warning is repeated as a toast because it is the one thing
 * about this move that surprises people.
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
  const { data: branchData } = useGetMyBranchesQuery();
  const [move, { isLoading: saving }] = useMoveStaffPostingMutation();
  const roles = useGetStaffRolesQuery(staffIds[0] ?? 0, {
    skip: staffIds.length !== 1,
  });

  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const branches = branchData?.data ?? [];
  const target =
    branch === ""
      ? "across the whole school"
      : (branches.find((b) => String(b.id) === branch)?.name ?? "that branch");

  async function save() {
    try {
      const result = await move({
        staff_ids: staffIds,
        branch: branch || null,
        reason: reason.trim() || undefined,
      }).unwrap();

      toast.success(
        `${result.data.moved} ${result.data.moved === 1 ? "person is" : "people are"} now based ${target}. Their roles reach exactly what they did before.`,
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
      canSave={staffIds.length > 0}
      saving={saving}
    >
      <div className="grid gap-4">
        <Field
          label="Posted to"
          error={errors.branch}
          hint="Across the whole school is a real answer, not a blank: a registrar belongs to the school and appears on every branch's roster."
        >
          <NativeSelect
            aria-label="Posted to"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="h-9"
          >
            <option value="">Across the whole school</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
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
            All {staffIds.length} selected people are moved to the same place.
          </p>
        )}
      </div>
    </DrawerShell>
  );
}
