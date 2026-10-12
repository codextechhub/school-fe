import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import { dayParams } from "./attendance-params";
import type {
  AdminHub,
  AttendanceSettings,
  AttendanceSettingsWrite,
  CorrectionCreate,
  CorrectionDecision,
  CorrectionListArgs,
  CorrectionRow,
  DayArgs,
  MarkWrite,
  ReasonCode,
  ReasonCodeWrite,
  Register,
  RegisterKey,
  Report,
  ReportArgs,
  StudentAttendance,
  TeacherHub,
} from "./attendance-types";

/**
 * Attendance: the day's registers, read and taken, under `/v1/attendance/`.
 *
 * Every route answers `TENANT_NOT_LIVE` to a school still onboarding, which the
 * base query turns into the not-live screen, so nothing here guards for it.
 *
 * **Two Today reads, chosen by role, never both.** `today/` is the
 * administrator's view of every class in their branches and refuses a caller
 * who holds neither `mark_any` nor `correction.approve`. `today/mine/` is the
 * caller's own class and lessons. The screen picks one from the reader's keys
 * rather than asking the first and falling back on its refusal.
 *
 * **A register write answers with the whole register.** Marking a row, filling
 * the rest and submitting each return the register as it now stands, so the
 * answer is written straight into the cached copy (`putRegister`) instead of
 * refetching it. On a phone, standing in front of a class, that is the
 * difference between a tap that lands and a tap that waits for a second read.
 * The hubs (`AttendanceDay`) are refetched, because their figures moved.
 */
