import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

import { AccessCataloguePicker } from "@/components/custom/access-catalogue-picker";
import { BranchReachPicker } from "@/components/custom/branch-reach-picker";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetAllMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useCreateSchoolRoleMutation,
  useGetAccessCatalogueQuery,
  useGetSchoolRoleQuery,
  useUpdateSchoolRoleMutation,
} from "@/redux/services/roles/roles-api";
import type { PendingAddition } from "@/redux/services/roles/roles-types";
import { fieldErrors, writeErrorMessage } from "@/utils/api-error";
import { roleBasePath, roleDetailPath } from "./role-paths";

interface Draft {
  key: string;
  name: string;
  description: string;
  reason: string;
  branchMode: "school" | "selected" | null;
  branchIds: number[];
  ticked: Set<string>;
}

const sameIds = (left: number[], right: number[]) =>
  left.length === right.length && left.every((id) => right.includes(id));

/** The toast's second sentence when a save sent permissions for approval. */
const sentForApproval = (pending: PendingAddition[]) =>
  pending.length === 0 ? "" : pending.length === 1
    ? " 1 restricted permission was sent for approval. Find it under Approvals."
    : ` ${pending.length} restricted permissions were sent for approval. Find them under Approvals.`;

/**
 * Full-page role writer shared by onboarding and the permanent role directory.
 *
 * A permission save replaces the entire granted set, so it sends all checked
 * keys. Branch ids have the same replacement meaning; an empty list is an
 * explicit school-wide choice. The reason travels with either access change.
 *
 * A restricted permission the role does not already hold is never granted by
 * the save, whoever holds the role. The server saves everything else and
 * raises one approval request for the restricted ones, using the reason as its
 * justification, so the editor says before saving which boxes will wait and
 * lists the ones already waiting from an earlier save.
 */
