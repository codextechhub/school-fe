import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Lock, Pencil, Search, Trash2, UsersRound } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { AssignRolePanel } from "./assign-role-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetAllMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useDeleteSchoolRoleMutation,
  useGetAccessCatalogueQuery,
  useGetAllRoleHoldersQuery,
  useGetSchoolRoleQuery,
  useSetSchoolRoleStatusMutation,
} from "@/redux/services/roles/roles-api";
import type { CatalogueModule, SchoolRoleDetail } from "@/redux/services/roles/roles-types";
import { writeErrorMessage } from "@/utils/api-error";
import { roleBasePath } from "./role-paths";

type RoleTab = "permissions" | "people" | "overview";

/** A role's grants are grouped from the school catalogue, with unknown keys visible. */
function grantedGroups(role: SchoolRoleDetail, modules: CatalogueModule[]) {
  const granted = new Set(
    role.role_permissions.filter((entry) => entry.granted).map((entry) => entry.permission),
  );
  const groups: { label: string; permissions: { key: string; label: string; action: string }[] }[] = [];
  for (const module of modules) {
    const entries = module.resources.flatMap((resource) =>
      resource.permissions
        .filter((permission) => granted.has(permission.key))
        .map((permission) => ({
          key: permission.key,
          label: permission.label,
          action: permission.action,
        })),
    );
    if (entries.length) groups.push({ label: module.label, permissions: entries });
    for (const entry of entries) granted.delete(entry.key);
  }
  if (granted.size) {
    groups.push({
      label: "Other permissions",
      permissions: [...granted].map((key) => ({ key, label: key.replaceAll(/[._]/g, " "), action: "" })),
    });
  }
  return groups;
}