export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAttendanceToday: builder.query<Envelope<AdminHub>, DayArgs>({
      query: (args) => ({
        url: `/attendance/today/`,
        method: "GET",
        params: dayParams(args),
      }),
      providesTags: ["AttendanceDay"],
    }),

    getMyAttendanceToday: builder.query<Envelope<TeacherHub>, Pick<DayArgs, "date">>({
      query: (args) => ({
        url: `/attendance/today/mine/`,
        method: "GET",
        params: dayParams({ date: args.date }),
      }),
      providesTags: ["AttendanceDay"],
    }),

    /**
     * Remind a class teacher that their register for the day is not taken.
     *
     * Once per class per day: a second reminder is refused with a sentence
     * naming who was already reminded, which the base query shows as a toast.
     */
    remindClassTeacher: builder.mutation<Envelope<unknown>, RegisterKey>({
      query: ({ classId, date }) => ({
        url: `/attendance/registers/${classId}/${date}/remind/`,
        method: "POST",
      }),
      invalidatesTags: ["AttendanceDay"],
    }),

    // ── One class's register ───────────────────────────────────────────────

    getRegister: builder.query<Envelope<Register>, RegisterKey>({
      query: ({ classId, date }) => ({
        url: `/attendance/registers/${classId}/${date}/`,
        method: "GET",
      }),
      providesTags: (_result, _error, { classId, date }) => [
        { type: "AttendanceRegister", id: `${classId}@${date}` },
      ],
    }),

    /** Record one row. The body is the whole row: a note left out is kept. */
    setMark: builder.mutation<Envelope<Register>, RegisterKey & { studentId: number; body: MarkWrite }>({
      query: ({ classId, date, studentId, body }) => ({
        url: `/attendance/registers/${classId}/${date}/marks/${studentId}/`,
        method: "PUT",
        body,
      }),
      onQueryStarted: putRegister,
      invalidatesTags: ["AttendanceDay", "AttendanceStudent", "AttendanceReports"],
    }),

    /** Mark every unmarked, unlocked row Present. Submits nothing. */
    fillPresent: builder.mutation<Envelope<Register & { filled: number }>, RegisterKey>({
      query: ({ classId, date }) => ({
        url: `/attendance/registers/${classId}/${date}/fill-present/`,
        method: "POST",
      }),
      onQueryStarted: putRegister,
      invalidatesTags: ["AttendanceDay", "AttendanceStudent", "AttendanceReports"],
    }),

    /** Submit the register. Guardian notices go out from the server as it lands. */
    submitRegister: builder.mutation<Envelope<Register>, RegisterKey>({
      query: ({ classId, date }) => ({
        url: `/attendance/registers/${classId}/${date}/submit/`,
        method: "POST",
      }),
      onQueryStarted: putRegister,
      invalidatesTags: ["AttendanceDay", "AttendanceStudent", "AttendanceReports"],
    }),

    /**
     * The school's reasons for excusing an absence. `active` leaves out the
     * retired ones, which is what a drawer offers: a retired reason stays on
     * the marks that used it and is chosen for no new one.
     */
    getReasonCodes: builder.query<Envelope<ReasonCode[]>, { active?: boolean } | void>({
      query: (args) => ({
        url: `/attendance/reason-codes/`,
        method: "GET",
        params: args?.active ? { active: "1" } : {},
      }),
      providesTags: ["AttendanceReasonCodes"],
    }),

    /**
     * Ask for a mark on a closed day to change. The register itself does not
     * move until an administrator decides, so only the hubs are refetched.
     */
    requestCorrection: builder.mutation<Envelope<CorrectionRow>, CorrectionCreate>({
      query: (body) => ({
        url: `/attendance/corrections/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["AttendanceDay", "AttendanceCorrections"],
    }),

    // ── Corrections ───────────────────────────────────────────────────────

    /**
     * Waiting or decided corrections, newest first. A decider reads every
     * correction in their branches; a reader who may only ask reads their own.
     */
    getCorrections: builder.query<PaginatedEnvelope<CorrectionRow>, CorrectionListArgs>({
      query: ({ status, branch, page, awaitingMe }) => ({
        url: `/attendance/corrections/`,
        method: "GET",
        params: {
          status,
          ...(awaitingMe ? { awaiting: "me" } : {}),
          ...dayParams({ branch }),
          ...(page && page > 1 ? { page } : {}),
        },
      }),
      providesTags: ["AttendanceCorrections"],
    }),

    /**
     * Approve or reject. Approval changes the mark, so every register, hub and
     * student tab that may show it is refetched; a rejection changes only the
     * queue and the student's history, but the two are not told apart here.
     */
    decideCorrection: builder.mutation<Envelope<CorrectionRow>, CorrectionDecision>({
      query: ({ id, approve, decision_note }) => ({
        url: `/attendance/corrections/${id}/${approve ? "approve" : "reject"}/`,
        method: "POST",
        body: decision_note ? { decision_note } : {},
      }),
      invalidatesTags: [
        "AttendanceCorrections",
        "AttendanceDay",
        "AttendanceRegister",
        "AttendanceStudent",
        "AttendanceReports",
      ],
    }),

    // ── Settings and reasons ───────────────────────────────────────────────

    /** The school's attendance settings, with the active year's levels. */
    getAttendanceSettings: builder.query<Envelope<AttendanceSettings>, void>({
      query: () => ({ url: `/attendance/settings/`, method: "GET" }),
      providesTags: ["AttendanceSettings"],
    }),

    /**
     * Change any of the four settings. Lesson marking and the threshold move
     * what the hubs and reports show, so those are refetched too.
     */
    updateAttendanceSettings: builder.mutation<Envelope<AttendanceSettings>, AttendanceSettingsWrite>({
      query: (body) => ({ url: `/attendance/settings/`, method: "PATCH", body }),
      invalidatesTags: ["AttendanceSettings", "AttendanceDay", "AttendanceReports"],
    }),

    addReasonCode: builder.mutation<Envelope<ReasonCode>, ReasonCodeWrite>({
      query: (body) => ({ url: `/attendance/reason-codes/`, method: "POST", body }),
      invalidatesTags: ["AttendanceReasonCodes"],
    }),

    /**
     * Retire a reason, or bring one back. A retired reason stays on the marks
     * that used it and is offered on no new one; the last live reason cannot
     * be retired.
     */
    setReasonCodeRetired: builder.mutation<Envelope<ReasonCode>, { id: number; retired: boolean }>({
      query: ({ id, retired }) => ({
        url: `/attendance/reason-codes/${id}/${retired ? "retire" : "restore"}/`,
        method: "POST",
      }),
      invalidatesTags: ["AttendanceReasonCodes"],
    }),

    // ── Reports ────────────────────────────────────────────────────────────

    /** One term's attendance across the reader's branches; no term means the current one. */
    getAttendanceReport: builder.query<Envelope<Report>, ReportArgs>({
      query: ({ term, branch }) => ({
        url: `/attendance/reports/`,
        method: "GET",
        params: { ...dayParams({ branch }), ...(term ? { term } : {}) },
      }),
      providesTags: ["AttendanceReports"],
    }),

    // ── A student's Attendance tab ─────────────────────────────────────────

    /** One term of a student's attendance; no term means the current one. */
    getStudentAttendance: builder.query<Envelope<StudentAttendance>, { studentId: number; term?: number }>({
      query: ({ studentId, term }) => ({
        url: `/attendance/students/${studentId}/`,
        method: "GET",
        params: term ? { term } : {},
      }),
      providesTags: ["AttendanceStudent"],
    }),
  }),
});

/** Writes a register write's answer into the cached register it came from. */
async function putRegister(
  { classId, date }: RegisterKey,
  {
    dispatch,
    queryFulfilled,
  }: {
    dispatch: (action: unknown) => unknown;
    queryFulfilled: Promise<{ data: Envelope<Register> }>;
  },
) {
  try {
    const { data } = await queryFulfilled;
    dispatch(
      attendanceApi.util.upsertQueryData("getRegister", { classId, date }, data),
    );
  } catch {
    // A refused write changes nothing; the base query has already said why.
  }
}

export const {
  useGetAttendanceTodayQuery,
  useGetMyAttendanceTodayQuery,
  useRemindClassTeacherMutation,
  useGetRegisterQuery,
  useSetMarkMutation,
  useFillPresentMutation,
  useSubmitRegisterMutation,
  useGetReasonCodesQuery,
  useRequestCorrectionMutation,
  useGetCorrectionsQuery,
  useDecideCorrectionMutation,
  useGetStudentAttendanceQuery,
  useGetAttendanceSettingsQuery,
  useUpdateAttendanceSettingsMutation,
  useAddReasonCodeMutation,
  useSetReasonCodeRetiredMutation,
  useGetAttendanceReportQuery,
} = attendanceApi;
