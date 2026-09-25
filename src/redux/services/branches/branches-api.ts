import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type { SchoolBranch } from "./branches-types";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { fetchAllPages } from "@/utils/fetch-all-pages";

/**
 * A school's own branches, at /v1/i/me/branches/.
 *
 * Read-only, and deliberately not the platform's branch endpoints. Those demand
 * `platform.branches.view` / `.create` / `.update`, which no school role holds -
 * so a school administrator asking for her own sites was refused outright. They
 * also carry create and edit on the same key, and neither is a school's to do:
 * the platform provisions sites.
 *
 * Takes no school identifier. The school is the session's, so there is nothing
 * to tamper with and no way to read another school's sites.
 */
export const branchesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyBranches: builder.query<PaginatedEnvelope<SchoolBranch>, void>({
      query: () => ({ url: `/i/me/branches/`, method: "GET" }),
      providesTags: ["Branches"],
    }),

    getAllMyBranches: builder.query<SchoolBranch[], void>({
      queryFn: (_arg, _api, _extra, baseQuery) =>
        fetchAllPages<SchoolBranch, FetchBaseQueryError>(async (page) => {
          const { data, error } = await baseQuery({
            url: `/i/me/branches/`,
            method: "GET",
            params: { page, page_size: 100 },
          });
          return error ? { error } : { data: data as PaginatedEnvelope<SchoolBranch> };
        }),
      providesTags: ["Branches"],
    }),

    getMyBranch: builder.query<Envelope<SchoolBranch>, number>({
      query: (code) => ({ url: `/i/me/branches/${code}/`, method: "GET" }),
      providesTags: ["Branches"],
    }),
  }),
});

export const { useGetMyBranchesQuery, useGetAllMyBranchesQuery, useGetMyBranchQuery } = branchesApi;
