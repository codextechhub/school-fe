import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import { termParams } from "./gradebook-params";
import type { CellWrite, Sheet, SheetKey, SubmitResult, TeacherHub } from "./gradebook-types";

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
  }),
});

export const {
  useGetMySheetsQuery,
  useGetSheetQuery,
  useSaveScoresMutation,
  useSubmitSheetMutation,
} = gradebookApi;