export default function RoleEditor() {
  const { key = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const base = roleBasePath(location.pathname);
  const creating = location.pathname.endsWith("/new");
  const draftKey = creating ? "new" : key;
  const { hasPermission } = usePermissions();
  const mayWrite = hasPermission(creating ? P.CREATE_ROLE : P.MODIFY_ROLE);
  const role = useGetSchoolRoleQuery(key, { skip: creating || !mayWrite || !key });
  const catalogue = useGetAccessCatalogueQuery(undefined, { skip: !mayWrite });
  const branches = useGetAllMyBranchesQuery(undefined, { skip: !mayWrite });
  const [createRole, createState] = useCreateSchoolRoleMutation();
  const [updateRole, updateState] = useUpdateSchoolRoleMutation();
  const [edits, setEdits] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detail = role.data?.data;
  const baselineIds = detail?.branch_ids ?? (detail?.branch ? [detail.branch] : []);
  const baseline = useMemo(
    () => new Set(detail?.role_permissions.filter((entry) => entry.granted).map((entry) => entry.permission) ?? []),
    [detail],
  );
  const initial = (): Draft => ({
    key: draftKey,
    name: detail?.name ?? "",
    description: detail?.description ?? "",
    reason: "",
    branchMode: creating ? null : baselineIds.length ? "selected" : "school",
    branchIds: baselineIds,
    ticked: baseline,
  });
  const draft = edits?.key === draftKey ? edits : initial();
  const patch = (change: Partial<Draft>) => {
    setEdits({ ...draft, ...change, key: draftKey });
    setErrors({});
  };
  const toggle = (permission: string) => {
    setEdits((current) => {
      const from = current?.key === draftKey ? current : initial();
      const ticked = new Set(from.ticked);
      if (ticked.has(permission)) ticked.delete(permission);
      else ticked.add(permission);
      return { ...from, ticked };
    });
    setErrors({});
  };

  const permissionChanged = draft.ticked.size !== baseline.size || [...draft.ticked].some((id) => !baseline.has(id));
  const selectedIds = draft.branchMode === "selected" ? draft.branchIds : [];
  const branchChanged = !sameIds(selectedIds, baselineIds);
  const nameChanged = draft.name.trim() !== (detail?.name ?? "").trim();
  const descriptionChanged = draft.description.trim() !== (detail?.description ?? "").trim();
  const dirty = creating || nameChanged || descriptionChanged || branchChanged || permissionChanged;
  const cataloguePermissions = (catalogue.data?.data ?? []).flatMap((module) => module.resources)
    .flatMap((resource) => resource.permissions);
  const labels = new Map(cataloguePermissions.map((permission) => [permission.key, permission.label]));
  const restricted = new Set(cataloguePermissions.filter((permission) => permission.is_restricted).map((permission) => permission.key));
  const waiting = new Set((detail?.pending_additions ?? []).map((entry) => entry.permission_key));
  const restrictedAdditions = [...draft.ticked].filter((id) => restricted.has(id) && !baseline.has(id) && !waiting.has(id));
  const labelList = (keys: Iterable<string>) => [...keys].map((id) => labels.get(id) ?? id).join(", ");
  const saving = createState.isLoading || updateState.isLoading;
  const canChooseBranches = (branches.data?.length ?? 0) > 0;

  const save = async () => {
    const name = draft.name.trim();
    if (!name) return setErrors({ name: "Give the role a name." });
    if (canChooseBranches && draft.branchMode === null) {
      return setErrors({ branch_ids: "Choose school-wide or selected branches." });
    }
    if (draft.branchMode === "selected" && selectedIds.length === 0) {
      return setErrors({ branch_ids: "Choose at least one branch, or choose school-wide." });
    }
    if ((creating || permissionChanged || branchChanged) && !draft.reason.trim()) {
      return setErrors({ reason: "Say why this access is needed or changing." });
    }
    try {
      if (creating) {
        const result = await createRole({
          name,
          description: draft.description.trim(),
          permission_keys: [...draft.ticked],
          branch_ids: selectedIds,
          reason: draft.reason.trim(),
        }).unwrap();
        toast.success(`${name} created.${sentForApproval(result.data.pending_additions)}`);
        navigate(roleDetailPath(base, result.data.key));
      } else {
        const result = await updateRole({
          key,
          ...(nameChanged ? { name } : {}),
          ...(descriptionChanged ? { description: draft.description.trim() } : {}),
          ...(branchChanged ? { branch_ids: selectedIds } : {}),
          ...(permissionChanged ? { permission_keys: [...draft.ticked] } : {}),
          ...((permissionChanged || branchChanged) ? { reason: draft.reason.trim() } : {}),
        }).unwrap();
        toast.success(`${name} updated.${sentForApproval(result.data.pending_additions.filter((entry) => restrictedAdditions.includes(entry.permission_key)))}`);
        navigate(roleDetailPath(base, key));
      }
    } catch (error) {
      const fields = fieldErrors(error);
      if (Object.keys(fields).length) {
        setErrors({ ...fields, ...(fields.key ? { name: fields.key } : {}) });
      } else {
        toast.error(writeErrorMessage(error, "We could not save this role."));
      }
    }
  };

  if (!mayWrite) return <PageAccessDenied />;
  if (!creating && role.isError) return <PageShell><p role="alert">We could not load this role. <button type="button" className="text-primary underline" onClick={() => navigate(base)}>Back to roles</button></p></PageShell>;
  if (!creating && role.isLoading) return <PageShell><Skeleton className="h-96 w-full" /></PageShell>;
  if (!creating && (!detail || detail.is_locked)) return <PageAccessDenied />;

  return (
    <PageShell className="content-start gap-5" grid>
      <button type="button" onClick={() => navigate(creating ? base : roleDetailPath(base, key))} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" /> Back to {creating ? "roles" : "role"}</button>
      <div><h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">{creating ? "Create Role" : `Edit ${detail?.name}`}</h1><p className="mt-1 text-sm text-gray-01">Name the job, choose its branch reach, and grant the permissions it needs.</p></div>
      {errors.form && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{errors.form}</p>}
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
        <section data-guide="roles-editor.details" className="min-w-0 rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-black-01">Role details</h2>
          <p className="mt-1 text-sm text-gray-01">Help your team recognise and assign the role.</p>
          <div className="mt-6 space-y-5">
            <label className="grid gap-2 text-sm font-medium text-black-01">Role name <span className="sr-only">required</span><Input value={draft.name} onChange={(event) => patch({ name: event.target.value })} aria-invalid={Boolean(errors.name)} placeholder="e.g. Assistant Bursar" /></label>
            {errors.name && <p role="alert" className="-mt-4 text-xs text-error">{errors.name}</p>}
            <label className="grid gap-2 text-sm font-medium text-black-01">Description<Textarea value={draft.description} onChange={(event) => patch({ description: event.target.value })} placeholder="What is this role for?" rows={3} /></label>
            {errors.description && <p role="alert" className="-mt-4 text-xs text-error">{errors.description}</p>}
            {canChooseBranches && (
              <div data-guide="roles-editor.branch-reach" className="space-y-3">
                <div><p className="text-sm font-medium text-black-01">Branch reach</p><p className="mt-1 text-xs text-gray-05">People given this role automatically receive its full branch reach.</p></div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" aria-pressed={draft.branchMode === "school"} onClick={() => patch({ branchMode: "school", branchIds: [] })} className={`rounded-lg border p-3 text-left text-sm ${draft.branchMode === "school" ? "border-primary bg-pry-01/40 text-primary" : "border-border"}`}><span className="block font-semibold">School-wide</span><span className="mt-1 block text-xs text-gray-05">All branches, including future ones</span></button>
                  <button type="button" aria-pressed={draft.branchMode === "selected"} onClick={() => patch({ branchMode: "selected" })} className={`rounded-lg border p-3 text-left text-sm ${draft.branchMode === "selected" ? "border-primary bg-pry-01/40 text-primary" : "border-border"}`}><span className="block font-semibold">Selected branches</span><span className="mt-1 block text-xs text-gray-05">Only the branches you choose</span></button>
                </div>
                {draft.branchMode === "selected" && <BranchReachPicker branches={branches.data ?? []} selected={draft.branchIds} onChange={(branchIds) => patch({ branchIds })} />}
                {errors.branch_ids && <p role="alert" className="text-xs text-error">{errors.branch_ids}</p>}
              </div>
            )}
            {(creating || permissionChanged || branchChanged) && (
              <label data-guide="roles-editor.reason" className="grid gap-2 text-sm font-medium text-black-01">Why is this role needed or changing?<Input value={draft.reason} onChange={(event) => patch({ reason: event.target.value })} aria-invalid={Boolean(errors.reason)} placeholder="e.g. Ada covers fees in Ikeja and Yaba" />{errors.reason && <span role="alert" className="text-xs text-error">{errors.reason}</span>}</label>
            )}
            {restrictedAdditions.length > 0 && <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><Lock className="size-4 shrink-0" /> <span>{labelList(restrictedAdditions)} {restrictedAdditions.length === 1 ? "is a restricted permission" : "are restricted permissions"}. The role saves now and sends {restrictedAdditions.length === 1 ? "it" : "them"} for approval; {restrictedAdditions.length === 1 ? "it takes" : "they take"} effect once approved.</span></p>}
            {waiting.size > 0 && <p className="flex gap-2 rounded-lg border border-border bg-gray-04 p-3 text-xs text-gray-01"><Lock className="size-4 shrink-0" /> <span>Waiting for approval: {labelList(waiting)}.</span></p>}
          </div>
        </section>

        <section data-guide="roles-editor.permissions" className="min-w-0 rounded-xl border border-border bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-black-01">Permissions to grant</h2><p className="mt-1 text-sm text-gray-01">Choose the actions this role may take.</p></div><Badge variant="inactive">{draft.ticked.size} selected</Badge></div>
          {catalogue.isLoading ? <Skeleton className="mt-5 h-80 w-full" /> : <div className="mt-5"><AccessCataloguePicker modules={catalogue.data?.data ?? []} selected={draft.ticked} onToggle={toggle} /></div>}
          {errors.permission_keys && <p role="alert" className="mt-3 text-xs text-error">{errors.permission_keys}</p>}
        </section>
      </div>
      <div data-guide="roles-editor.actions" className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5"><Button variant="outline" onClick={() => navigate(creating ? base : roleDetailPath(base, key))}>Cancel</Button><Button onClick={() => void save()} loading={saving} disabled={!dirty || branches.isLoading || branches.isError || (creating && (catalogue.isLoading || catalogue.isError))}>{creating ? "Create role" : "Save changes"}</Button></div>
    </PageShell>
  );
}