/** Full-page role record with a direct, searchable view of grants. */
export default function RoleView() {
  const { key = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const base = roleBasePath(location.pathname);
  const [params, setParams] = useSearchParams();
  const tab: RoleTab = params.get("tab") === "people"
    ? "people"
    : params.get("tab") === "overview"
      ? "overview"
      : "permissions";
  const { hasPermission } = usePermissions();
  const canView = hasPermission(P.VIEW_ROLES);
  const role = useGetSchoolRoleQuery(key, { skip: !key || !canView });
  const catalogue = useGetAccessCatalogueQuery(undefined, { skip: !canView });
  const branches = useGetAllMyBranchesQuery(undefined, { skip: !canView });
  const holders = useGetAllRoleHoldersQuery({ role: key }, { skip: tab !== "people" || !canView });
  const [setStatus, statusState] = useSetSchoolRoleStatusMutation();
  const [deleteRole, deleteState] = useDeleteSchoolRoleMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [search, setSearch] = useState("");

  const detail = role.data?.data;
  const groups = useMemo(
    () => detail ? grantedGroups(detail, catalogue.data?.data ?? []) : [],
    [detail, catalogue.data],
  );
  const pendingLabels = useMemo(() => {
    const labels = new Map((catalogue.data?.data ?? []).flatMap((module) => module.resources)
      .flatMap((resource) => resource.permissions).map((permission) => [permission.key, permission.label]));
    return (detail?.pending_additions ?? []).map((entry) => labels.get(entry.permission_key) ?? entry.permission_key);
  }, [detail, catalogue.data]);
  const branchIds = detail?.branch_ids ?? (detail?.branch ? [detail.branch] : []);
  const branchNames = branchIds.map((id) =>
    branches.data?.find((entry) => entry.id === id)?.name ?? `Branch ${id}`,
  );
  const reachLabel = branchNames.length ? branchNames.join(", ") : "School-wide";
  const needle = search.trim().toLowerCase();
  const visibleGroups = groups.map((group) => ({
    ...group,
    permissions: group.permissions.filter((entry) =>
      !needle || entry.label.toLowerCase().includes(needle) || entry.key.toLowerCase().includes(needle),
    ),
  })).filter((group) => group.permissions.length);

  const switchTab = (next: RoleTab) => {
    setParams((previous) => {
      const updated = new URLSearchParams(previous);
      if (next === "permissions") updated.delete("tab");
      else updated.set("tab", next);
      return updated;
    });
  };

  const toggleStatus = async () => {
    if (!detail) return;
    const next = detail.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await setStatus({
        key,
        status: next,
        reason: next === "INACTIVE" ? "Taken out of use from role management." : "Put back in use from role management.",
      }).unwrap();
      toast.success(next === "ACTIVE" ? `${detail.name} is in use.` : `${detail.name} is out of use.`);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not change this role's status."));
    }
  };

  const remove = async () => {
    if (!detail) return;
    try {
      await deleteRole(key).unwrap();
      toast.success(`${detail.name} deleted.`);
      navigate(base);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not delete this role."));
    }
  };

  if (!canView) return <PageAccessDenied />;
  if (role.isError) return <PageShell><p role="alert">We could not load this role. <button type="button" className="text-primary underline" onClick={() => navigate(base)}>Back to roles</button></p></PageShell>;
  if (role.isLoading || !detail) {
    return <PageShell className="content-start gap-4" grid><Skeleton className="h-8 w-64" /><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></PageShell>;
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <button type="button" onClick={() => navigate(base)} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to roles
      </button>

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-2xl font-semibold tracking-[-0.02em] text-black-01">{detail.name}</h1>
            <Badge variant={detail.status === "ACTIVE" ? "success" : "inactive"}>{detail.status === "ACTIVE" ? "Active" : "Out of use"}</Badge>
          </div>
          {detail.description && <p className="mt-2 max-w-3xl text-sm text-gray-01">{detail.description}</p>}
          <p className="mt-2 text-xs text-gray-05">{reachLabel} · {detail.assigned_users_count} people · {detail.permissions_count} permissions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!detail.is_locked && hasPermission(P.MODIFY_ROLE) && (
            <>
              <Button variant="outline" onClick={() => void toggleStatus()} loading={statusState.isLoading}>
                {detail.status === "ACTIVE" ? "Take out of use" : "Put back in use"}
              </Button>
              <Button onClick={() => navigate(`${base}/${encodeURIComponent(key)}/edit`)}><Pencil /> Edit role</Button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-full overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-6">
          {(["permissions", "people", "overview"] as const).map((entry) => (
            <button
              type="button"
              key={entry}
              onClick={() => switchTab(entry)}
              aria-current={tab === entry ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium capitalize ${tab === entry ? "border-primary text-primary" : "border-transparent text-gray-05 hover:text-black-01"}`}
            >
              {entry}{entry === "permissions" ? ` (${detail.permissions_count})` : entry === "people" ? ` (${detail.assigned_users_count})` : ""}
            </button>
          ))}
        </div>
      </div>

      {tab === "permissions" && (
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0 rounded-xl border border-border bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-black-01">Permissions this role holds</h2><p className="mt-1 text-sm text-gray-01">Only granted permissions are shown, grouped by work.</p></div>
              <Badge variant="inactive">{detail.permissions_count} granted</Badge>
            </div>
            {pendingLabels.length > 0 && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-medium"><Lock className="size-4 shrink-0" /> Waiting for approval</p>
                <p className="mt-1 text-xs">{pendingLabels.join(", ")}. {pendingLabels.length === 1 ? "This restricted permission takes" : "These restricted permissions take"} effect once the request is approved under Approvals.</p>
              </div>
            )}
            <div className="relative mt-5 max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search granted permissions" aria-label="Search granted permissions" className="pl-9" />
            </div>
            {visibleGroups.length ? visibleGroups.map((group) => (
              <section key={group.label} className="mt-4 overflow-hidden rounded-lg border border-border">
                <div className="flex justify-between gap-2 bg-gray-04 px-4 py-3 text-sm font-semibold"><span>{group.label}</span><span className="text-xs font-normal text-gray-05">{group.permissions.length} permissions</span></div>
                {group.permissions.map((entry) => (
                  <div key={entry.key} className="flex flex-wrap items-start justify-between gap-2 border-t border-border px-4 py-3 text-sm">
                    <span className="min-w-0 font-medium text-black-01">{entry.label}</span><span className="text-xs text-gray-05">{entry.action}</span>
                  </div>
                ))}
              </section>
            )) : <p className="mt-6 rounded-lg bg-gray-04 px-4 py-6 text-sm text-gray-01">{needle ? "No granted permission matches that search." : "This role holds no permissions yet."}</p>}
          </section>
          <aside className="h-fit rounded-xl border border-border bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-05">Role at a glance</h2>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-gray-05">Branch reach</dt><dd className="mt-1 font-medium text-black-01">{reachLabel}</dd></div><div><dt className="text-xs text-gray-05">Status</dt><dd className="mt-1 font-medium text-black-01">{detail.status === "ACTIVE" ? "Active" : "Out of use"}</dd></div><div><dt className="text-xs text-gray-05">People</dt><dd className="mt-1 font-medium text-black-01">{detail.assigned_users_count}</dd></div></dl>
            {detail.is_locked && <p className="mt-5 flex gap-2 rounded-lg bg-gray-04 p-3 text-xs text-gray-01"><Lock className="size-4 shrink-0" /> This role is locked.</p>}
            {!location.pathname.startsWith("/onboarding/") && !detail.is_system_role && !detail.is_locked && hasPermission(P.DELETE_ROLE) && (
              <div className="mt-5 border-t border-border pt-4">
                <Button variant="outline" className="w-full" disabled={detail.has_assignment_history} onClick={() => setDeleteOpen(true)}><Trash2 /> Delete role</Button>
                {detail.has_assignment_history && <p className="mt-2 text-xs text-gray-05">This role has assignment history. Take it out of use to preserve that record.</p>}
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === "people" && (
        <section className="max-w-4xl rounded-xl border border-border bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2"><UsersRound className="size-5 text-primary" /><h2 className="text-lg font-semibold">People with this role</h2></div>
          <p className="mt-1 text-sm text-gray-01">See each person's reach from this role.</p>
          {holders.isLoading ? <Skeleton className="mt-5 h-32 w-full" /> : (
            <div className="mt-5 space-y-2">
              {(holders.data ?? []).map((holder) => (
                <div key={holder.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3">
                  <div className="min-w-0"><p className="font-medium text-black-01">{holder.user_name}</p><p className="break-all text-xs text-gray-05">{holder.user_email}</p></div>
                  <Badge variant="inactive">{holder.branch == null ? reachLabel : branches.data?.find((entry) => entry.id === holder.branch)?.name ?? `Branch ${holder.branch}`}</Badge>
                </div>
              ))}
              {holders.isError && <p role="alert" className="rounded-lg bg-gray-04 p-4 text-sm text-gray-01">We could not load the people holding this role.</p>}
              {!holders.isError && !holders.data?.length && <p className="rounded-lg bg-gray-04 p-4 text-sm text-gray-01">Nobody holds this role yet.</p>}
            </div>
          )}
          {hasPermission(P.ASSIGN_ROLE) && <div className="mt-5"><AssignRolePanel roleId={detail.id} roleName={detail.name} heldBy={(holders.data ?? []).map((holder) => holder.user_id)} onAssigned={holders.refetch} /></div>}
        </section>
      )}

      {tab === "overview" && (
        <section className="max-w-4xl rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold">About this role</h2>
          <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-gray-05">Name</dt><dd className="mt-1 font-medium">{detail.name}</dd></div><div><dt className="text-gray-05">Branch reach</dt><dd className="mt-1 font-medium">{reachLabel}</dd></div><div><dt className="text-gray-05">Description</dt><dd className="mt-1 font-medium">{detail.description || "No description"}</dd></div><div><dt className="text-gray-05">Type</dt><dd className="mt-1 font-medium">{detail.is_system_role ? "School role" : "Custom role"}</dd></div></dl>
        </section>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {detail.name}?</AlertDialogTitle><AlertDialogDescription>This removes the custom role. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep role</AlertDialogCancel><AlertDialogAction onClick={() => void remove()} disabled={deleteState.isLoading}>Delete role</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
