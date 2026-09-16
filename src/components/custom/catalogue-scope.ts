import { useState } from "react";

import type {
  CatalogueModule,
  CatalogueResource,
} from "@/redux/services/roles/roles-types";

/**
 * The module and resource a screen has narrowed the access catalogue to.
 *
 * Both start empty: nothing is preselected, so whatever list a screen shows
 * belongs to a module and resource somebody chose. Choosing a module, or
 * clearing it, clears the resource, because a resource key only means something
 * inside its own module. A key no longer present in `modules` resolves to
 * nothing rather than to a neighbour.
 */
export function useCatalogueScope(modules: CatalogueModule[]) {
  const [moduleKey, setModuleKey] = useState("");
  const [resourceKey, setResourceKey] = useState("");
  const activeModule = modules.find((entry) => entry.module === moduleKey);
  const activeResource = activeModule?.resources.find(
    (entry) => entry.resource === resourceKey,
  );

  return {
    activeModule,
    activeResource,
    chooseModule: (key: string) => {
      setModuleKey(key);
      setResourceKey("");
    },
    chooseResource: (key: string) => setResourceKey(key),
    clear: () => {
      setModuleKey("");
      setResourceKey("");
    },
  };
}

/** The label a choice box shows for a module or resource, naming a plan limit. */
export const scopeOptionLabel = (entry: { label: string; available: boolean }) =>
  entry.available ? entry.label : `${entry.label} (not on the current plan)`;

/**
 * Why a module or resource is off the plan, in the server's own words.
 *
 * The catalogue carries the reason on permissions rather than on the groups
 * that hold them, so the first permission giving one speaks for the group.
 * Null when none does; callers supply their own fallback sentence.
 */
export const scopeUnavailableReason = (resources: CatalogueResource[]) =>
  resources
    .flatMap((resource) => resource.permissions)
    .find((permission) => permission.unavailable_reason)?.unavailable_reason ?? null;
