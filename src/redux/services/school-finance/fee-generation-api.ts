/**
 * Billing a fee structure to named pupils. Backend: apps/schools/core/fal,
 * mounted at /v1/school-finance/fee-structures/<id>/.
 *
 * The finance package's own Generate bills every active customer in the books,
 * and a school's customers are its pupils, so a "JSS 1 First Term" structure
 * billed that way reaches every child in the school. These routes bill a list
 * of pupils the bursar chose, and nothing else: the server refuses an empty
 * list rather than reading it as "everyone".
 *
 * Three reads and writes make one run:
 *   - the term link: a structure bills one term and cannot bill before it
 *     names one, and the term decides which year's classes are offered;
 *   - the cohort: every on-roll pupil in the chosen classes, read from the
 *     class rosters page by page;
 *   - the run itself, first as a dry run and then for real. The dry run is the
 *     real billing code inside a transaction that is rolled back, so the total,
 *     the due date and the "already billed" list it shows are the ones the
 *     posting will produce.
 *
 * The run routes are silent (no toast): a refusal such as TERM_NOT_LINKED is
 * shown inside the drawer, in words, beside what to do about it.
 */

import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { fetchAllPages } from "@/utils/fetch-all-pages";

import { baseApi } from "../base-api";
import type { PaginatedEnvelope } from "../onboarding/onboarding-types";
import type { StudentRow, StudentStatus } from "../students/students-types";

interface ItemResponse<T> {
  message?: string;
  data: T;
}

/** The term a fee structure bills, or that it bills none yet. */
export type FeeStructureTerm =
  | { linked: false }
  | {
      linked: true;
      fee_structure: number;
      session: number;
      /** Null when the structure bills a whole session rather than one term. */
      term: number | null;
      entity: number;
      session_label: string;
      term_label: string;
    };

export interface LinkTermWrite {
  id: number;
  session: number;
  /** Omit to bill the whole session. */
  term?: number | null;
}

/** What a run billed, or on a dry run what it would bill. */
export interface CohortRunResult {
  fee_structure: number;
  dry_run: boolean;
  period: { session: number; term: number | null };
  /** Empty on a dry run: those invoices were rolled back. */
  invoices_created: number[];
  /** Student ids, as strings. */
  students_to_bill: string[];
  /** Already billed from this structure, so left alone. */
  students_skipped: string[];
  /** Kobo, tax included. */
  total_billed: number;
  /** The date every bill in the run falls due, from the school's rule. */
  due_date: string | null;
  /** Pupils' fee accounts the run re-files at the branch they attend; on a dry run, would. */
  accounts_moved?: AccountMove[];
  counts: { to_bill: number; skipped: number; created: number };
}

/**
 * A pupil's fee account the run moves to the branch the pupil attends.
 *
 * Tunde attends Lekki and their account was filed at Ikeja: the run bills them
 * at Lekki and moves the account there. Bills raised before the move keep
 * their branch, so Ikeja still collects what it is owed.
 */
export interface AccountMove {
  customer: string;
  student: string;
  name: string;
  from_branch: string;
  from_branch_id: string | number;
  to_branch: string;
  to_branch_id: string | number;
}

export interface CohortRunWrite {
  id: number;
  students: string[];
}

/** One pupil the run can name. */
export interface CohortPupil {
  id: number;
  full_name: string;
  student_number: string;
  class_name: string;
}

export interface CohortArgs {
  classIds: number[];
  /** Keep to one branch's pupils, for a structure that is that branch's. */
  branch?: number;
}

/** On the roll, so billable. Mirrors ON_ROLL in the students module. */
const ON_ROLL: ReadonlySet<StudentStatus> = new Set([
  "ENROLLED",
  "ACTIVE",
  "SUSPENDED",
]);

const base = (id: number) => `/school-finance/fee-structures/${id}`;

/** A run changes invoices, customers and the ledger behind them. */
const AFTER_A_RUN = [
  "FinanceInvoices",
  "FinanceFeeStructures",
  "FinanceCustomers",
  "FinanceReports",
  "FinanceJournals",
] as const;

export const feeGenerationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeeStructureTerm: builder.query<ItemResponse<FeeStructureTerm>, number>({
      query: (id) => ({ url: `${base(id)}/link-term/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: (_r, _e, id) => [{ type: "FinanceFeeStructures", id: `term-${id}` }],
    }),

    linkFeeStructureTerm: builder.mutation<ItemResponse<unknown>, LinkTermWrite>({
      query: ({ id, session, term }) => ({
        url: `${base(id)}/link-term/`,
        method: "POST",
        body: term ? { session, term } : { session },
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { id }) => [{ type: "FinanceFeeStructures", id: `term-${id}` }],
    }),

    /**
     * Every on-roll pupil in the chosen classes, de-duplicated.
     *
     * A child appears once however many chosen classes list them. Pupils who
     * have left, graduated or were never admitted are dropped here, because a
     * roster lists whoever holds a seat and a bill is for whoever is on the
     * roll.
     */
    getCohortPupils: builder.query<CohortPupil[], CohortArgs>({
      queryFn: async ({ classIds, branch }, _api, _extra, baseQuery) => {
        const seen = new Map<number, CohortPupil>();
        for (const classId of classIds) {
          const result = await fetchAllPages<StudentRow, FetchBaseQueryError>(
            async (page) => {
              const { data, error } = await baseQuery({
                url: `/students/classes/${classId}/roster/`,
                method: "GET",
                params: { page, page_size: 100, ...(branch ? { branch } : {}) },
              });
              return error
                ? { error: error as FetchBaseQueryError }
                : { data: data as PaginatedEnvelope<StudentRow> };
            },
          );
          if ("error" in result) return { error: result.error };
          for (const row of result.data) {
            if (!ON_ROLL.has(row.status) || seen.has(row.id)) continue;
            seen.set(row.id, {
              id: row.id,
              full_name: row.full_name,
              student_number: row.student_number,
              class_name: row.class_name,
            });
          }
        }
        return { data: [...seen.values()] };
      },
      extraOptions: { silent: true },
      providesTags: ["Students"],
    }),

    /** What the run would bill. Writes nothing, so it invalidates nothing. */
    previewCohortInvoices: builder.mutation<ItemResponse<CohortRunResult>, CohortRunWrite>({
      query: ({ id, students }) => ({
        url: `${base(id)}/generate-invoices/`,
        method: "POST",
        body: { students, dry_run: true },
      }),
      extraOptions: { silent: true },
    }),

    generateCohortInvoices: builder.mutation<ItemResponse<CohortRunResult>, CohortRunWrite>({
      query: ({ id, students }) => ({
        url: `${base(id)}/generate-invoices/`,
        method: "POST",
        body: { students, dry_run: false },
      }),
      extraOptions: { silent: true },
      invalidatesTags: [...AFTER_A_RUN],
    }),
  }),
});

export const {
  useGetFeeStructureTermQuery,
  useLinkFeeStructureTermMutation,
  useLazyGetCohortPupilsQuery,
  usePreviewCohortInvoicesMutation,
  useGenerateCohortInvoicesMutation,
} = feeGenerationApi;
