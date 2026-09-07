/**
 * When this school's fee bills fall due. Backend: apps/schools/core/fal,
 * mounted at /v1/school-finance/settings/fee-due-policy/.
 *
 * A school setting rather than a per-run argument: a bursar decides it once on
 * a settings screen and every fee run reads it. It lives in the FAL because
 * three of the four rules are academic-calendar facts, and vs_finance must
 * never learn what a term is.
 *
 * The read carries `options`, each with the date that rule would put on a bill
 * raised today, priced by the same function that bills. That is what makes the
 * choice legible: "End of the term billed" is an abstraction until it says
 * 15 November, and nobody should have to raise an invoice to find out.
 */

import { baseApi } from "../base-api";

/** The four rules a school can bill by. Mirrors FeeDueBasis on the backend. */
export type FeeDueBasis =
  | "TERM_END"
  | "SESSION_END"
  | "MONTH_END"
  | "DAYS_AFTER";

export interface FeeDueOption {
  value: FeeDueBasis;
  label: string;
  /** ISO date this rule would set on a bill raised today. */
  due_if_billed_today: string;
}

export interface FeeDuePolicy {
  basis: FeeDueBasis;
  basis_display: string;
  /** Read only when `basis` is DAYS_AFTER, but kept when it is not, so a school
   *  that switches away and back does not lose the number it chose. */
  days_after: number;
  options: FeeDueOption[];
  /** The session and term the previews were worked out against, so a bursar can
   *  see which calendar the dates came from. Either may be null in a school
   *  that has not set its calendar up yet. */
  resolved_against: {
    session: string | null;
    term: string | null;
  };
}

export interface FeeDuePolicyWrite {
  basis?: FeeDueBasis;
  days_after?: number;
}

interface ItemResponse<T> {
  message?: string;
  data: T;
}

const URL = "/school-finance/settings/fee-due-policy/";

export const feeDuePolicyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeeDuePolicy: builder.query<ItemResponse<FeeDuePolicy>, void>({
      query: () => ({ url: URL, method: "GET" }),
      providesTags: ["FeeDuePolicy"],
    }),
    updateFeeDuePolicy: builder.mutation<
      ItemResponse<FeeDuePolicy>,
      FeeDuePolicyWrite
    >({
      query: (body) => ({ url: URL, method: "PATCH", body }),
      invalidatesTags: ["FeeDuePolicy"],
    }),
  }),
});

export const { useGetFeeDuePolicyQuery, useUpdateFeeDuePolicyMutation } =
  feeDuePolicyApi;
