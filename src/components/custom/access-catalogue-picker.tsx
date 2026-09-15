import { useMemo, useState } from "react";
import { AlertCircle, LockKeyhole, Search } from "lucide-react";

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

const unavailableReason = (module: CatalogueModule) =>
  module.resources
    .flatMap((resource) => resource.permissions)
    .find((permission) => permission.unavailable_reason)?.unavailable_reason;

const matches = (permission: CataloguePermission, needle: string) =>
  !needle ||
  permission.label.toLowerCase().includes(needle) ||
  permission.key.toLowerCase().includes(needle);

/**
 * Permission allocation follows the registry's Module, Resource, Permission
 * hierarchy while preserving unavailable grants as visible, explained rows.
 */
export function AccessCataloguePicker({
  modules,
  selected,
  onToggle,
  readOnly = false,
  loading = false,
}: Props) {
  const firstModule = modules.find((entry) => entry.available) ?? modules[0];
  const [moduleKey, setModuleKey] = useState("");
  const activeModule = modules.find((entry) => entry.module === moduleKey) ?? firstModule;
  const firstResource = activeModule?.resources.find((entry) => entry.available) ?? activeModule?.resources[0];
  const [resourceKey, setResourceKey] = useState("");
  const activeResource = activeModule?.resources.find((entry) => entry.resource === resourceKey) ?? firstResource;
  const [search, setSearch] = useState("");

  const permissions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (activeResource?.permissions ?? []).filter((permission) => matches(permission, needle));
  }, [activeResource, search]);

  if (loading) return <p className="py-8 text-center text-sm text-gray-01">Loading access catalogue...</p>;
  if (!modules.length) return <p className="py-8 text-center text-sm text-gray-01">No permissions are available.</p>;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[180px_180px_minmax(0,1fr)]">
      <section className="min-w-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-01">Module</h3>
        <div className="grid gap-2">
          {modules.map((entry) => {
            const reason = unavailableReason(entry);
            return (
              <button
                key={entry.module}
                type="button"
                disabled={!entry.available}
                onClick={() => { setModuleKey(entry.module); setResourceKey(""); setSearch(""); }}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm",
                  entry.module === activeModule?.module ? "border-primary bg-primary/5 text-black-01" : "border-white-02 text-gray-01",
                  !entry.available && "cursor-not-allowed bg-gray-03 opacity-70",
                )}
              >
                <span className="block font-medium">{entry.label}</span>
                {!entry.available && <span className="mt-1 block text-xs text-gray-01">{reason || "This module is not available on the current plan."}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-w-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-01">Resource</h3>
        <div className="grid gap-2">
          {(activeModule?.resources ?? []).map((entry) => (
            <button
              key={entry.resource}
              type="button"
              disabled={!entry.available}
              onClick={() => { setResourceKey(entry.resource); setSearch(""); }}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm font-medium",
                entry.resource === activeResource?.resource ? "border-primary bg-primary/5 text-black-01" : "border-white-02 text-gray-01",
                !entry.available && "cursor-not-allowed bg-gray-03 opacity-70",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-black-01">{activeResource?.label ?? "Permissions"}</h3>
            <p className="mt-0.5 text-xs text-gray-01">Choose the actions this role may take.</p>
          </div>
          <div className="relative w-full sm:w-64">
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
    </div>
  );
}
