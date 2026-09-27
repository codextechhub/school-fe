import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, ShieldCheck } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import PageAccessDenied from "@/components/custom/page-access-denied";
import PermissionGate from "@/components/custom/permission-gate";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetAllMyBranchesQuery } from "@/redux/services/branches/branches-api";
import { useGetFieldAccessRolesQuery } from "@/redux/services/roles/roles-api";
import { routesPath } from "@/routes/routesPath";
import type { SchoolRole } from "@/redux/services/roles/roles-types";
import { roleDetailPath } from "./role-paths";

/**
 * Permanent role directory for a running school.
 *
 * The list walks every API page so a role does not disappear after the first
 * hundred. Each row opens a full-page record where granted permissions can be
 * read without first entering an edit form.
 *
 * A list that fails to load replaces the page with a retry, rather than
 * rendering as a school with no roles: an administrator who reads "No school
 * roles are available" goes off to create roles that already exist.
 */
export default function Roles() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canView = hasPermission(P.VIEW_ROLES);
  const roles = useGetFieldAccessRolesQuery(undefined, { skip: !canView });
  const branches = useGetAllMyBranchesQuery(undefined, { skip: !canView });
  const [search, setSearch] = useState("");

  const all = useMemo(() => roles.data ?? [], [roles.data]);
  const matching = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? all.filter((role) => role.name.toLowerCase().includes(needle)) : all;
  }, [all, search]);
  const seeded = matching.filter((role) => role.is_system_role);
  const custom = matching.filter((role) => !role.is_system_role);
  const totalPeople = all.reduce((sum, role) => sum + role.assigned_users_count, 0);
  const names = new Map((branches.data ?? []).map((branch) => [branch.id, branch.name]));

  const rowFor = (role: SchoolRole) => {
    const ids = role.branch_ids ?? (role.branch ? [role.branch] : []);
    return {
      _slug: role.key,
      role: <span className="font-semibold text-black-01">{role.name}</span>,
      people: <span>{role.assigned_users_count} {role.assigned_users_count === 1 ? "person" : "people"}</span>,
      permissions: <span>{role.permissions_count} granted</span>,
      reach: <span>{ids.length ? ids.map((id) => names.get(id) ?? `Branch ${id}`).join(", ") : "School-wide"}</span>,
      status: <Badge variant={role.status === "ACTIVE" ? "success" : "inactive"}>{role.status === "ACTIVE" ? "Active" : "Out of use"}</Badge>,
    };
  };

  if (!canView) return <PageAccessDenied />;

  if (roles.isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={ShieldCheck}
          title="We could not load your roles"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => void roles.refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-gray-01">See who can do what across your school. Open a role to review its permissions, people and branch reach.</p>
        </div>
        <PermissionGate permission={P.CREATE_ROLE}><Button data-guide="roles.new" onClick={() => navigate(routesPath.PROTECTED.ROLES.NEW)}><Plus /> Create role</Button></PermissionGate>
      </div>

      <div data-guide="roles.summary" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4 sm:p-5"><p className="text-xs font-medium text-gray-05">Total roles</p><p className="mt-1 text-2xl font-semibold text-black-01">{all.length}</p></div>
        <div className="rounded-xl border border-border bg-white p-4 sm:p-5"><p className="text-xs font-medium text-gray-05">Custom roles</p><p className="mt-1 text-2xl font-semibold text-black-01">{all.filter((role) => !role.is_system_role).length}</p></div>
        <div className="col-span-2 rounded-xl border border-border bg-white p-4 sm:p-5 lg:col-span-1"><p className="text-xs font-medium text-gray-05">Active role assignments</p><p className="mt-1 text-2xl font-semibold text-black-01">{totalPeople}</p></div>
      </div>

      <section data-guide="roles.directory" className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-white p-3.5 sm:p-4">
          <div><h2 className="text-base font-semibold text-black-01">Role directory</h2><p className="mt-1 text-xs text-gray-05">Choose a role to see every permission it holds.</p></div>
          <div className="relative w-full sm:max-w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles" aria-label="Search roles" className="pl-9" /></div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-05">School roles</h3>
          {!roles.isLoading && !seeded.length ? (
            <p className="rounded-xl border border-border bg-white p-6 text-sm text-gray-01">{search ? "No school role matches that search." : "No school roles are available."}</p>
          ) : (
            <CustomTable tableHeaderList={["Role", "People", "Permissions", "Reach", "Status"]} tableBodyList={seeded.map(rowFor)} loading={roles.isLoading} loadingText="Loading roles..." hidePagination cardBreakpoint="lg" onRowClick={(row) => navigate(roleDetailPath("/roles", (row as { _slug: string })._slug))} />
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-05">Custom roles</h3>
          {!roles.isLoading && !custom.length ? (
            <p className="rounded-xl border border-border bg-white p-6 text-sm text-gray-01">{search ? "No custom role matches that search." : "No custom roles yet."}</p>
          ) : (
            <CustomTable tableHeaderList={["Role", "People", "Permissions", "Reach", "Status"]} tableBodyList={custom.map(rowFor)} loading={roles.isLoading} loadingText="Loading roles..." hidePagination cardBreakpoint="lg" onRowClick={(row) => navigate(roleDetailPath("/roles", (row as { _slug: string })._slug))} />
          )}
        </div>
      </section>
    </PageShell>
  );
}
