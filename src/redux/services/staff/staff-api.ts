import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type {
  ClassTeacherResult,
  ClassTeacherWrite,
  StaffBulkPosting,
  StaffBulkPostingResult,
  StaffBulkRole,
  StaffBulkRoleResult,
  StaffCreate,
  StaffDetail,
  StaffDocument,
  StaffHistoryEntry,
  StaffLeave,
  StaffLeaveFiled,
  StaffLeaveRequest,
  StaffLeaveWrite,
  StaffListQuery,
  StaffListResponse,
  StaffQualification,
  StaffQualificationWrite,
  StaffRoles,
  StaffRoster,
  StaffSearchHit,
  StaffStatusChange,
  StaffStatusOptions,
  StaffStatusResult,
  StaffTeaching,
  StaffUpdate,
  TeachingAssignment,
  TeachingCoverage,
  TeachingPart,
  TeachingWrite,
} from "./staff-types";

/**
 * The school's own staff, at `/v1/i/me/staff/`.
 *
 * Takes no school identifier: the school is the session's, so there is nothing
 * to tamper with and no way to read another school's people.
 *
 * **Not every route here is open before go-live.** The directory, the record,
 * search, the roster, postings, bulk grants, qualifications, documents and the
 * invitation controls are; teaching, leave, the employment lifecycle and the
 * account actions are not, and answer 403 `TENANT_NOT_LIVE` to a school still
 * onboarding. Adding somebody is a step on the checklist; terminating them is
 * not. Each endpoint below says which it is.
 *
 * `silent: true` where the refusals are sentences the reader has to act on
 * ("Somebody at this school already has that staff ID") and belong against the
 * field that caused them rather than in a global toast.
 *
 * ── Tags ───────────────────────────────────────────────────────────────────
 * `SchoolStaff` covers the list AND one person's record, because they carry the
 * same facts and every write that moves one moves the other: a role grant
 * changes a row's Role column, a teaching duty changes its load, a status
 * change changes both chips. The four narrower tags exist only where a write
 * would otherwise refetch the whole directory to update one tab.
 */
