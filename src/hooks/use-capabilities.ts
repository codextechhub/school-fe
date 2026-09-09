import { useGetMyCapabilitiesQuery } from "@/redux/services/config/capabilities-api";

/**
 * Whether the school's plan reaches a thing, for gating screens and nav.
 *
 * The companion to `usePermissions`, and the two must both be satisfied before
 * a control appears. A permission answers what the reader's role allows; this
 * answers what the school bought. An administrator holds every key, so gating
 * on the role alone shows them the whole platform and lets the plan gate refuse
 * whatever they press: they see "Bulk Data Import is not part of this school's
 * plan" after choosing a file, rather than never being offered the door.
 *
 * ## Unknown means allowed
 *
 * Until the answer arrives - and if the request fails outright - every
 * capability reads as on. That is deliberate and it is the safe direction.
 *
 * The plan is a commercial boundary, not a security one: the server refuses a
 * request the plan does not cover whether or not this hook ever loaded, so a
 * moment of optimism costs nothing but a control that briefly appears. The
 * pessimistic default costs a great deal - every paying school would watch its
 * navigation arrive empty on each cold load, and a school whose request failed
 * would be locked out of a product it pays for by a network blip.
 *
 * Callers that would rather render nothing than flicker can read `isKnown`.
 */
export function useCapabilities() {
  const { data, isLoading, isError } = useGetMyCapabilitiesQuery();

  const isKnown = !isLoading && !isError && Array.isArray(data?.data);

  const enabled = new Set(
    (data?.data ?? []).filter((row) => row.enabled).map((row) => row.key),
  );

  const hasCapability = (key: string | null | undefined): boolean => {
    // A control that names no capability is core to every plan.
    if (!key) return true;
    if (!isKnown) return true;
    return enabled.has(key);
  };

  /** True when the school reaches ANY of these - for a door onto several. */
  const hasAnyCapability = (...keys: string[]): boolean =>
    keys.length === 0 || keys.some((key) => hasCapability(key));

  return { hasCapability, hasAnyCapability, isKnown };
}
