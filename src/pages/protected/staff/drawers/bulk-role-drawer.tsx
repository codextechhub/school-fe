import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { NativeSelect } from "@/components/ui/native-select";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useGetStaffListQuery,
  useGrantStaffRoleInBulkMutation,
} from "@/redux/services/staff/staff-api";

import { DrawerShell, Field } from "../../students/drawers/drawer-shell";

/**
 * One role, one reach, several people.
 *
 * **Existing roles are untouched.** This adds a grant to everybody selected; it
 * does not replace what they hold. A school promoting four teachers to Exams
 * Officer wants them to still be teachers afterwards.
 *
 * **Anybody who already holds it is named, not silently skipped.** "2 already
 * had it" sends somebody back through a list of forty to work out which two,
 * so the server returns both lists by name and the toast reads them out.
 *
 * The role list is the one the staff endpoint offers, so it is already narrowed
 * for a school that has not gone live - the same list the Add form uses, from
 * the same call.
 */
export function BulkRoleDrawer({
  staffIds,
  onDone,
  onClose,
}: {
  staffIds: number[];
  /** Clears the selection on the screen behind, so it cannot be granted twice. */
  onDone: () => void;
  onClose: () => void;
}) {
  const { data: listData } = useGetStaffListQuery({ page: 1 });
  const { data: branchData } = useGetMyBranchesQuery();
  const [grant, { isLoading: saving }] = useGrantStaffRoleInBulkMutation();

  const [role, setRole] = useState("");
  const [reach, setReach] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roles = listData?.role_options ?? [];
  const branches = branchData?.data ?? [];
  const chosen = roles.find((r) => r.value === role);

  async function save() {
    if (!chosen) return;
    try {
      const result = await grant({
        staff_ids: staffIds,
        role,
        branch: reach || null,
      }).unwrap();
      const { granted, already_held } = result.data;

      toast.success(
        `${chosen.label} granted to ${granted.length} ${granted.length === 1 ? "person" : "people"}.`,
      );
      if (already_held.length) {
        toast.info(
          `${already_held.map((p) => p.name).join(", ")} already held it, so nothing changed for ${already_held.length === 1 ? "them" : "them"}.`,
        );
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
        apiErrorMessage(error, "We could not grant that role. Try again."),
      );
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`Assign a role to ${staffIds.length} ${staffIds.length === 1 ? "person" : "people"}`}
      subtitle="Added to what they already hold, never in place of it."
      saveLabel="Grant role"
      onSave={() => void save()}
      canSave={Boolean(chosen)}
      saving={saving}
    >
      <div className="grid gap-4">
        <Field label="Role" required error={errors.role}>
          <NativeSelect
            aria-label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9"
          >
            <option value="">Select a role</option>
            {roles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {branches.length > 1 && (
          <Field
            label="Reaching"
            error={errors.branch}
            hint="The same reach for everybody selected. Grant a narrower one on a person's own record."
          >
            <NativeSelect
              aria-label="Reaching"
              value={reach}
              onChange={(e) => setReach(e.target.value)}
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
        )}

        <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          Anybody who already holds this role with this reach is left exactly as
          they are, and named back to you.
        </p>
      </div>
    </DrawerShell>
  );
}
