import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type {
  AssignmentCreatePayload,
  CurrentOrganogramAssignment,
  MatrixReport,
  MatrixReportWritePayload,
  OrganogramListQuery,
  OrganogramNode,
  OrganogramSummary,
  OrgNode,
  OrgNodeWritePayload,
  Position,
  PositionAssignment,
  PositionWritePayload,
} from "./organogram-types";

const BASE = "/i/me/staff/organogram";

/**
 * The school's organogram: org units, posts, appointments and dotted lines.
 *
 * **One tag for the whole chart.** The tree, the post list, the unit list, the
 * current appointments and the summary are one dataset seen five ways, and
 * almost every write moves several of them at once: appointing somebody
 * changes the tree's holders, the post's vacancy, the unit's head and the
 * summary's counts. An appointment also moves `SchoolStaff`, because a staff
 * record carries its holder's place on the chart.
 *
 * Every write is `silent`: a refusal names the rule that stopped it ("A Lekki
 * post cannot report to an Ikeja post") and the form shows it beside the field.
 */
export const organogramApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Units ────────────────────────────────────────────────────────────────

    getOrgNodes: builder.query<PaginatedEnvelope<OrgNode>, OrganogramListQuery | void>({
      query: (params) => ({ url: `${BASE}/nodes/`, method: "GET", params: params ?? {} }),
      providesTags: ["Organogram"],
    }),
    createOrgNode: builder.mutation<Envelope<OrgNode>, OrgNodeWritePayload>({
      query: (body) => ({ url: `${BASE}/nodes/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),
    updateOrgNode: builder.mutation<Envelope<OrgNode>, { id: number; body: OrgNodeWritePayload }>({
      query: ({ id, body }) => ({ url: `${BASE}/nodes/${id}/`, method: "PATCH", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),
    deleteOrgNode: builder.mutation<void, number>({
      query: (id) => ({ url: `${BASE}/nodes/${id}/`, method: "DELETE" }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),

    // ── Posts ────────────────────────────────────────────────────────────────

    getOrgPositions: builder.query<PaginatedEnvelope<Position>, OrganogramListQuery | void>({
      query: (params) => ({ url: `${BASE}/positions/`, method: "GET", params: params ?? {} }),
      providesTags: ["Organogram"],
    }),
    /** The solid reporting lines, nested from the top of the school. */
    getOrgPositionTree: builder.query<Envelope<OrganogramNode[]>, { root?: number } | void>({
      query: (params) => ({ url: `${BASE}/positions/tree/`, method: "GET", params: params ?? {} }),
      providesTags: ["Organogram"],
    }),
    createOrgPosition: builder.mutation<Envelope<Position>, PositionWritePayload>({
      query: (body) => ({ url: `${BASE}/positions/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),
    updateOrgPosition: builder.mutation<Envelope<Position>, { id: number; body: PositionWritePayload }>({
      query: ({ id, body }) => ({ url: `${BASE}/positions/${id}/`, method: "PATCH", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),
    deleteOrgPosition: builder.mutation<void, number>({
      query: (id) => ({ url: `${BASE}/positions/${id}/`, method: "DELETE" }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),

    // ── Appointments ─────────────────────────────────────────────────────────

    /** Full history with tenure dates. Behind `school.teachers.update`. */
    getOrgAssignments: builder.query<PaginatedEnvelope<PositionAssignment>, OrganogramListQuery | void>({
      query: (params) => ({ url: `${BASE}/assignments/`, method: "GET", params: params ?? {} }),
      extraOptions: { silent: true },
      providesTags: ["Organogram"],
    }),
    /** Who holds which post now and whether they are acting, for every reader. */
    getCurrentOrgAssignments: builder.query<Envelope<CurrentOrganogramAssignment[]>, void>({
      query: () => ({ url: `${BASE}/assignments/current/`, method: "GET" }),
      providesTags: ["Organogram"],
    }),
    createOrgAssignment: builder.mutation<Envelope<PositionAssignment>, AssignmentCreatePayload>({
      query: (body) => ({ url: `${BASE}/assignments/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram", "SchoolStaff"],
    }),
    closeOrgAssignment: builder.mutation<Envelope<PositionAssignment>, { id: number; end_date?: string }>({
      query: ({ id, end_date }) => ({
        url: `${BASE}/assignments/${id}/close/`,
        method: "POST",
        body: end_date ? { end_date } : {},
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram", "SchoolStaff"],
    }),

    // ── Dotted lines ─────────────────────────────────────────────────────────

    getOrgMatrixReports: builder.query<PaginatedEnvelope<MatrixReport>, OrganogramListQuery | void>({
      query: (params) => ({ url: `${BASE}/matrix-reports/`, method: "GET", params: params ?? {} }),
      providesTags: ["Organogram"],
    }),
    createOrgMatrixReport: builder.mutation<Envelope<MatrixReport>, MatrixReportWritePayload>({
      query: (body) => ({ url: `${BASE}/matrix-reports/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),
    deleteOrgMatrixReport: builder.mutation<void, number>({
      query: (id) => ({ url: `${BASE}/matrix-reports/${id}/`, method: "DELETE" }),
      extraOptions: { silent: true },
      invalidatesTags: ["Organogram"],
    }),

    // ── Summary ──────────────────────────────────────────────────────────────

    /** Headcount, vacancies, acting, on leave and suspended. Behind `school.teachers.update`. */
    getOrgSummary: builder.query<Envelope<OrganogramSummary>, void>({
      query: () => ({ url: `${BASE}/summary/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: ["Organogram"],
    }),
  }),
});

export const {
  useGetOrgNodesQuery,
  useCreateOrgNodeMutation,
  useUpdateOrgNodeMutation,
  useDeleteOrgNodeMutation,
  useGetOrgPositionsQuery,
  useGetOrgPositionTreeQuery,
  useCreateOrgPositionMutation,
  useUpdateOrgPositionMutation,
  useDeleteOrgPositionMutation,
  useGetOrgAssignmentsQuery,
  useGetCurrentOrgAssignmentsQuery,
  useCreateOrgAssignmentMutation,
  useCloseOrgAssignmentMutation,
  useGetOrgMatrixReportsQuery,
  useCreateOrgMatrixReportMutation,
  useDeleteOrgMatrixReportMutation,
  useGetOrgSummaryQuery,
} = organogramApi;
