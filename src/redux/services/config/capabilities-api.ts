import { baseApi } from "../base-api";

/**
 * What this school's plan reaches: /v1/config/my-capabilities/.
 *
 * Two questions decide whether a control belongs on the screen, and they are
 * not the same question. RBAC answers "may this person do it" and is about the
 * role they hold. This answers "did the school buy it" and is about the plan
 * the proprietor pays for. A screen that asks only the first offers an
 * administrator every button on the platform, because an administrator holds
 * every key - and the plan gate then refuses the request they make with it.
 *
 * The endpoint is deliberately self-scoped and needs no permission key: what
 * your own school bought is not a secret kept from its staff, and a teacher's
 * navigation has to answer the question as surely as an administrator's. The
 * platform's own `/config/effective-capabilities/` is a different endpoint,
 * gated on a key no school role holds, and is not what this reads.
 *
 * Bands come back alongside modules, so `finance` says whether the school has
 * Finance at all and `finance_plus` says how far into it they reach. A screen
 * gates on whichever of the two matches what it is showing.
 */
export interface CapabilityState {
  /** Catalogue key: a module (`finance`) or one of its bands (`finance_plus`). */
  key: string;
  enabled: boolean;
}

interface CapabilitiesEnvelope {
  success: boolean;
  message: string;
  data: CapabilityState[];
}

export const capabilitiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Fetched once and held for the session.
     *
     * A plan changes when CodeX changes it, from the console, which is not a
     * thing that happens while a school administrator is mid-screen - so this
     * is cached for an hour rather than refetched on every mount. A school that
     * has just been upgraded sees it on their next load, which is the same
     * moment they would see any other change made on their behalf.
     *
     * `silent` because a failure here must not raise a toast: the hook that
     * reads it treats "not yet known" as "allowed", so a network blip costs the
     * reader nothing and a banner would be noise about a request they did not
     * make.
     */
    getMyCapabilities: builder.query<CapabilitiesEnvelope, void>({
      query: () => ({ url: `/config/my-capabilities/`, method: "GET" }),
      extraOptions: { silent: true },
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useGetMyCapabilitiesQuery } = capabilitiesApi;
