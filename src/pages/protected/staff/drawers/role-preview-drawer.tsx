import { useMemo } from "react";
import { Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useGetPermissionCatalogueQuery,
  useGetRoleHoldersQuery,
  useGetSchoolRoleQuery,
} from "@/redux/services/roles/roles-api";

import { DrawerShell } from "../../students/drawers/drawer-shell";
import { formatDate } from "../../students/format";

/**
 * What a role reaches, and who holds it. Read-only, on purpose.
 *
 * **The permissions are access control's and are not editable here.** A school
 * changes what a role can do on the roles screen, where the change can be
 * reviewed and where a restricted permission routes through an approval. A
 * second place to edit them would be a second answer to what a role means, and
 * the one that is wrong is always the one nobody remembered to update.
 *
 * So this exists to answer the question somebody asks with their hand on the
 * grant: what am I about to give this person? It names the holders as well,
 * because "who else has this" is the other half of that question.
 */
export function RolePreviewDrawer({
  roleKey,
  onClose,
}: {
  roleKey: string;
  onClose: () => void;
}) {
  const role = useGetSchoolRoleQuery(roleKey);
  const holders = useGetRoleHoldersQuery({ role: roleKey });
  // Only for the wording. The role payload carries keys and nothing else, and
  // `payments.virtual_account.view` is not a sentence a head teacher reads
  // before deciding whether to hand somebody the money. The catalogue is the
  // one place those keys have labels, and the roles screen has usually fetched
  // it already, so this costs nothing on the common path.
  const catalogue = useGetPermissionCatalogueQuery();

  const detail = role.data?.data;
  const rows = holders.data?.data ?? [];

  const labels = useMemo(() => {
    const found = new Map<string, string>();
    for (const module of catalogue.data?.data ?? []) {
      for (const permission of module.permissions) {
        found.set(permission.key, permission.label);
      }
    }
    return found;
  }, [catalogue.data]);

  // Only what the role actually holds. The payload carries every permission it
  // was offered, with a flag, and listing the unticked ones would read as a
  // list of things the role can do.
  const granted = (detail?.role_permissions ?? []).filter((p) => p.granted);

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={detail?.name ?? "Role"}
      subtitle={detail?.description || "What this role reaches, and who holds it."}
      saveLabel="Done"
      onSave={onClose}
      canSave
    >
      {role.isLoading ? (
        <p className="text-[13px] text-gray-05">Loading…</p>
      ) : (
        <div className="grid gap-5">
          <section>
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-black-01">
              <Users className="size-4 text-gray-05" aria-hidden />
              Who holds it
              <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[11px] font-medium text-gray-01">
                {rows.length}
              </span>
            </h3>
            {rows.length ? (
              <ul className="grid gap-2">
                {rows.map((holder) => (
                  <li
                    key={holder.id}
                    className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-black-01">
                        {holder.user_name}
                      </span>
                      <span className="block text-xs text-gray-05">
                        Granted {formatDate(holder.assigned_at)}
                        {holder.assigned_by_name
                          ? ` by ${holder.assigned_by_name}`
                          : ""}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 text-[11px]",
                        holder.branch === null
                          ? "bg-white-03 text-primary"
                          : "bg-gray-04 text-gray-01",
                      )}
                    >
                      {holder.branch === null ? "School-wide" : "One branch"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              // An unheld role is a different kind of thing from one carrying
              // five people, and saying so is more useful than an empty list.
              <p className="rounded-lg bg-gray-04 px-3.5 py-2.5 text-[13px] text-gray-01">
                Nobody holds this role yet.
              </p>
            )}
          </section>

          <section className="border-t border-white-02 pt-4">
            <h3 className="mb-1 text-sm font-semibold text-black-01">
              What it can reach
              <span className="ml-2 rounded-full bg-gray-04 px-2 py-0.5 text-[11px] font-medium text-gray-01">
                {granted.length}
              </span>
            </h3>
            <p className="mb-3 text-xs text-gray-05">
              Defined in access control. Change it on the roles screen, where a
              restricted permission goes through an approval.
            </p>
            {granted.length ? (
              <ul className="grid gap-1.5">
                {granted.map((permission) => {
                  const label = labels.get(permission.permission);
                  return (
                    <li
                      key={permission.permission}
                      // The key is the fallback, in monospace so it reads as
                      // the identifier it is rather than as a broken sentence.
                      // It shows only for a permission this school's catalogue
                      // does not carry, which is a real state worth seeing.
                      className={
                        label
                          ? "text-[13px] text-gray-01"
                          : "font-mono text-xs text-gray-05"
                      }
                    >
                      {label ?? permission.permission}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[13px] text-gray-05">
                This role holds no permissions, so granting it gives nothing.
              </p>
            )}
          </section>
        </div>
      )}
    </DrawerShell>
  );
}
