import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import { termParams } from "./gradebook-params";
import type {
  Analytics,
  AnalyticsTable,
  DownloadedFile,
  AmendmentForm,
  AmendmentRaise,
  AmendmentRow,
  AmendmentsArgs,
  AmendmentsPage,
  AmendmentTarget,
  Approvals,
  Broadsheet,
  ClassCards,
  ClassReturnBody,
  CellWrite,
  ClassKey,
  Compile,
  CompileWrite,
  GradebookSettings,
  GradebookSettingsWrite,
  ImportPreview,
  HoldLiftResult,
  HoldRow,
  HoldsArgs,
  HoldsPage,
  ModerationQueue,
  PrincipalComments,
  PrincipalCommentsWrite,
  PublishPreview,
  PublishResult,
  Release,
  ReleaseClasses,
  ReportCard,
  StudentResults,
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

    // ── Approvals and publishing ─────────────────────────────────────────

    /** Classes with the principal or published, in the reader's branches. */
    getApprovals: builder.query<Envelope<Approvals>, TermArgs | void>({
      query: (args) => ({ url: `/gradebook/approvals/`, method: "GET", params: termParams(args ?? {}) }),
      providesTags: ["GradebookProgress"],
    }),

    /** Sends an awaiting class back: to its class teacher, or one subject's sheet to its teacher. */
    returnClass: builder.mutation<Envelope<unknown>, ClassKey & ClassReturnBody>({
      query: ({ classId, term, ...body }) => ({
        url: `/gradebook/classes/${classId}/return/`,
        method: "POST",
        params: termParams({ term }),
        body,
      }),
      invalidatesTags: (_result, _error, { classId }) => [
        "GradebookProgress",
        "GradebookSheet",
        { type: "GradebookClass", id: classId },
      ],
    }),

    /** The principal's comment for each remark band, for one class. */
    getPrincipalComments: builder.query<Envelope<PrincipalComments>, ClassKey>({
      query: ({ classId, term }) => ({
        url: `/gradebook/classes/${classId}/principal-comments/`,
        method: "GET",
        params: termParams({ term }),
      }),
      providesTags: (_result, _error, { classId }) => [{ type: "GradebookClass", id: classId }],
    }),

    /** Saves the bands named; the others keep what they have. Answers with every band. */
    savePrincipalComments: builder.mutation<
      Envelope<PrincipalComments>,
      ClassKey & { body: PrincipalCommentsWrite }
    >({
      query: ({ classId, term, body }) => ({
        url: `/gradebook/classes/${classId}/principal-comments/`,
        method: "PUT",
        params: termParams({ term }),
        body,
      }),
      invalidatesTags: (_result, _error, { classId }) => [{ type: "GradebookClass", id: classId }],
    }),

    /** What publishing an awaiting class now would release, email and hold back. */
    getPublishPreview: builder.query<Envelope<PublishPreview>, ClassKey>({
      query: ({ classId, term }) => ({
        url: `/gradebook/classes/${classId}/publish/preview/`,
        method: "GET",
        params: termParams({ term }),
      }),
      // A class published a moment ago answers NOT_AWAITING; the dialog says so in place.
      extraOptions: { silent: true },
      providesTags: (_result, _error, { classId }) => [{ type: "GradebookClass", id: classId }],
    }),

    /**
     * Publishes each class in its own transaction. A class that is no longer
     * awaiting is refused in its own row and the others still go ahead.
     */
    publishClasses: builder.mutation<Envelope<PublishResult[]>, { term?: number; classes: number[] }>({
      query: ({ term, classes }) => ({
        url: `/gradebook/classes/publish/`,
        method: "POST",
        params: termParams({ term }),
        body: { classes },
      }),
      invalidatesTags: (_result, _error, { classes }) => [
        "GradebookProgress",
        "GradebookRelease",
        "GradebookHolds",
        ...classes.map((id) => ({ type: "GradebookClass" as const, id })),
      ],
    }),

    // ── Release, report cards and a student's results ────────────────────

    /** The classes whose release list the reader may open, with their stage. */
    getReleaseClasses: builder.query<Envelope<ReleaseClasses>, TermArgs | void>({
      query: (args) => ({ url: `/gradebook/release/`, method: "GET", params: termParams(args ?? {}) }),
      providesTags: ["GradebookRelease", "GradebookProgress"],
    }),

    /** One class's release list: each student's guardian, result and email state. */
    getRelease: builder.query<Envelope<Release>, ClassKey>({
      query: ({ classId, term }) => ({ url: `/gradebook/release/${classId}/`, method: "GET", params: termParams({ term }) }),
      providesTags: ["GradebookRelease"],
    }),

    /** One student's report card, from the snapshot published with the class. */
    getReportCard: builder.query<Envelope<ReportCard>, ClassKey & { studentId: number }>({
      query: ({ classId, studentId, term }) => ({
        url: `/gradebook/report-cards/${classId}/${studentId}/`,
        method: "GET",
        params: termParams({ term }),
      }),
      providesTags: ["GradebookRelease"],
    }),

    /** Every released student's card in roll order, for printing the class. */
    getClassCards: builder.query<Envelope<ClassCards>, ClassKey>({
      query: ({ classId, term }) => ({
        url: `/gradebook/report-cards/${classId}/`,
        method: "GET",
        params: termParams({ term }),
      }),
      providesTags: ["GradebookRelease"],
    }),

    /** A student's Results tab: every term of their school years, and their history. */
    getStudentResults: builder.query<Envelope<StudentResults>, number>({
      query: (studentId) => ({ url: `/gradebook/students/${studentId}/results/`, method: "GET" }),
      providesTags: ["GradebookRelease"],
    }),

    // ── Corrections to published results ─────────────────────────────────

    /** The term's corrections in the reader's branches, waiting ones first. */
    getAmendments: builder.query<AmendmentsPage, AmendmentsArgs | void>({
      query: (args) => {
        const { status, page, ...term } = args ?? {};
        return {
          url: `/gradebook/amendments/`,
          method: "GET",
          params: { ...termParams(term), ...(status ? { status } : {}), ...(page ? { page } : {}) },
        };
      },
      providesTags: ["GradebookAmendments"],
    }),

    /** One student's subject as published, before a correction is asked for. */
    getAmendmentForm: builder.query<Envelope<AmendmentForm>, AmendmentTarget>({
      query: ({ term, classId, studentId, subjectId }) => ({
        url: `/gradebook/amendments/form/`,
        method: "GET",
        params: { ...termParams({ term }), class: classId, student: studentId, subject: subjectId },
      }),
      providesTags: ["GradebookAmendments"],
    }),

    /**
     * Asks for a correction. Silent: a refused cell comes back as a 422 listing
     * each cell, which the drawer prints under the cell it belongs to.
     */
    raiseAmendment: builder.mutation<Envelope<AmendmentRow>, AmendmentRaise>({
      query: (body) => ({ url: `/gradebook/amendments/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["GradebookAmendments", "GradebookRelease"],
    }),

    /** Applies a correction and re-issues the student's report card as the next version. */
    approveAmendment: builder.mutation<Envelope<AmendmentRow>, { id: number; note?: string }>({
      query: ({ id, note }) => ({
        url: `/gradebook/amendments/${id}/approve/`,
        method: "POST",
        body: note === undefined ? {} : { note },
      }),
      invalidatesTags: ["GradebookAmendments", "GradebookRelease", "GradebookSheet", "GradebookAnalytics"],
    }),

    /** Closes a correction without changing anything; the note is required. */
    rejectAmendment: builder.mutation<Envelope<AmendmentRow>, { id: number; note: string }>({
      query: ({ id, note }) => ({ url: `/gradebook/amendments/${id}/reject/`, method: "POST", body: { note } }),
      invalidatesTags: ["GradebookAmendments", "GradebookRelease"],
    }),

    // ── Performance analytics ────────────────────────────────────────────

    /** How the term's published results read, in the reader's branches. */
    getAnalytics: builder.query<Envelope<Analytics>, TermArgs | void>({
      query: (args) => ({ url: `/gradebook/analytics/`, method: "GET", params: termParams(args ?? {}) }),
      providesTags: ["GradebookAnalytics"],
    }),

    /**
     * One analytics table as a CSV or Excel file. Hands back an object URL
     * (the caller revokes it) and the server's file name; a Blob in the store
     * would trip the serializability check. A refusal keeps the server's
     * sentence and is silent here, because the screen shows it.
     */
    exportAnalytics: builder.mutation<
      DownloadedFile,
      TermArgs & { table: AnalyticsTable; fileType: "csv" | "xlsx" }
    >({
      query: ({ table, fileType, ...term }) => ({
        url: `/gradebook/analytics/export/`,
        method: "GET",
        params: { ...termParams(term), table, export: fileType },
        responseHandler: async (response) => {
          if (!response.ok) return response.json();
          const disposition = response.headers.get("Content-Disposition") ?? "";
          const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `gradebook_${table}.${fileType}`;
          return { url: URL.createObjectURL(await response.blob()), filename };
        },
      }),
      extraOptions: { silent: true },
    }),

    // ── Fee holds ────────────────────────────────────────────────────────

    /** The roll of the term's classes with what Finance says each family owes. */
    getHolds: builder.query<HoldsPage, HoldsArgs | void>({
      query: (args) => {
        const { classId, search, owes, page, ...term } = args ?? {};
        return {
          url: `/gradebook/holds/`,
          method: "GET",
          params: {
            ...termParams(term),
            ...(classId ? { class: classId } : {}),
            ...(search?.trim() ? { search: search.trim() } : {}),
            ...(owes ? { owes: "true" } : {}),
            ...(page ? { page } : {}),
          },
        };
      },
      providesTags: ["GradebookHolds"],
    }),

    /** Holds a student's result for the term, with a reason. Answers with their row. */
    placeHold: builder.mutation<Envelope<HoldRow>, { student: number; term: number; reason: string }>({
      query: (body) => ({ url: `/gradebook/holds/`, method: "POST", body }),
      invalidatesTags: ["GradebookHolds", "GradebookProgress", "GradebookRelease", "GradebookClass"],
    }),

    /** Lifts a hold; on a published class this releases the result and tells the guardian. */
    liftHold: builder.mutation<Envelope<HoldLiftResult>, { holdId: number; note?: string }>({
      query: ({ holdId, note }) => ({
        url: `/gradebook/holds/${holdId}/lift/`,
        method: "POST",
        body: note === undefined ? {} : { note },
      }),
      invalidatesTags: ["GradebookHolds", "GradebookProgress", "GradebookRelease", "GradebookClass"],
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

    /** The sheet as an Excel file to fill in offline, under the server's file name. */
    downloadSheetTemplate: builder.mutation<DownloadedFile, SheetKey>({
      query: (key) => ({
        url: `${sheetUrl(key)}template/`,
        method: "GET",
        params: termParams({ term: key.term }),
        responseHandler: async (response) => {
          if (!response.ok) return response.json();
          const disposition = response.headers.get("Content-Disposition") ?? "";
          const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? "score-sheet.xlsx";
          return { url: URL.createObjectURL(await response.blob()), filename };
        },
      }),
      extraOptions: { silent: true },
    }),

    /**
     * Checks an uploaded file against the sheet and saves nothing. Silent: the
     * upload drawer shows every refusal where it belongs.
     */
    previewSheetImport: builder.mutation<Envelope<ImportPreview>, SheetKey & { file: File }>({
      query: ({ file, ...key }) => {
        const body = new FormData();
        body.append("file", file);
        return { url: `${sheetUrl(key)}import/`, method: "POST", params: termParams({ term: key.term }), body };
      },
      extraOptions: { silent: true },
    }),

    /** Saves the chosen rows of a checked upload. Answers with the sheet, written into the cache. */
    confirmSheetImport: builder.mutation<Envelope<Sheet>, SheetKey & { token: string; rows: number[] }>({
      query: ({ token, rows, ...key }) => ({
        url: `${sheetUrl(key)}import/${token}/confirm/`,
        method: "POST",
        body: { rows },
      }),
      extraOptions: { silent: true },
      async onQueryStarted({ token: _token, rows: _rows, ...key }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(gradebookApi.util.updateQueryData("getSheet", key, () => data));
        } catch {
          // The drawer reads the refusal off the mutation's own result.
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
  useGetApprovalsQuery,
  useReturnClassMutation,
  useGetPrincipalCommentsQuery,
  useSavePrincipalCommentsMutation,
  useGetPublishPreviewQuery,
  useLazyGetPublishPreviewQuery,
  usePublishClassesMutation,
  useGetReleaseClassesQuery,
  useGetReleaseQuery,
  useGetReportCardQuery,
  useGetClassCardsQuery,
  useGetStudentResultsQuery,
  useGetAnalyticsQuery,
  useExportAnalyticsMutation,
  useGetAmendmentsQuery,
  useGetAmendmentFormQuery,
  useRaiseAmendmentMutation,
  useApproveAmendmentMutation,
  useRejectAmendmentMutation,
  useGetHoldsQuery,
  usePlaceHoldMutation,
  useLiftHoldMutation,
  useGetMySheetsQuery,
  useGetSheetQuery,
  useSaveScoresMutation,
  useSubmitSheetMutation,
  useDownloadSheetTemplateMutation,
  usePreviewSheetImportMutation,
  useConfirmSheetImportMutation,
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
