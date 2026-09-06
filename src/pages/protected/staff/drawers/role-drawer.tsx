import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Info, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useAssignRoleMutation,
  useGetSchoolRolesQuery,
  useRevokeRoleAssignmentMutation,
} from "@/redux/services/roles/roles-api";
import {
  useGetStaffListQuery,
  useGetStaffRolesQuery,
} from "@/redux/services/staff/staff-api";
import type { StaffDetail } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { formatDate } from "../../students/format";

/**
 * What one person may do, and the two ways to change it.
 *
 * **Grants are plural and each carries its own reach.** Mr. Eze teaches at
 * Lekki on Monday to Wednesday and at Ikeja on Thursday and Friday: that is two
 * Teacher grants, one pinned to each branch, and the database was split in two
 * to allow it. So this adds a grant rather than replacing one, and the list
 * above the form is every grant they hold rather than "their role".
 *
 * **Revoking keeps the row.** It moves to the withdrawn list on their Access
 * tab with who did it and why, because "what could this person do before" is
 * the question asked after something has gone wrong.
 *
 * **Before go-live the picker narrows to the two administrator roles**, which
 * is the server's rule rather than this drawer's: onboarding has one
 * administrator in it and nobody reviews what they grant. The narrowed list is
 * read from the staff endpoint, which already applies it.
 */
export function RoleDrawer({
  person,
  onClose,
  onPreviewRole,
}: {
  person: StaffDetail;
  onClose: () => void;
  /** Opens the read-only view of what a role reaches. */
  onPreviewRole: (roleKey: string) => void;
}) {
  const held = useGetStaffRolesQuery(person.id);
  const catalogue = useGetSchoolRolesQuery();
  // The roles this school may hand out RIGHT NOW, already narrowed for a
  // pending school. The catalogue above is every role it has, which is a
  // different list before go-live.
  const { data: listData } = useGetStaffListQuery({ page: 1 });
  const { data: branchData } = useGetMyBranchesQuery();

  const [assign, { isLoading: granting }] = useAssignRoleMutation();
  const [revoke, { isLoading: revoking }] = useRevokeRoleAssignmentMutation();

  const [roleKey, setRoleKey] = useState("");
  const [reach, setReach] = useState("");
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const branches = branchData?.data ?? [];
  const offered = useMemo(() => listData?.role_options ?? [], [listData]);
  const grants = held.data?.data.roles ?? [];

  // The catalogue carries the numeric id the assignment endpoint wants; the
  // offered list carries the key the school may use. Joined here so the picker
  // can only offer a role that is both allowed and resolvable.
  const roles = useMemo(() => {
    const byKey = new Map(
      (catalogue.data?.data ?? []).map((role) => [role.key, role]),
    );
    return offered
      .map((option) => ({ ...option, id: byKey.get(option.value)?.id }))
      .filter((option): option is typeof option & { id: number } =>
        Boolean(option.id),
      );
  }, [catalogue.data, offered]);

  const chosen = roles.find((role) => role.value === roleKey);
  // Named rather than silently refused: the server would answer a duplicate,
  // and "they already hold that here" is a sentence somebody can act on.
  const duplicate = grants.some(
    (grant) =>
      grant.role_key === roleKey &&
      (reach ? String(grant.branch_id) === reach : grant.school_wide),
  );

  async function grant() {
    if (!chosen) return;
    try {
      await assign({
        // The ACCOUNT's id. The staff record's is a different number.
        user: person.user_id,
        role: chosen.id,
        branch: reach ? Number(reach) : null,
      }).unwrap();
      toast.success(
        `${chosen.label} granted${reach ? "" : " across the whole school"}.`,
      );
      setRoleKey("");
      setReach("");
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

  async function withdraw() {
    if (revokingId == null) return;
    try {
      await revoke({ id: revokingId, reason_note: reason.trim() }).unwrap();
      toast.success("Role withdrawn. The record of it stays on their history.");
      setRevokingId(null);
      setReason("");
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not withdraw that role. Try again."),
      );
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Roles and access"
      subtitle={`What ${person.full_name} may do, and which branches it reaches.`}
      saveLabel="Grant role"
      onSave={() => void grant()}
      canSave={Boolean(chosen) && !duplicate}
      saving={granting}
    >
      <div className="grid gap-5">
        <section>
          <h3 className="mb-2.5 text-sm font-semibold text-black-01">
            Roles held now
          </h3>
          {held.isLoading ? (
            <p className="text-[13px] text-gray-05">Loading…</p>
          ) : grants.length ? (
            <ul className="grid gap-2.5">
              {grants.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-white-02 px-3.5 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <ShieldCheck
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-black-01">
                      {row.role}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px]",
                        row.school_wide
                          ? "bg-white-03 text-primary"
                          : "bg-gray-04 text-gray-01",
                      )}
                    >
                      {row.branch_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevokingId(row.id)}
                      className="ml-auto text-xs text-error-text underline-offset-2 hover:underline"
                    >
                      Withdraw
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-05">
                    Granted {formatDate(row.granted_at)}
                    {row.granted_by ? ` by ${row.granted_by.name}` : ""}
                  </p>

                  {/* The reason is asked for inline rather than in a second
                      dialog over a drawer, which stacks two layers over the
                      list somebody is trying to read. */}
                  {revokingId === row.id && (
                    <div className="mt-2.5 grid gap-2.5 rounded-lg bg-gray-04 p-3">
                      <Field label="Why is this being withdrawn?" required>
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Changed job, left the department…"
                          className={inputClass}
                        />
                      </Field>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setRevokingId(null);
                            setReason("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700"
                          disabled={revoking || reason.trim().length === 0}
                          onClick={() => void withdraw()}
                        >
                          {revoking ? "Withdrawing…" : "Withdraw"}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-gray-04 px-3.5 py-2.5 text-[13px] text-gray-01">
              No role yet, so they can sign in and reach nothing.
            </p>
          )}
        </section>

        <section className="border-t border-white-02 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-black-01">
            Add a role
          </h3>
          <div className="grid gap-4">
            <Field label="Role" required error={errors.role}>
              <NativeSelect
                aria-label="Role"
                value={roleKey}
                onChange={(e) => setRoleKey(e.target.value)}
                className="h-9"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {branches.length > 1 && (
              <Field
                label="This role reaches"
                error={errors.branch}
                hint="One branch, or the whole school. Somebody can hold the same role at two branches, and their reach is then both."
              >
                <NativeSelect
                  aria-label="This role reaches"
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

            {duplicate && (
              <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                {person.full_name} already holds {chosen?.label} with that
                reach.
              </p>
            )}

            {chosen && (
              <button
                type="button"
                onClick={() => onPreviewRole(chosen.value)}
                className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-left text-xs text-gray-01 hover:bg-white-02"
              >
                <Info className="mt-px size-3.5 shrink-0 text-primary" />
                <span>
                  What a role can do is defined in access control, not here.
                  <span className="ml-1 font-medium text-primary underline-offset-2 hover:underline">
                    See everything {chosen.label} reaches
                  </span>
                </span>
              </button>
            )}

            <p className="text-xs text-gray-05">
              The platform-wide super administrator is not a school role and is
              not offered here.
            </p>
          </div>
        </section>
      </div>
    </DrawerShell>
  );
}
