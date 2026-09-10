import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type {
  AdmissionPolicy,
  BulkResultRow,
  ClassSeats,
  PromotionBatch,
  PromotionOutcome,
  PromotionPlan,
  EnrolWrite,
  StudentStatus,
  StudentWrite,
  ClassHistoryRow,
  GuardianDetail,
  GuardianRow,
  GuardianSummary,
  HistoryEntry,
  DocumentType,
  StudentDetail,
  StudentDocumentRow,
  StudentGuardianLink,
  StudentListArgs,
  StudentRow,
  GuardianSearchHit,
  StudentSearchHit,
  StudentSubject,
  StudentSummary,
} from "./students-types";

// ─────────────────────────────────────────────────────────────────────────────
// Student Management, at /v1/students/ and /v1/guardians/.
//
// **Every read here is closed to a school that has not gone live.** The module
// declares no `pending_tenant_surface`, deliberately: enrolling a child and
// running a promotion are operations of a live school. A pending school gets
// 403 TENANT_NOT_LIVE and base-api redirects it to the not-live screen, so
// nothing in this file needs to handle that case itself.
//
// **`?tenant=` is injected centrally** by base-api. Never add it here.
//
// **Guardians sit under their own prefix**, not under a student, because a
// guardian is reachable from more than one child - so the tenant check on
// those routes cannot be inherited from a student id in the URL.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Drop what the API should not receive.
 *
 * "all" is the screen's word for "no filter", and sending it would be read as a
 * literal value; `undefined` and "" are the same idea arriving by other routes.
 * Doing it here rather than at each call site means one place decides, and a
 * new filter cannot forget.
 */
function listParams(args: StudentListArgs | void) {
  const source = (args ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(source).filter(
      ([, value]) => value !== undefined && value !== "" && value !== "all",
    ),
  );
}

