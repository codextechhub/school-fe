/**
 * RTK Query endpoints for the View Queues page (background jobs).
 * Backend: GET /v1/user/me/tasks/ and /v1/user/me/tasks/summary/ - both take
 * the same scope/status/kind/since params so the summary cards always match
 * the visible table scope. The page polls both every 10 s while visible.
 */

import { generateQueryString } from "@/utils/helpers";
import { baseApi } from "../base-api";
import type { QueueListResponse, QueueParams, QueueSummaryResponse } from "./queue-types";

export const queueApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyTasks: builder.query<QueueListResponse, QueueParams | void>({
      query: (params) => ({
        url: `/user/me/tasks/${generateQueryString((params ?? {}) as Record<string, string | number>)}`,
        method: "GET",
      }),
      providesTags: ["QueueJobs"],
    }),
    getMyTasksSummary: builder.query<QueueSummaryResponse, QueueParams | void>({
      query: (params) => ({
        url: `/user/me/tasks/summary/${generateQueryString((params ?? {}) as Record<string, string | number>)}`,
        method: "GET",
      }),
      providesTags: ["QueueSummary"],
    }),
  }),
});

export const { useGetMyTasksQuery, useGetMyTasksSummaryQuery } = queueApi;
