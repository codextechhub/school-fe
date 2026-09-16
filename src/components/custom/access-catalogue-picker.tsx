import { useMemo, useState } from "react";
import { AlertCircle, LockKeyhole, Search } from "lucide-react";

import { useCatalogueScope } from "@/components/custom/catalogue-scope";
import {
  CatalogueScopeNotice,
  CatalogueScopePrompt,
  CatalogueScopeSelect,
} from "@/components/custom/catalogue-scope-select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  CatalogueModule,
  CataloguePermission,
} from "@/redux/services/roles/roles-types";

interface Props {
  modules: CatalogueModule[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  readOnly?: boolean;
  loading?: boolean;
}

const matches = (permission: CataloguePermission, needle: string) =>
  !needle ||
  permission.label.toLowerCase().includes(needle) ||
  permission.key.toLowerCase().includes(needle);

/**
 * Permission allocation in the registry's Module, Resource, Permission order.
 *
 * Module and Resource are searchable choice boxes, side by side from `sm` and
 * stacked on a phone, with the chosen resource's permissions and their search
 * box full width below. Nothing is preselected: until both are chosen the list
 * is a prompt. Changing the module clears the resource and the permission
 * search, and changing the resource clears the search. None of that touches
 * `selected`, which belongs to the caller, so boxes ticked under one resource
 * stay ticked after moving to another.
 *
 * Unavailable grants stay visible and explained: a module or resource off the
 * plan is still offered, its reason shows once chosen, and its permissions
 * render with disabled checkboxes.
 */
export function AccessCataloguePicker({
  modules,
  selected,
  onToggle,
  readOnly = false,
  loading = false,
}: Props) {
  const scope = useCatalogueScope(modules);
  const { activeModule, activeResource } = scope;
  const [search, setSearch] = useState("");

  const permissions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (activeResource?.permissions ?? []).filter((permission) => matches(permission, needle));
  }, [activeResource, search]);

  if (loading) return <p className="py-8 text-center text-sm text-gray-01">Loading access catalogue...</p>;
  if (!modules.length) return <p className="py-8 text-center text-sm text-gray-01">No permissions are available.</p>;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <CatalogueScopeSelect
        idPrefix="access-catalogue"
        modules={modules}
        activeModule={activeModule}
        activeResource={activeResource}
        onModuleChange={(key) => { scope.chooseModule(key); setSearch(""); }}
        onResourceChange={(key) => { scope.chooseResource(key); setSearch(""); }}
      />
      <CatalogueScopeNotice activeModule={activeModule} activeResource={activeResource} />

      {activeResource ? (
        <section className="min-w-0">
          <div className="mb-3 grid gap-3">
            <div>
              <h3 className="text-sm font-semibold text-black-01">{activeResource.label}</h3>
              <p className="mt-0.5 text-xs text-gray-01">Choose the actions this role may take.</p>
            </div>
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-01" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search permission labels" className="pl-9" />
            </div>
          </div>
          <ScrollArea className="max-h-[430px] min-w-0 pr-3">
            <div className="grid gap-2">
              {permissions.map((permission) => {
                const disabled = readOnly || !permission.available;
                return (
                  <label
                    key={permission.key}
                    title={permission.key}
                    className={cn("flex min-w-0 items-start gap-3 rounded-md border border-white-02 p-3", disabled ? "cursor-default bg-gray-03/50" : "cursor-pointer hover:border-primary/40")}
                  >
                    <Checkbox checked={selected.has(permission.key)} disabled={disabled} onCheckedChange={() => onToggle(permission.key)} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-black-01">
                        {permission.label}
                        {permission.is_restricted && <Badge variant="outline" className="gap-1 text-[10px]"><LockKeyhole className="size-3" /> Approval required</Badge>}
                      </span>
                      {!permission.available && <span className="mt-1 flex items-start gap-1 text-xs text-gray-01"><AlertCircle className="mt-px size-3 shrink-0" />{permission.unavailable_reason || "Unavailable on the current plan."}</span>}
                    </span>
                  </label>
                );
              })}
              {!permissions.length && <p className="rounded-md bg-gray-03 px-3 py-6 text-center text-sm text-gray-01">No permissions match this search.</p>}
            </div>
          </ScrollArea>
        </section>
      ) : (
        <CatalogueScopePrompt noun="permissions" />
      )}
    </div>
  );
}