export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── The directory and the record ───────────────────────────────────────

    /**
     * The page, its six counts, the roles this school may hand out, and whether
     * the branch dimension applies - in one call, because a directory that
     * needs four calls to draw its header draws it late.
     *
     * Open before go-live.
     */
    getStaffList: builder.query<StaffListResponse, StaffListQuery | void>({
      query: (args) => ({
        url: `/i/me/staff/`,
        method: "GET",
        params: { page: 1, ...(args ?? {}) },
      }),
      extraOptions: { silent: true },
      providesTags: ["SchoolStaff"],
    }),

    getStaffMember: builder.query<Envelope<StaffDetail>, number>({
      query: (id) => ({ url: `/i/me/staff/${id}/`, method: "GET" }),
      providesTags: ["SchoolStaff"],
    }),

    /**
     * Add somebody and invite them, in one transaction.
     *
     * Multipart, because the form carries a photograph. **Documents are not
     * part of this call** - they are uploaded against the id it returns.
     *
     * Invalidates the checklist as well as the list: the platform decides
     * whether "Add Staff & Invitations" is done by looking at who is here.
     *
     * Open before go-live, with the role picker narrowed to the two
     * administrator roles - and the POST refuses any other role as well, so the
     * narrowing is the rule rather than a description of it.
     */
    createStaff: builder.mutation<Envelope<StaffDetail>, FormData | StaffCreate>({
      query: (body) => ({ url: `/i/me/staff/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "Onboarding"],
    }),

    /**
     * Edit the record. Not the employment status, which moves only through the
     * lifecycle endpoint, and not the email, which is a different key.
     */
    updateStaff: builder.mutation<
      Envelope<StaffDetail>,
      { id: number; body: FormData | StaffUpdate }
    >({
      query: ({ id, body }) => ({
        url: `/i/me/staff/${id}/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "StaffHistory"],
    }),

    /**
     * The command palette's staff hits. Capped at ten, needs two characters,
     * and carries no email address.
     */
    searchStaff: builder.query<Envelope<StaffSearchHit[]>, string>({
      query: (q) => ({ url: `/i/me/staff/search/`, method: "GET", params: { q } }),
      extraOptions: { silent: true },
      providesTags: ["SchoolStaff"],
    }),

    // ── Invitations ────────────────────────────────────────────────────────

    /**
     * Send an existing invitation again.
     *
     * Deliberately not "invite them again": this reuses the account that is
     * already there, so a school chasing somebody who never clicked the link
     * cannot end up with two rows for one person. Resending voids the old link
     * and restarts the clock.
     */
    resendStaffInvitation: builder.mutation<Envelope<StaffDetail>, number>({
      query: (id) => ({ url: `/i/me/staff/${id}/resend/`, method: "POST" }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "StaffHistory"],
    }),

    /** Withdraw an unused invitation. Closed before go-live. */
    revokeStaffInvitation: builder.mutation<
      Envelope<StaffDetail>,
      { id: number; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/i/me/staff/${id}/invitation/revoke/`,
        method: "POST",
        body: { reason },
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "StaffHistory"],
    }),

    // ── Employment lifecycle ───────────────────────────────────────────────

    /**
     * What this person can be moved to, and what each move would do.
     *
     * Read rather than hard-coded, so a rule changed on the server reaches the
     * drawer without a release. Closed before go-live.
     */
    getStaffStatusOptions: builder.query<Envelope<StaffStatusOptions>, number>({
      query: (id) => ({ url: `/i/me/staff/${id}/status/`, method: "GET" }),
      providesTags: ["SchoolStaff"],
    }),

    changeStaffStatus: builder.mutation<
      Envelope<StaffStatusResult>,
      { id: number; body: StaffStatusChange }
    >({
      query: ({ id, body }) => ({
        url: `/i/me/staff/${id}/status/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "StaffHistory", "StaffTeaching"],
    }),

    getStaffHistory: builder.query<
      Envelope<{ entries: StaffHistoryEntry[] }>,
      number
    >({
      query: (id) => ({ url: `/i/me/staff/${id}/history/`, method: "GET" }),
      providesTags: ["StaffHistory"],
    }),

    // ── The account, which is the identity layer's and not this module's ────

    /**
     * Close a login without saying anything about the job, end a suspension, or
     * clear a security lockout.
     *
     * Separate from the employment transitions on purpose: a teacher locked out
     * on a Tuesday is employed, at work, and in front of her class.
     */
    staffAccountAction: builder.mutation<
      Envelope<StaffDetail>,
      { id: number; action: "suspend" | "reactivate" | "unlock"; reason?: string }
    >({
      query: ({ id, action, reason }) => ({
        url: `/i/me/staff/${id}/account/${action}/`,
        method: "POST",
        body: reason ? { reason } : {},
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "StaffHistory"],
    }),

    /** Correct the sign-in address. A mistyped invitation is why this exists. */
    changeStaffEmail: builder.mutation<
      Envelope<StaffDetail>,
      { id: number; email: string }
    >({
      query: ({ id, email }) => ({
        url: `/i/me/staff/${id}/account/email/`,
        method: "PATCH",
        body: { email },
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "StaffHistory"],
    }),

    // ── Roles and reach ────────────────────────────────────────────────────

    /**
     * One person's grants, what they reach, and the grants they have lost.
     *
     * Revoked grants are history and are never deleted: "what could this person
     * do before" is the question asked after something has gone wrong.
     */
    getStaffRoles: builder.query<Envelope<StaffRoles>, number>({
      query: (id) => ({ url: `/i/me/staff/${id}/roles/`, method: "GET" }),
      providesTags: ["SchoolStaff", "Roles"],
    }),

    // ── Qualifications and documents ───────────────────────────────────────

    getStaffQualifications: builder.query<Envelope<StaffQualification[]>, number>({
      query: (id) => ({
        url: `/i/me/staff/${id}/qualifications/`,
        method: "GET",
      }),
      providesTags: ["StaffRecords"],
    }),

    addStaffQualification: builder.mutation<
      Envelope<StaffQualification>,
      { id: number; body: StaffQualificationWrite }
    >({
      query: ({ id, body }) => ({
        url: `/i/me/staff/${id}/qualifications/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffRecords", "SchoolStaff"],
    }),

    updateStaffQualification: builder.mutation<
      Envelope<StaffQualification>,
      { qualificationId: number; body: Partial<StaffQualificationWrite> }
    >({
      query: ({ qualificationId, body }) => ({
        url: `/i/me/staff/qualifications/${qualificationId}/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffRecords"],
    }),

    deleteStaffQualification: builder.mutation<Envelope<null>, number>({
      query: (qualificationId) => ({
        url: `/i/me/staff/qualifications/${qualificationId}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["StaffRecords", "SchoolStaff"],
    }),

    getStaffDocuments: builder.query<Envelope<StaffDocument[]>, number>({
      query: (id) => ({ url: `/i/me/staff/${id}/documents/`, method: "GET" }),
      providesTags: ["StaffRecords"],
    }),

    /**
     * Multipart. The server checks the extension and the size against the
     * storage layer's own limits and answers a 422 naming which one failed, so
     * both refusals belong on the field rather than in a toast.
     */
    uploadStaffDocument: builder.mutation<
      Envelope<StaffDocument>,
      { id: number; body: FormData }
    >({
      query: ({ id, body }) => ({
        url: `/i/me/staff/${id}/documents/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffRecords", "SchoolStaff"],
    }),

    deleteStaffDocument: builder.mutation<Envelope<null>, number>({
      query: (documentId) => ({
        url: `/i/me/staff/documents/${documentId}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["StaffRecords", "SchoolStaff"],
    }),

    // ── Leave ──────────────────────────────────────────────────────────────

    /**
     * Somebody's leave, and the days taken per type.
     *
     * A person always reads their own without holding `school.leave.view`.
     * Closed before go-live.
     */
    getStaffLeave: builder.query<Envelope<StaffLeave>, number>({
      query: (id) => ({ url: `/i/me/staff/${id}/leave/`, method: "GET" }),
      providesTags: ["StaffLeave"],
    }),

    /**
     * File a request. Applying for your own needs `school.leave.apply`, which
     * every member of staff holds; filing somebody else's needs
     * `school.leave.manage`. The server picks the key from whose record it is,
     * so this is one call behind two gates rather than two calls.
     *
     * The request goes to the school's own approver group. Overlapping leave
     * warns in `warnings` and does not refuse.
     */
    fileStaffLeave: builder.mutation<
      Envelope<StaffLeaveFiled>,
      { id: number; body: StaffLeaveWrite }
    >({
      query: ({ id, body }) => ({
        url: `/i/me/staff/${id}/leave/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffLeave", "SchoolStaff", "WorkflowSubmissions"],
    }),

    /** Correct a request that has not been decided. */
    updateStaffLeave: builder.mutation<
      Envelope<StaffLeaveRequest>,
      { leaveId: number; body: Partial<StaffLeaveWrite> }
    >({
      query: ({ leaveId, body }) => ({
        url: `/i/me/staff/leave/${leaveId}/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffLeave", "SchoolStaff"],
    }),

    cancelStaffLeave: builder.mutation<Envelope<null>, number>({
      query: (leaveId) => ({
        url: `/i/me/staff/leave/${leaveId}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["StaffLeave", "SchoolStaff", "WorkflowSubmissions"],
    }),

    // ── Teaching duties ────────────────────────────────────────────────────

    /**
     * What one person teaches this session.
     *
     * An archived year still returns its assignments and refuses new ones: who
     * taught what last year is a record a school will be asked for.
     */
    getStaffTeaching: builder.query<
      Envelope<StaffTeaching>,
      { id: number; session?: number }
    >({
      query: ({ id, session }) => ({
        url: `/i/me/staff/${id}/teaching/`,
        method: "GET",
        params: session ? { session } : undefined,
      }),
      providesTags: ["StaffTeaching"],
    }),

    assignTeaching: builder.mutation<
      Envelope<TeachingAssignment>,
      { id: number; body: TeachingWrite }
    >({
      query: ({ id, body }) => ({
        url: `/i/me/staff/${id}/teaching/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffTeaching", "SchoolStaff"],
    }),

    /**
     * Make lead, or step back.
     *
     * Promoting somebody where the pairing already has a lead is refused with
     * the current holder named, so a school displaces a colleague deliberately
     * rather than discovering afterwards that they no longer have the class.
     */
    setTeachingPart: builder.mutation<
      Envelope<TeachingAssignment>,
      { assignmentId: number; part: TeachingPart }
    >({
      query: ({ assignmentId, part }) => ({
        url: `/i/me/staff/teaching/${assignmentId}/`,
        method: "PATCH",
        body: { part },
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffTeaching", "SchoolStaff"],
    }),

    removeTeaching: builder.mutation<Envelope<null>, number>({
      query: (assignmentId) => ({
        url: `/i/me/staff/teaching/${assignmentId}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["StaffTeaching", "SchoolStaff"],
    }),

    /**
     * What has a teacher, and what does not, as class-by-subject cells.
     *
     * Paginated and capped: a secondary school with forty classes and fifteen
     * subjects is six hundred pairings and must not be one response. Render the
     * cells the server returns; do not build a cross product on the client,
     * which would cross every class with every subject rather than reading the
     * offerings at each level.
     */
    getTeachingCoverage: builder.query<
      TeachingCoverage,
      { session?: number; only_gaps?: boolean; page?: number } | void
    >({
      query: (args) => ({
        url: `/i/me/staff/teaching/coverage/`,
        method: "GET",
        params: {
          page: args?.page ?? 1,
          ...(args?.session ? { session: args.session } : {}),
          ...(args?.only_gaps ? { only_gaps: "true" } : {}),
        },
      }),
      providesTags: ["StaffTeaching"],
    }),

    /**
     * Designate a class teacher, or clear one.
     *
     * Written to the class rather than to an assignment, because the
     * designation is unique per class by construction.
     */
    setClassTeacher: builder.mutation<Envelope<ClassTeacherResult>, ClassTeacherWrite>({
      query: (body) => ({
        url: `/i/me/staff/teaching/class-teacher/`,
        method: "PUT",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["StaffTeaching", "SchoolStaff", "Classes"],
    }),

    // ── Posting and reach ──────────────────────────────────────────────────

    /**
     * Who works at one branch, and why they appear there.
     *
     * Answers 404 at a single-branch school, where the dimension recedes
     * entirely rather than showing a roster with one group in it.
     */
    getStaffRoster: builder.query<Envelope<StaffRoster>, string | number>({
      query: (branch) => ({
        url: `/i/me/staff/roster/`,
        method: "GET",
        params: { branch },
      }),
      extraOptions: { silent: true },
      providesTags: ["SchoolStaff"],
    }),

    /**
     * Move several people at once.
     *
     * This changes where they are based and nothing about which branches their
     * roles reach; the response says so, and warns by name about anybody who
     * still teaches at the branch they have left.
     */
    moveStaffPosting: builder.mutation<
      Envelope<StaffBulkPostingResult>,
      StaffBulkPosting
    >({
      query: (body) => ({ url: `/i/me/staff/posting/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "StaffHistory"],
    }),

    /** One role, one reach, several people. Existing roles are untouched. */
    grantStaffRoleInBulk: builder.mutation<
      Envelope<StaffBulkRoleResult>,
      StaffBulkRole
    >({
      query: (body) => ({ url: `/i/me/staff/roles/bulk/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["SchoolStaff", "Roles"],
    }),
  }),
});

export const {
  useGetStaffListQuery,
  useGetStaffMemberQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useSearchStaffQuery,
  useLazySearchStaffQuery,
  useResendStaffInvitationMutation,
  useRevokeStaffInvitationMutation,
  useGetStaffStatusOptionsQuery,
  useChangeStaffStatusMutation,
  useGetStaffHistoryQuery,
  useStaffAccountActionMutation,
  useChangeStaffEmailMutation,
  useGetStaffRolesQuery,
  useGetStaffQualificationsQuery,
  useAddStaffQualificationMutation,
  useUpdateStaffQualificationMutation,
  useDeleteStaffQualificationMutation,
  useGetStaffDocumentsQuery,
  useUploadStaffDocumentMutation,
  useDeleteStaffDocumentMutation,
  useGetStaffLeaveQuery,
  useFileStaffLeaveMutation,
  useUpdateStaffLeaveMutation,
  useCancelStaffLeaveMutation,
  useGetStaffTeachingQuery,
  useAssignTeachingMutation,
  useSetTeachingPartMutation,
  useRemoveTeachingMutation,
  useGetTeachingCoverageQuery,
  useSetClassTeacherMutation,
  useGetStaffRosterQuery,
  useMoveStaffPostingMutation,
  useGrantStaffRoleInBulkMutation,
} = staffApi;
