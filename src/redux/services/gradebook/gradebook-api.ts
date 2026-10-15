import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import { termParams } from "./gradebook-params";
import type {
  Broadsheet,
  CellWrite,
  ClassKey,
  Compile,
  CompileWrite,
  GradebookSettings,
  GradebookSettingsWrite,
  ModerationQueue,
  RemarkTemplate,
  ResultsHub,
  Scale,
  ScaleWrite,
  Sheet,
  SheetKey,
  Structure,
  StructureWrite,
  SubmitResult,
  TeacherHub,
  TermArgs,
} from "./gradebook-types";

/** The cache id of one sheet, so a write lands in the copy the screen reads. */
const sheetTag = ({ classId, subjectId }: SheetKey) => ({
  type: "GradebookSheet" as const,
  id: `${classId}:${subjectId}`,
});

const sheetUrl = ({ classId, subjectId }: SheetKey) => `/gradebook/sheets/${classId}/${subjectId}/`;

/**
 * The gradebook: results from score sheet to report card, under `/v1/gradebook/`.
 *
 * Every route answers `TENANT_NOT_LIVE` to a school still onboarding, which the
 * base query turns into the not-live screen, so nothing here guards for it.
 * Every read takes the term as `?term=`, and the server reads an omitted term
 * as the school's current one.
 *
 * **A sheet write answers with the whole sheet.** Saving cells and submitting
 * both return the sheet as it now stands, so the answer is written straight
 * into the cached copy instead of refetching it: a teacher typing down a
 * column of thirty marks never waits on a second read between cells. The hubs
 * (`GradebookProgress`) are refetched, because their counts moved.
 *
 * **Saving is silent.** A refused cell comes back as a 422 listing each cell,
 * which the sheet prints under the cell it belongs to, and a locked sheet as a
 * 409 the sheet answers by re-reading itself. A global toast for either would
 * say the same thing twice, once in the wrong place.
 */
