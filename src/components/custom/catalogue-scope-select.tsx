import { AlertCircle } from "lucide-react";

import {
  scopeOptionLabel,
  scopeUnavailableReason,
} from "@/components/custom/catalogue-scope";
import { SearchSelect } from "@/components/custom/search-select";
import { cn } from "@/lib/utils";
import type {
  CatalogueModule,
  CatalogueResource,
} from "@/redux/services/roles/roles-types";

interface ScopeChoice {
  activeModule?: CatalogueModule;
  activeResource?: CatalogueResource;
}

/**
 * Module and Resource as two searchable choice boxes, side by side from `sm`.
 *
 * Every screen that narrows the access catalogue uses it: the permission
 * picker, Field Access and the field exception drawer. The choice itself lives
 * in `useCatalogueScope`, so each screen clears its own dependants (a search
 * box, a chosen field) in the change handlers it passes here.
 *
 * The Resource box is disabled until a module is chosen. `SearchSelectOption`
 * has no per-option disabled flag, so a module or resource off the plan stays
 * selectable and names the limit in its label; `CatalogueScopeNotice` then
 * gives the reason, and the rows beneath stay visible but locked.
 */
export function CatalogueScopeSelect({
  idPrefix,
  modules,
  activeModule,
  activeResource,
  onModuleChange,
  onResourceChange,
  loading = false,
  className,
}: ScopeChoice & {
  /** Prefix for the two input ids, unique on the page. */
  idPrefix: string;
  modules: CatalogueModule[];
  onModuleChange: (key: string) => void;
  onResourceChange: (key: string) => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      <SearchSelect
        id={`${idPrefix}-module`}
        label="Module"
        placeholder="Choose a module"
        options={modules.map((entry) => ({
          value: entry.module,
          label: scopeOptionLabel(entry),
        }))}
        loading={loading}
        value={activeModule?.module ?? ""}
        onChange={(event) => onModuleChange(event.target.value)}
      />
      <SearchSelect
        id={`${idPrefix}-resource`}
        label="Resource"
        placeholder={activeModule ? "Choose a resource" : "Choose a module first"}
        options={(activeModule?.resources ?? []).map((entry) => ({
          value: entry.resource,
          label: scopeOptionLabel(entry),
        }))}
        loading={loading}
        disabled={!activeModule}
        value={activeResource?.resource ?? ""}
        onChange={(event) => onResourceChange(event.target.value)}
      />
    </div>
  );
}

/**
 * The reason a chosen module or resource is off the plan.
 *
 * Renders nothing while the choice is available. An unavailable module speaks
 * for its resources, so the same limit is never stated twice.
 */
export function CatalogueScopeNotice({ activeModule, activeResource }: ScopeChoice) {
  let reason: string | null = null;
  if (activeModule && !activeModule.available) {
    reason =
      scopeUnavailableReason(activeModule.resources) ??
      "This module is not available on the current plan.";
  } else if (activeResource && !activeResource.available) {
    reason =
      scopeUnavailableReason([activeResource]) ??
      "This resource is not available on the current plan.";
  }
  if (!reason) return null;

  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-md border border-white-02 bg-gray-03 px-3 py-2.5 text-xs text-gray-01"
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" />
      {reason}
    </p>
  );
}

/** What stands where the list will be until a module and a resource are chosen. */
export function CatalogueScopePrompt({
  noun,
  className,
}: {
  noun: "permissions" | "fields";
  className?: string;
}) {
  return (
    <p className={cn("rounded-md bg-gray-03 px-3 py-6 text-center text-sm text-gray-01", className)}>
      Choose a module, then a resource, to see its {noun}.
    </p>
  );
}
