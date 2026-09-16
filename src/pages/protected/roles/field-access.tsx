import { useMemo, useState } from "react";
import { RotateCcw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { useCatalogueScope } from "@/components/custom/catalogue-scope";
import {
  CatalogueScopeNotice,
  CatalogueScopePrompt,
  CatalogueScopeSelect,
} from "@/components/custom/catalogue-scope-select";
import { modulesWithFields } from "@/components/custom/field-access-overrides";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { useLazyGetMeQuery } from "@/redux/services/auth/auth-api";
import {
  useGetAccessCatalogueQuery,
  useGetRoleFieldAccessQuery,
  useGetSchoolRoleQuery,
  useGetFieldAccessRolesQuery,
  useUpdateRoleFieldAccessMutation,
} from "@/redux/services/roles/roles-api";
import type { RoleFieldAccessEntry } from "@/redux/services/roles/roles-types";
import { writeErrorMessage } from "@/utils/api-error";

interface DraftState {
  read: boolean;
  write: boolean;
  reset?: boolean;
}

const valueFor = (field: RoleFieldAccessEntry, draft?: DraftState) =>
  draft?.reset ? field.default : draft ?? { read: field.read, write: field.write };

/**
 * Role field policy editor.
 *
 * The role opens on the first one listed. Its fields are narrowed with the
 * Module and Resource choice boxes, which offer only resources that carry
 * fields and start empty: until both are chosen the list is a prompt and the
 * field search is disabled. Changing the module clears the resource and the
 * search. Drafts are keyed by field, not by resource, so moving between
 * resources keeps unsaved switches; only changing the role discards them.
 *
 * Draft switches keep Write as a subset of Read before the request is sent.
 * Saving refetches the server state before clearing the draft, because audit,
 * normalization, and reset semantics belong to the backend response.
 */
export default function FieldAccess() {
  const { hasAnyPermission, hasPermission } = usePermissions();
  const canView =
    hasPermission(P.VIEW_ROLES) &&
    hasAnyPermission(P.VIEW_FIELD_ACCESS, P.MANAGE_FIELD_ACCESS);
  const canManage = hasPermission(P.MANAGE_FIELD_ACCESS);
  const roles = useGetFieldAccessRolesQuery(undefined, { skip: !canView });
  const catalogue = useGetAccessCatalogueQuery(undefined, { skip: !canView });
  const [selectedRole, setSelectedRole] = useState("");
  const roleRows = roles.data ?? [];
  const roleKey = roleRows.some((role) => role.key === selectedRole)
    ? selectedRole
    : roleRows[0]?.key ?? "";
  const role = useGetSchoolRoleQuery(roleKey, { skip: !roleKey });
  const fields = useGetRoleFieldAccessQuery({ key: roleKey }, { skip: !roleKey });
  const [save, saving] = useUpdateRoleFieldAccessMutation();
  const [refreshMe] = useLazyGetMeQuery();

  const modules = useMemo(() => modulesWithFields(catalogue.data?.data ?? []), [catalogue.data]);
  const scope = useCatalogueScope(modules);
  const { activeModule, activeResource } = scope;
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  const visibleFields = useMemo(() => {
    if (!activeModule || !activeResource) return [];
    const needle = search.trim().toLowerCase();
    return (fields.data?.data.fields ?? []).filter(
      (field) =>
        field.module === activeModule.module &&
        field.resource === activeResource.resource &&
        (!needle || field.label.toLowerCase().includes(needle)),
    );
  }, [activeModule, activeResource, fields.data, search]);

  const groups = useMemo(() => {
    const result = new Map<string, RoleFieldAccessEntry[]>();
    for (const field of visibleFields) {
      const group = field.group || "General";
      result.set(group, [...(result.get(group) ?? []), field]);
    }
    return [...result.entries()];
  }, [visibleFields]);

  if (!canView) return <PageAccessDenied />;

  const change = (field: RoleFieldAccessEntry, kind: "read" | "write", on: boolean) => {
    const current = valueFor(field, drafts[field.key]);
    const next = { ...current, reset: false };
    if (kind === "write") {
      next.write = on;
      if (on) next.read = true;
    } else {
      next.read = on;
      if (!on) next.write = false;
    }
    if (next.read === field.read && next.write === field.write) {
      setDrafts(({ [field.key]: _removed, ...rest }) => rest);
    } else {
      setDrafts((currentDrafts) => ({ ...currentDrafts, [field.key]: next }));
    }
  };

  const reset = (field: RoleFieldAccessEntry) => {
    if (field.source === "default") {
      setDrafts(({ [field.key]: _removed, ...rest }) => rest);
      return;
    }
    setDrafts((current) => ({ ...current, [field.key]: { ...field.default, reset: true } }));
  };

  const submit = async () => {
    if (!roleKey) return;
    const changes = Object.entries(drafts).map(([field, value]) =>
      value.reset
        ? { field, reset: true as const }
        : { field, read: value.read, write: value.write },
    );
    try {
      await save({ key: roleKey, changes }).unwrap();
      await fields.refetch();
      setDrafts({});
      if (role.data?.data.held_by_me) await refreshMe().unwrap();
      toast.success("Field access saved.");
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not save field access. Try again."));
    }
  };

  return (
    <PageShell className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[65ch]">
          <h1 className="text-xl font-semibold font-mont text-black-01">Field Access</h1>
          <p className="mt-1 text-sm text-gray-01">Set each role's Read and Write switches, field by field. Write always includes Read.</p>
        </div>
        {canManage && (
          <Button disabled={!Object.keys(drafts).length} loading={saving.isLoading} onClick={() => void submit()}>
            Save {Object.keys(drafts).length ? `${Object.keys(drafts).length} changes` : "changes"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-md border border-white-02 bg-white p-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm text-black-01">
          Role
          <NativeSelect value={roleKey} onChange={(event) => { setSelectedRole(event.target.value); setDrafts({}); }}>
            {roleRows.map((entry) => <option key={entry.key} value={entry.key}>{entry.name}</option>)}
          </NativeSelect>
        </label>
        <CatalogueScopeSelect
          idPrefix="field-access"
          className="sm:col-span-2"
          modules={modules}
          loading={catalogue.isLoading}
          activeModule={activeModule}
          activeResource={activeResource}
          onModuleChange={(key) => { scope.chooseModule(key); setSearch(""); }}
          onResourceChange={scope.chooseResource}
        />
      </div>

      <CatalogueScopeNotice activeModule={activeModule} activeResource={activeResource} />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-01" />
        <Input value={search} disabled={!activeResource} onChange={(event) => setSearch(event.target.value)} placeholder="Search field labels" className="pl-9" />
      </div>

      {!activeResource ? (
        <CatalogueScopePrompt noun="fields" className="border border-white-02 bg-white px-4 py-10" />
      ) : fields.isLoading ? (
        <p className="rounded-md border border-white-02 bg-white px-4 py-10 text-center text-sm text-gray-01">Loading fields...</p>
      ) : groups.length ? (
        <div className="grid gap-4">
          {groups.map(([group, entries]) => (
            <section key={group} className="rounded-md border border-white-02 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-black-01">{group}</h2>
              <div className="grid gap-3">
                {entries.map((field) => {
                  const value = valueFor(field, drafts[field.key]);
                  const pending = Boolean(drafts[field.key]);
                  return (
                    <div key={field.key} className="flex flex-wrap items-center gap-3 rounded-md border border-white-02 p-3">
                      <div className="min-w-0 flex-1 basis-64">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-black-01">{field.label}</span>
                          {field.sensitive && <Badge variant="outline" className="gap-1 text-[10px]"><ShieldAlert className="size-3" /> Sensitive</Badge>}
                          <Badge variant="outline" className={cn("text-[10px]", pending && "border-primary text-primary")}>
                            {pending ? "Unsaved" : field.source === "role" ? "Set for role" : "Default"}
                          </Badge>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-01">Read <Switch checked={value.read} disabled={!canManage} onCheckedChange={(on) => change(field, "read", on)} /></label>
                      {field.writable && <label className="flex items-center gap-2 text-xs text-gray-01">Write <Switch checked={value.write} disabled={!canManage} onCheckedChange={(on) => change(field, "write", on)} /></label>}
                      {canManage && (
                        <Button variant="ghost" size="sm" disabled={field.source === "default" && !drafts[field.key]} onClick={() => reset(field)}>
                          <RotateCcw className="size-3.5" /> Reset to default
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-white-02 bg-white px-4 py-10 text-center text-sm text-gray-01">No fields match this selection.</p>
      )}
    </PageShell>
  );
}