export const gradebookApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** The administrator's hub: every class in the reader's branches for the term. */
    getResultsHub: builder.query<Envelope<ResultsHub>, TermArgs | void>({
      query: (args) => ({ url: `/gradebook/hub/`, method: "GET", params: termParams(args ?? {}) }),
      providesTags: ["GradebookProgress"],
    }),

    /** Sends the sheet's main teacher a reminder, once per sheet per school day. */
    remindTeacher: builder.mutation<Envelope<unknown>, SheetKey>({
      query: (key) => ({ url: `${sheetUrl(key)}remind/`, method: "POST", params: termParams({ term: key.term }) }),
      invalidatesTags: ["GradebookProgress"],
    }),

    /**
     * Moderated sheets: a head's own departments, or every one in the reader's
     * branches for a reader of the results hub (who reads but cannot decide).
     */
    getModerationQueue: builder.query<Envelope<ModerationQueue>, TermArgs | void>({
      query: (args) => ({ url: `/gradebook/moderation/`, method: "GET", params: termParams(args ?? {}) }),
      providesTags: ["GradebookProgress"],
    }),

    /** The head approves a submitted sheet; it goes on to the class teacher. */
    approveSheet: builder.mutation<Envelope<unknown>, SheetKey>({
      query: (key) => ({ url: `${sheetUrl(key)}approve/`, method: "POST", params: termParams({ term: key.term }) }),
      invalidatesTags: (_result, _error, key) => ["GradebookProgress", sheetTag(key)],
    }),

    /** The head sends a submitted sheet back to its main teacher, with a note. */
    returnSheet: builder.mutation<Envelope<unknown>, SheetKey & { note: string }>({
      query: ({ note, ...key }) => ({
        url: `${sheetUrl(key)}return/`,
        method: "POST",
        params: termParams({ term: key.term }),
        body: { note },
      }),
      invalidatesTags: (_result, _error, { note: _note, ...key }) => ["GradebookProgress", sheetTag(key)],
    }),

    // ── A class: its broadsheet, compiling and submitting it ──────────────

    getBroadsheet: builder.query<Envelope<Broadsheet>, ClassKey>({
      query: ({ classId, term }) => ({
        url: `/gradebook/classes/${classId}/broadsheet/`,
        method: "GET",
        params: termParams({ term }),
      }),
      providesTags: (_result, _error, { classId }) => [{ type: "GradebookClass", id: classId }],
    }),

    getCompile: builder.query<Envelope<Compile>, ClassKey & { studentId: number }>({
      query: ({ classId, studentId, term }) => ({
        url: `/gradebook/classes/${classId}/students/${studentId}/compile/`,
        method: "GET",
        params: termParams({ term }),
      }),
      providesTags: (_result, _error, { classId }) => [{ type: "GradebookClass", id: classId }],
    }),

    /** The class teacher's comment and ratings for one student. Answers with the drawer. */
    saveCompile: builder.mutation<Envelope<Compile>, ClassKey & { studentId: number; body: CompileWrite }>({
      query: ({ classId, studentId, term, body }) => ({
        url: `/gradebook/classes/${classId}/students/${studentId}/compile/`,
        method: "PUT",
        params: termParams({ term }),
        body,
      }),
      invalidatesTags: (_result, _error, { classId }) => [{ type: "GradebookClass", id: classId }],
    }),

    /** Sends the class to the principal. Answers with the broadsheet. */
    submitClass: builder.mutation<Envelope<Broadsheet>, ClassKey>({
      query: ({ classId, term }) => ({
        url: `/gradebook/classes/${classId}/submit/`,
        method: "POST",
        params: termParams({ term }),
      }),
      invalidatesTags: (_result, _error, { classId }) => [
        { type: "GradebookClass", id: classId },
        "GradebookProgress",
        "GradebookSheet",
      ],
    }),

    getMySheets: builder.query<Envelope<TeacherHub>, { term?: number } | void>({
      query: (args) => ({
        url: `/gradebook/hub/mine/`,
        method: "GET",
        params: termParams(args ?? {}),
      }),
      providesTags: ["GradebookProgress"],
    }),

    getSheet: builder.query<Envelope<Sheet>, SheetKey>({
      query: (key) => ({ url: sheetUrl(key), method: "GET", params: termParams({ term: key.term }) }),
      providesTags: (_result, _error, key) => [sheetTag(key)],
    }),

    /** All or nothing: one refused cell refuses the batch and saves none of it. */
    saveScores: builder.mutation<Envelope<Sheet>, SheetKey & { cells: CellWrite[] }>({
      query: ({ cells, ...key }) => ({
        url: `${sheetUrl(key)}scores/`,
        method: "PUT",
        params: termParams({ term: key.term }),
        body: { cells },
      }),
      extraOptions: { silent: true },
      async onQueryStarted({ cells: _cells, ...key }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(gradebookApi.util.updateQueryData("getSheet", key, () => data));
        } catch {
          // The screen reads the refusal off the mutation's own result.
        }
      },
      invalidatesTags: ["GradebookProgress"],
    }),

    submitSheet: builder.mutation<Envelope<SubmitResult>, SheetKey>({
      query: (key) => ({
        url: `${sheetUrl(key)}submit/`,
        method: "POST",
        params: termParams({ term: key.term }),
      }),
      async onQueryStarted(key, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            gradebookApi.util.updateQueryData("getSheet", key, (draft) => {
              draft.data = data.data.sheet;
            }),
          );
        } catch {
          // A refusal is toasted by the base query; the sheet stays as it was.
        }
      },
      invalidatesTags: ["GradebookProgress"],
    }),

    // ── Assessment setup ──────────────────────────────────────────────────
    // A structure or scale put in use changes the columns and grades of every
    // sheet not yet started, so setup writes refetch the sheets and hubs too.

    getStructures: builder.query<Envelope<Structure[]>, void>({
      query: () => ({ url: `/gradebook/structures/`, method: "GET" }),
      providesTags: ["GradebookSetup"],
    }),
    createStructure: builder.mutation<Envelope<Structure>, StructureWrite>({
      query: (body) => ({ url: `/gradebook/structures/`, method: "POST", body }),
      invalidatesTags: ["GradebookSetup"],
    }),
    updateStructure: builder.mutation<Envelope<Structure>, { id: number; body: StructureWrite }>({
      query: ({ id, body }) => ({ url: `/gradebook/structures/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["GradebookSetup", "GradebookSheet", "GradebookProgress"],
    }),
    deleteStructure: builder.mutation<Envelope<unknown>, number>({
      query: (id) => ({ url: `/gradebook/structures/${id}/`, method: "DELETE" }),
      invalidatesTags: ["GradebookSetup"],
    }),
    copyStructure: builder.mutation<Envelope<Structure>, number>({
      query: (id) => ({ url: `/gradebook/structures/${id}/copy/`, method: "POST" }),
      invalidatesTags: ["GradebookSetup"],
    }),
    activateStructure: builder.mutation<Envelope<Structure>, number>({
      query: (id) => ({ url: `/gradebook/structures/${id}/activate/`, method: "POST" }),
      invalidatesTags: ["GradebookSetup", "GradebookSheet", "GradebookProgress"],
    }),

    getScales: builder.query<Envelope<Scale[]>, void>({
      query: () => ({ url: `/gradebook/scales/`, method: "GET" }),
      providesTags: ["GradebookSetup"],
    }),
    createScale: builder.mutation<Envelope<Scale>, ScaleWrite>({
      query: (body) => ({ url: `/gradebook/scales/`, method: "POST", body }),
      invalidatesTags: ["GradebookSetup"],
    }),
    updateScale: builder.mutation<Envelope<Scale>, { id: number; body: ScaleWrite }>({
      query: ({ id, body }) => ({ url: `/gradebook/scales/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["GradebookSetup", "GradebookSheet", "GradebookProgress"],
    }),
    deleteScale: builder.mutation<Envelope<unknown>, number>({
      query: (id) => ({ url: `/gradebook/scales/${id}/`, method: "DELETE" }),
      invalidatesTags: ["GradebookSetup"],
    }),
    copyScale: builder.mutation<Envelope<Scale>, number>({
      query: (id) => ({ url: `/gradebook/scales/${id}/copy/`, method: "POST" }),
      invalidatesTags: ["GradebookSetup"],
    }),
    activateScale: builder.mutation<Envelope<Scale>, number>({
      query: (id) => ({ url: `/gradebook/scales/${id}/activate/`, method: "POST" }),
      invalidatesTags: ["GradebookSetup", "GradebookSheet", "GradebookProgress"],
    }),

    getRemarkTemplates: builder.query<Envelope<{ templates?: RemarkTemplate[] }>, void>({
      query: () => ({ url: `/gradebook/remark-templates/`, method: "GET" }),
      providesTags: ["GradebookSetup"],
    }),
    saveRemarkTemplates: builder.mutation<Envelope<{ templates?: RemarkTemplate[] }>, RemarkTemplate[]>({
      query: (templates) => ({ url: `/gradebook/remark-templates/`, method: "PUT", body: { templates } }),
      invalidatesTags: ["GradebookSetup"],
    }),

    getGradebookSettings: builder.query<Envelope<GradebookSettings>, void>({
      query: () => ({ url: `/gradebook/settings/`, method: "GET" }),
      providesTags: ["GradebookSetup"],
    }),
    updateGradebookSettings: builder.mutation<Envelope<GradebookSettings>, GradebookSettingsWrite>({
      query: (body) => ({ url: `/gradebook/settings/`, method: "PATCH", body }),
      invalidatesTags: ["GradebookSetup", "GradebookSheet", "GradebookProgress"],
    }),
  }),
});

export const {
  useGetResultsHubQuery,
  useRemindTeacherMutation,
  useGetModerationQueueQuery,
  useApproveSheetMutation,
  useReturnSheetMutation,
  useGetBroadsheetQuery,
  useGetCompileQuery,
  useSaveCompileMutation,
  useSubmitClassMutation,
  useGetMySheetsQuery,
  useGetSheetQuery,
  useSaveScoresMutation,
  useSubmitSheetMutation,
  useGetStructuresQuery,
  useCreateStructureMutation,
  useUpdateStructureMutation,
  useDeleteStructureMutation,
  useCopyStructureMutation,
  useActivateStructureMutation,
  useGetScalesQuery,
  useCreateScaleMutation,
  useUpdateScaleMutation,
  useDeleteScaleMutation,
  useCopyScaleMutation,
  useActivateScaleMutation,
  useGetRemarkTemplatesQuery,
  useSaveRemarkTemplatesMutation,
  useGetGradebookSettingsQuery,
  useUpdateGradebookSettingsMutation,
} = gradebookApi;