export const studentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * The directory's header: the tiles, the status bar and the capacity panel.
     *
     * Aggregated over the same scoped queryset the list uses, and narrowed by
     * the same `?branch=`, so the figures can never describe a different set of
     * students from the table below them. That agreement is the whole point:
     * the summary used not to take a branch, and the tiles sat there saying 87
     * over a table showing 49.
     */
    getStudentSummary: builder.query<
      Envelope<StudentSummary>,
      { branch?: number; session?: number } | void
    >({
      query: (args) => ({
        url: `/students/summary/`,
        method: "GET",
        params: listParams(args as StudentListArgs | void),
      }),
      providesTags: ["Students"],
    }),

    getStudents: builder.query<PaginatedEnvelope<StudentRow>, StudentListArgs | void>({
      query: (args) => ({
        url: `/students/`,
        method: "GET",
        params: listParams(args),
      }),
      providesTags: ["Students"],
    }),

    /**
     * On the roll with no class. Drives the nav badge and the assign screen.
     *
     * Deliberately narrower than "no active enrolment", which would also sweep
     * in applicants and leavers - and this is a count in front of a registrar
     * all day, so a wrong definition is a wrong number all day.
     */
    getUnplacedStudents: builder.query<
      PaginatedEnvelope<StudentRow>,
      { branch?: number; session?: number } | void
    >({
      query: (args) => ({
        url: `/students/unplaced/`,
        method: "GET",
        params: listParams(args as StudentListArgs | void),
      }),
      providesTags: ["Students"],
    }),

    getStudent: builder.query<Envelope<StudentDetail>, number>({
      query: (id) => ({ url: `/students/${id}/`, method: "GET" }),
      providesTags: ["Students"],
    }),

    getStudentGuardians: builder.query<Envelope<StudentGuardianLink[]>, number>({
      query: (id) => ({ url: `/students/${id}/guardians/`, method: "GET" }),
      providesTags: ["Students", "Guardians"],
    }),

    /** Read from Academic Structure for the level of the student's class. */
    getStudentSubjects: builder.query<Envelope<StudentSubject[]>, number>({
      query: (id) => ({ url: `/students/${id}/subjects/`, method: "GET" }),
      providesTags: ["Students"],
    }),

    getStudentClassHistory: builder.query<PaginatedEnvelope<ClassHistoryRow>, number>({
      query: (id) => ({ url: `/students/${id}/class-history/`, method: "GET" }),
      providesTags: ["Students"],
    }),

    getStudentDocuments: builder.query<Envelope<StudentDocumentRow[]>, number>({
      query: (id) => ({ url: `/students/${id}/documents/`, method: "GET" }),
      providesTags: ["Students"],
    }),

    /**
     * Attach or replace one document - including the passport photograph,
     * which is where a student's face comes from.
     *
     * **This is the write the module never had a control for.** The route has
     * always existed and the checklist has always asked for a birth
     * certificate and a passport photograph, but no screen could send one - so
     * every record showed "Not on file" for two required documents with no way
     * to change it, and every avatar in the app showed initials.
     *
     * FormData, not JSON: fetchBaseQuery leaves a FormData body alone and lets
     * the browser set the multipart boundary. Setting Content-Type by hand here
     * would break it, which is why prepareHeaders does not.
     *
     * Invalidates Students, not just this document list: the photograph is on
     * the directory row, the class register and the guardian's list of
     * children too.
     */
    uploadStudentDocument: builder.mutation<
      Envelope<StudentDocumentRow[]>,
      { id: number; documentType: DocumentType; file: File }
    >({
      query: ({ id, documentType, file }) => {
        const body = new FormData();
        body.append("document_type", documentType);
        body.append("file", file);
        return { url: `/students/${id}/documents/`, method: "POST", body };
      },
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    deleteStudentDocument: builder.mutation<
      Envelope<null>,
      { id: number; docId: number }
    >({
      query: ({ id, docId }) => ({
        url: `/students/${id}/documents/${docId}/`,
        method: "DELETE",
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    /**
     * The History tab: the module's status log and the platform's audit trail
     * merged into one stream, newest first.
     */
    getStudentHistory: builder.query<PaginatedEnvelope<HistoryEntry>, number>({
      query: (id) => ({ url: `/students/${id}/history/`, method: "GET" }),
      providesTags: ["Students"],
    }),

    getGuardians: builder.query<
      PaginatedEnvelope<GuardianRow>,
      { search?: string; page?: number; branch?: number; session?: number } | void
    >({
      query: (args) => ({
        url: `/guardians/`,
        method: "GET",
        params: listParams(args as StudentListArgs | void),
      }),
      providesTags: ["Guardians"],
    }),

    /**
     * Correct a guardian's OWN details.
     *
     * Not their link to a student - relationship and primary-contact live on
     * that, one per child, and a guardian standing for three has three of them.
     *
     * Invalidates Students as well as Guardians: the directory row and the
     * profile's guardian card both carry a guardian's name, so leaving them
     * would show the old spelling until something else refetched.
     */
    updateGuardian: builder.mutation<
      Envelope<GuardianSummary>,
      { id: number } & Partial<{
        full_name: string;
        phone: string;
        email: string;
        occupation: string;
        address: string;
      }>
    >({
      query: ({ id, ...body }) => ({
        url: `/guardians/${id}/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Guardians", "Students"],
    }),

    /**
     * A guardian's photograph. Optional, and a gate on nothing.
     *
     * **The guardian record had no photograph at all** - not an empty column, a
     * missing one - so a contact card showed a phone number where a face should
     * be and there was nowhere in the product that could have put one there.
     *
     * FormData, as with a student's: fetchBaseQuery leaves it alone and lets
     * the browser set the multipart boundary.
     */
    uploadGuardianPhoto: builder.mutation<
      Envelope<GuardianSummary>,
      { id: number; file: File }
    >({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append("photo", file);
        return { url: `/guardians/${id}/photo/`, method: "POST", body };
      },
      extraOptions: { silent: true },
      invalidatesTags: ["Guardians", "Students"],
    }),

    deleteGuardianPhoto: builder.mutation<Envelope<GuardianSummary>, number>({
      query: (id) => ({ url: `/guardians/${id}/photo/`, method: "DELETE" }),
      extraOptions: { silent: true },
      invalidatesTags: ["Guardians", "Students"],
    }),

    getGuardian: builder.query<Envelope<GuardianDetail>, number>({
      query: (id) => ({ url: `/guardians/${id}/`, method: "GET" }),
      providesTags: ["Guardians"],
    }),

    // ── writes ────────────────────────────────────────────────────────────
    //
    // **Every one of them is `silent`.** base-api fires a global toast for a
    // 400, built from the FIRST entry in the error's `detail` map - which for
    // these routes is a bare value with no sentence around it. Refusing a
    // cross-branch transfer produced two toasts: the envelope's actual message
    // ("SSS1 B belongs to the Annex, and this student is at the Main Branch.
    // Move the student's branch or pick a class at the Main Branch.") and,
    // under it, the words "Lagoon View Academy Main Branch" on their own.
    // Every drawer here handles its own errors and shows the message, so the
    // global one is silenced rather than left to contradict it.
    //
    // Four routes, and which one to use is not a style choice. Class and status
    // each move through their OWN endpoint so each keeps its reason, its
    // effective date and its own audit line - the record has to be able to say
    // WHY a child left a class, and a PATCH that silently changed it could not.
    // `PATCH /students/<id>/` therefore accepts neither.

    updateStudent: builder.mutation<
      Envelope<StudentDetail>,
      { id: number } & Partial<StudentWrite>
    >({
      query: ({ id, ...body }) => ({
        url: `/students/${id}/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    /**
     * Move a student along the state machine.
     *
     * `to_status` must be one the server offered in `allowed_transitions` on
     * the detail payload. The screen never derives that list: a transition the
     * backend refuses should not be a button at all.
     */
    changeStudentStatus: builder.mutation<
      Envelope<StudentDetail>,
      {
        id: number;
        to_status: StudentStatus;
        reason: string;
        effective_date?: string;
        destination_school?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/students/${id}/status/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    /**
     * Assign or transfer. One route for both: the difference is whether the
     * student already had a class, which the server knows and the screen does
     * not need to encode twice.
     *
     * `allow_over_capacity` is an acknowledgement, not a preference. Send false
     * first; the server refuses with a capacity error, and only then does the
     * screen ask and resend with true.
     */
    assignClass: builder.mutation<
      Envelope<StudentDetail>,
      {
        id: number;
        school_class: number;
        reason?: string;
        effective_date?: string;
        allow_over_capacity?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/students/${id}/assign-class/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    /** Link an existing guardian by id, or create one inline by name + phone. */
    /**
     * The type-ahead: students by name or admission number.
     *
     * Capped and never paginated - a palette that paginates is a list, and this
     * is not one. Four fields only: a type-ahead is the wrong place to put a
     * child's address in front of somebody.
     */
    searchStudents: builder.query<Envelope<StudentSearchHit[]>, string>({
      query: (q) => ({
        url: `/students/search/`,
        method: "GET",
        params: { q },
      }),
      providesTags: ["Students"],
    }),

    /**
     * Guardian hits for the command palette. Backend: GuardianSearchView.
     *
     * Capped and never paginated, like the student search above it: a palette
     * that paginates is a list, and this is not one.
     */
    searchGuardians: builder.query<Envelope<GuardianSearchHit[]>, string>({
      query: (q) => ({
        url: `/guardians/search/`,
        method: "GET",
        params: { q },
      }),
      providesTags: ["Guardians"],
    }),

    linkGuardian: builder.mutation<
      Envelope<StudentGuardianLink[]>,
      {
        id: number;
        guardian_id?: number;
        full_name?: string;
        phone?: string;
        email?: string;
        relationship: string;
        is_primary?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/students/${id}/guardians/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students", "Guardians"],
    }),

    /**
     * Remove the LINK, not the guardian.
     *
     * The guardian record stays in the school's book - they may stand for
     * another child, and deleting the person because one link ended would take
     * a sibling's contact with it.
     */
    unlinkGuardian: builder.mutation<
      Envelope<null>,
      { id: number; guardianId: number }
    >({
      query: ({ id, guardianId }) => ({
        url: `/students/${id}/guardians/${guardianId}/`,
        method: "DELETE",
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students", "Guardians"],
    }),

    /**
     * One class's roster, for its seat count.
     *
     * The transfer drawer needs "29 of 30 seats used" for the class being moved
     * INTO. There is no endpoint returning seats for every class at once (see
     * the phase 2 backend ask), so this is fetched for the one class the user
     * picked - which is also all the design shows, since its destination meta
     * only appears after a selection.
     */
    getClassRoster: builder.query<
      PaginatedEnvelope<StudentRow> & {
        seats_used: number;
        capacity: number | null;
        class_name: string;
      },
      number
    >({
      query: (classId) => ({
        url: `/students/classes/${classId}/roster/`,
        method: "GET",
      }),
      providesTags: ["Students"],
    }),

    /**
     * Seat several students in one class.
     *
     * **The response is per-student, and the screen must say so.** A registrar
     * who picked twenty and mistyped one keeps the nineteen: each student is
     * its own transaction and the reply names what happened to each. Reporting
     * this as a single "Done" would hide the two that were refused, and the
     * children nobody placed are exactly the ones the screen exists to find.
     *
     * Capacity is checked ONCE against the whole selection, so twenty-five into
     * a ten-seat class warns about the total rather than fifteen times about
     * the overflow.
     */
    bulkAssignClass: builder.mutation<
      Envelope<{ results: BulkResultRow[]; assigned: number }>,
      {
        student_ids: number[];
        school_class: number;
        reason?: string;
        effective_date?: string;
        allow_over_capacity?: boolean;
      }
    >({
      query: (body) => ({
        url: `/students/bulk/assign-class/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    /**
     * Enrol a student, or save them as an applicant. One route, one flag.
     *
     * Two endpoints would be two sets of rules, and the second one would be
     * the one that forgets the duplicate check.
     *
     * `confirm_duplicate` and `allow_over_capacity` are both acknowledgements
     * rather than preferences: send them false, let the server refuse, and only
     * then ask. Pre-setting either answers a question the server meant for the
     * registrar - "is this a different child with the same name and birthday?"
     * is not ours to answer.
     */
    enrolStudent: builder.mutation<Envelope<StudentDetail>, EnrolWrite>({
      query: (body) => ({ url: `/students/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students", "Guardians"],
    }),

    /**
     * Put an applicant on the roll.
     *
     * It does NOT place them in a class, and that is the model rather than an
     * omission: an enrolled student with no class is the "unassigned" state the
     * whole module tracks, and the class is assigned with its own reason and
     * audit line afterwards.
     */
    confirmApplicant: builder.mutation<
      Envelope<StudentDetail>,
      { id: number; student_number?: string; reason?: string; effective_date?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/students/${id}/confirm/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    /**
     * Close an application.
     *
     * Not the same as withdrawing a student: the applicant was never on the
     * roll, and a school looking up why a family did not join needs the two
     * kept apart.
     */
    rejectApplicant: builder.mutation<
      Envelope<StudentDetail>,
      { id: number; reason: string; effective_date?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/students/${id}/reject/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students"],
    }),

    /**
     * Every class with its live seat count, in one request.
     *
     * The pickers that place a child all render "JSS1 A - 26/30" for every
     * class at once. Fetching a roster per class would cost a request per
     * option and grow with the school, so this is the one call they share -
     * which also means they cannot disagree about a load.
     */
    getClassSeats: builder.query<Envelope<ClassSeats[]>, { branch?: number; session?: number } | void>({
      query: (args) => ({
        url: `/students/classes/seats/`,
        method: "GET",
        params: listParams(args as StudentListArgs | void),
      }),
      providesTags: ["Students", "Classes"],
    }),

    /**
     * What a promotion WOULD do. Writes nothing.
     *
     * It runs the same classification the run does, so overrides must be sent
     * here too: a preview computed from different inputs is not a preview, it
     * is a second opinion, and the counts on the confirm step would not be the
     * ones the run acts on.
     */
    previewPromotion: builder.mutation<
      Envelope<PromotionPlan>,
      {
        to_session: number;
        overrides?: Record<string, PromotionOutcome>;
        /** The branch lens. Preview and run must carry the SAME one. */
        branch?: number;
      }
    >({
      // The branch is a QUERY param, not part of the body: branch_filter reads
      // request.query_params, which is the one place the whole module resolves
      // the lens. Splitting it into a body field here would be a second answer
      // to the same question.
      query: ({ branch, ...body }) => ({
        url: `/students/promotions/preview/`,
        method: "POST",
        params: branch !== undefined ? { branch } : undefined,
        body,
      }),
      extraOptions: { silent: true },
    }),

    /** Run it. Writes placements, and cannot be undone from the screen. */
    runPromotion: builder.mutation<
      Envelope<PromotionBatch>,
      {
        to_session: number;
        overrides?: Record<string, PromotionOutcome>;
        /** The branch lens. Preview and run must carry the SAME one. */
        branch?: number;
      }
    >({
      query: ({ branch, ...body }) => ({
        url: `/students/promotions/`,
        method: "POST",
        params: branch !== undefined ? { branch } : undefined,
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Students", "Classes"],
    }),

    /** Read with `view`, so the enrolment form can render the rule's hint. */
    getAdmissionPolicy: builder.query<Envelope<AdmissionPolicy>, void>({
      query: () => ({ url: `/students/admission-number-policy/`, method: "GET" }),
      providesTags: ["Students"],
    }),
  }),
});

export const {
  useGetStudentSummaryQuery,
  useGetStudentsQuery,
  useGetUnplacedStudentsQuery,
  useGetStudentQuery,
  useGetStudentGuardiansQuery,
  useGetStudentSubjectsQuery,
  useGetStudentClassHistoryQuery,
  useGetStudentDocumentsQuery,
  useUploadStudentDocumentMutation,
  useDeleteStudentDocumentMutation,
  useGetStudentHistoryQuery,
  useGetGuardiansQuery,
  useSearchGuardiansQuery,
  useSearchStudentsQuery,
  useGetGuardianQuery,
  useUpdateGuardianMutation,
  useUploadGuardianPhotoMutation,
  useDeleteGuardianPhotoMutation,
  useGetAdmissionPolicyQuery,
  useGetClassSeatsQuery,
  usePreviewPromotionMutation,
  useRunPromotionMutation,
  useGetClassRosterQuery,
  useBulkAssignClassMutation,
  useUpdateStudentMutation,
  useChangeStudentStatusMutation,
  useAssignClassMutation,
  useLinkGuardianMutation,
  useUnlinkGuardianMutation,
  useEnrolStudentMutation,
  useConfirmApplicantMutation,
  useRejectApplicantMutation,
} = studentsApi;
