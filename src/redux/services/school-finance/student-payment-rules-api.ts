/**
 * Whether this school's students may pay their own fees in the student portal,
 * and the smallest part payment it accepts. Backend: apps/schools/core/fal,
 * mounted at /v1/school-finance/settings/student-payments/.
 *
 * Fees are normally paid by a family; a student paying their own invoice is
 * the fallback for a family that cannot pay through their own app. `enabled`
 * off removes the Pay action from every student's fees screen.
 * `min_part_payment` is kobo, as every amount crossing the API is, and is
 * always a whole number of naira; paying a whole balance is allowed however
 * small it is.
 */

import { baseApi } from "../base-api";

export interface StudentPaymentRules {
  enabled: boolean;
  /** Kobo. */
  min_part_payment: number;
}

interface ItemResponse<T> {
  message?: string;
  data: T;
}

const URL = "/school-finance/settings/student-payments/";

export const studentPaymentRulesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudentPaymentRules: builder.query<ItemResponse<StudentPaymentRules>, void>({
      query: () => ({ url: URL, method: "GET" }),
      providesTags: ["StudentPaymentRules"],
    }),
    updateStudentPaymentRules: builder.mutation<
      ItemResponse<StudentPaymentRules>,
      Partial<StudentPaymentRules>
    >({
      query: (body) => ({ url: URL, method: "PATCH", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["StudentPaymentRules"],
    }),
  }),
});

export const { useGetStudentPaymentRulesQuery, useUpdateStudentPaymentRulesMutation } =
  studentPaymentRulesApi;
