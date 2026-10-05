import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import type {
  AcademicOverview,
  AcademicRules,
  AcademicRulesUpdate,
  AcademicSession,
  BranchFilter,
  ClassListArgs,
  ClassWrite,
  BulkLevelWrite,
  Department,
  EntityWrite,
  GenerateArmsWrite,
  Level,
  ListArgs,
  Program,
  SchoolClass,
  SessionListArgs,
  SessionWrite,
  StructureTree,
  Subject,
  SubjectListArgs,
  SubjectWrite,
} from "./academics-types";

// ─────────────────────────────────────────────────────────────────────────────
// /v1/academics/ - sessions, terms, departments, programmes, levels, classes
// and subjects.
//
// Every list here takes the same branch lens, and it is applied in ONE place
// (`params` below) rather than at each call site. That is deliberate: a lens
// that each screen remembers to pass is a lens one screen will forget, and the
// screen that forgets shows another branch's rows without anything looking
// wrong.
//
// The school is the session's - `?tenant=` is injected centrally by base-api -
// so nothing here takes a school identifier and no caller can reach another
// school's structure by changing an argument.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Turn the lens into query params.
 *
 * "all" and undefined are both dropped, because the server's default IS every
 * branch the caller can see. Sending `branch=all` would be a literal branch
 * reference and answer 404.
 */
function branchParam(branch: BranchFilter): Record<string, string | number> {
  if (branch === undefined || branch === "all") return {};
  return { branch };
}

/** The school's term word, term names and default arms: read and written here. */
export const ACADEMIC_RULES_URL = `/academics/rules/`;

function listParams(args: ListArgs = {}): Record<string, string | number> {
  const { branch, session, search, is_active, page } = args;
  return {
    ...branchParam(branch),
    // Beside the branch for the same reason: a lens applied per screen is a
    // lens one screen forgets.
    ...(session ? { session } : {}),
    ...(search?.trim() ? { search: search.trim() } : {}),
    // Omitted means active-only on the server, which is what every screen's
    // default filter wants. "all" is the only value worth spelling out.
    ...(is_active ? { is_active } : {}),
    ...(page && page > 1 ? { page } : {}),
  };
}

export const academicsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Reads composed by the server, one call per screen ──────────────────
    getAcademicOverview: builder.query<
      Envelope<AcademicOverview>,
      { branch?: BranchFilter; session?: number } | void
    >({
      query: (args) => ({
        url: `/academics/overview/`,
        method: "GET",
        params: {
          ...branchParam(args?.branch),
          ...(args?.session ? { session: args.session } : {}),
        },
      }),
      providesTags: ["AcademicOverview"],
    }),

    getStructureTree: builder.query<
      Envelope<StructureTree>,
      { branch?: BranchFilter; session?: number; full?: boolean } | void
    >({
      query: (args) => {
        const { branch, session, full } = args ?? {};
        return {
          url: `/academics/structure/tree/`,
          method: "GET",
          params: {
            ...branchParam(branch),
            ...(session ? { session } : {}),
            // The depth cap is what makes this safe to serve unpaginated, so
            // ask for full only once a level has been opened.
            ...(full ? { depth: "full" } : {}),
          },
        };
      },
      providesTags: ["AcademicStructure"],
    }),

    // ── Sessions and terms ─────────────────────────────────────────────────
    getSessions: builder.query<PaginatedEnvelope<AcademicSession>, SessionListArgs | void>({
      query: (args) => {
        const { branch, search, status, page } = args ?? {};
        return {
          url: `/academics/sessions/`,
          method: "GET",
          params: {
            ...branchParam(branch),
            ...(search?.trim() ? { search: search.trim() } : {}),
            ...(status && status !== "all" ? { status } : {}),
            ...(page && page > 1 ? { page } : {}),
          },
        };
      },
      providesTags: ["Sessions"],
    }),

    getSession: builder.query<Envelope<AcademicSession>, number>({
      query: (id) => ({ url: `/academics/sessions/${id}/`, method: "GET" }),
      providesTags: ["Sessions"],
    }),

    createSession: builder.mutation<Envelope<AcademicSession>, SessionWrite>({
      query: (body) => ({ url: `/academics/sessions/`, method: "POST", body }),
      // A new year changes what the overview's hero and its session count say,
      // so both tags go. Cheaper than a stale landing screen.
      invalidatesTags: ["Sessions", "AcademicOverview"],
    }),

    updateSession: builder.mutation<
      Envelope<AcademicSession>,
      { id: number } & Partial<SessionWrite>
    >({
      query: ({ id, ...body }) => ({
        url: `/academics/sessions/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Sessions", "AcademicOverview"],
    }),

    activateSession: builder.mutation<Envelope<AcademicSession>, number>({
      query: (id) => ({
        url: `/academics/sessions/${id}/activate/`,
        method: "POST",
      }),
      // Activating one year archives another, so the whole list is stale - and
      // every screen defaults to the ACTIVE year, so its rows go too.
      invalidatesTags: [
        "Sessions", "AcademicOverview", "AcademicStructure", "Classes", "Subjects",
      ],
    }),

    /**
     * Seed a year's structure from another year's.
     *
     * The server refuses a year that has already been started (409) rather
     * than merging, so this is safe to offer without a "are you sure" of its
     * own - the only destructive reading of it is the one that cannot happen.
     */
    rollForwardSession: builder.mutation<
      Envelope<{ levels: number; classes: number; subjects: number }>,
      { id: number; from: number }
    >({
      query: ({ id, from }) => ({
        url: `/academics/sessions/${id}/roll-forward/`,
        method: "POST",
        body: { from },
      }),
      // Everything arrives at once, and Classes and Subjects carry tags of
      // their own - leaving them out left the copying screen showing empty.
      invalidatesTags: [
        "Sessions", "AcademicOverview", "AcademicStructure", "Classes", "Subjects",
      ],
    }),

    archiveSession: builder.mutation<Envelope<AcademicSession>, number>({
      query: (id) => ({
        url: `/academics/sessions/${id}/archive/`,
        method: "POST",
      }),
      invalidatesTags: [
        "Sessions", "AcademicOverview", "AcademicStructure", "Classes", "Subjects",
      ],
    }),

    // ── Departments ────────────────────────────────────────────────────────
    getDepartments: builder.query<PaginatedEnvelope<Department>, ListArgs | void>({
      query: (args) => ({
        url: `/academics/departments/`,
        method: "GET",
        params: listParams(args ?? {}),
      }),
      providesTags: ["AcademicStructure"],
    }),

    createDepartment: builder.mutation<Envelope<Department>, EntityWrite>({
      query: (body) => ({
        url: `/academics/departments/`,
        method: "POST",
        body,
      }),
      // The overview counts departments, so its cache goes with the list's.
      invalidatesTags: ["AcademicStructure", "AcademicOverview"],
    }),

    updateDepartment: builder.mutation<
      Envelope<Department>,
      { id: number } & EntityWrite
    >({
      query: ({ id, ...body }) => ({
        url: `/academics/departments/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview"],
    }),

    archiveDepartment: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/departments/${id}/archive/`,
        method: "POST",
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Subjects"],
    }),

    restoreDepartment: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/departments/${id}/restore/`,
        method: "POST",
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Subjects"],
    }),

    // ── Programmes (levels arrive nested - the screen is an accordion) ──────
    getPrograms: builder.query<PaginatedEnvelope<Program>, ListArgs | void>({
      query: (args) => ({
        url: `/academics/programs/`,
        method: "GET",
        params: listParams(args ?? {}),
      }),
      providesTags: ["AcademicStructure"],
    }),

    createProgram: builder.mutation<Envelope<Program>, EntityWrite>({
      query: (body) => ({ url: `/academics/programs/`, method: "POST", body }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview"],
    }),

    updateProgram: builder.mutation<
      Envelope<Program>,
      { id: number } & EntityWrite
    >({
      query: ({ id, ...body }) => ({
        url: `/academics/programs/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview"],
    }),

    archiveProgram: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/programs/${id}/archive/`,
        method: "POST",
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Classes", "Subjects"],
    }),

    restoreProgram: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/programs/${id}/restore/`,
        method: "POST",
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Classes", "Subjects"],
    }),

    // The parent is in the path, not the body: the server reads its branch
    // from there and refuses a level wider than it.
    createLevel: builder.mutation<
      Envelope<Level>,
      { program: number } & EntityWrite
    >({
      query: ({ program, ...body }) => ({
        url: `/academics/programs/${program}/levels/`,
        method: "POST",
        body,
      }),
      // Classes hang off levels, so their screen's counts move too.
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Classes"],
    }),

    bulkCreateLevels: builder.mutation<Envelope<Level[]>, BulkLevelWrite>({
      query: ({ program, ...body }) => ({
        url: `/academics/programs/${program}/levels/bulk/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Classes"],
    }),

    updateLevel: builder.mutation<Envelope<Level>, { id: number } & EntityWrite>({
      query: ({ id, ...body }) => ({
        url: `/academics/levels/${id}/`,
        method: "PATCH",
        body,
      }),
      // Subjects too: a subject card names the levels it is offered at, so
      // renaming JSS1 leaves every one of them printing the old name.
      invalidatesTags: [
        "AcademicStructure", "AcademicOverview", "Classes", "Subjects",
      ],
    }),

    archiveLevel: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/levels/${id}/archive/`,
        method: "POST",
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Classes", "Subjects"],
    }),

    restoreLevel: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/levels/${id}/restore/`,
        method: "POST",
      }),
      invalidatesTags: ["AcademicStructure", "AcademicOverview", "Classes", "Subjects"],
    }),

    // ── Classes ────────────────────────────────────────────────────────────
    getClasses: builder.query<PaginatedEnvelope<SchoolClass>, ClassListArgs | void>({
      query: (args) => {
        const { level, ...rest } = args ?? {};
        return {
          url: `/academics/classes/`,
          method: "GET",
          params: { ...listParams(rest), ...(level ? { level } : {}) },
        };
      },
      providesTags: ["Classes"],
    }),

    getClass: builder.query<Envelope<SchoolClass>, number>({
      query: (id) => ({
        url: `/academics/classes/${id}/`,
        method: "GET",
      }),
      providesTags: ["Classes"],
    }),

    createClass: builder.mutation<Envelope<SchoolClass>, ClassWrite>({
      query: (body) => ({ url: `/academics/classes/`, method: "POST", body }),
      // A class hangs off a level, so the accordion's per-level count moves too.
      invalidatesTags: ["Classes", "AcademicStructure", "AcademicOverview"],
    }),

    updateClass: builder.mutation<
      Envelope<SchoolClass>,
      { id: number } & ClassWrite
    >({
      query: ({ id, ...body }) => ({
        url: `/academics/classes/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Classes", "AcademicStructure", "AcademicOverview"],
    }),

    generateArms: builder.mutation<Envelope<SchoolClass[]>, GenerateArmsWrite>({
      query: (body) => ({
        url: `/academics/classes/generate-arms/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Classes", "AcademicStructure", "AcademicOverview"],
    }),

    // Archive and restore: there is no delete route, and its absence is a
    // promise M11's PROTECTed enrolment depends on.
    archiveClass: builder.mutation<Envelope<SchoolClass>, number>({
      query: (id) => ({
        url: `/academics/classes/${id}/archive/`,
        method: "POST",
      }),
      invalidatesTags: ["Classes", "AcademicStructure", "AcademicOverview"],
    }),

    restoreClass: builder.mutation<Envelope<SchoolClass>, number>({
      query: (id) => ({
        url: `/academics/classes/${id}/restore/`,
        method: "POST",
      }),
      invalidatesTags: ["Classes", "AcademicStructure", "AcademicOverview"],
    }),

    // ── Subjects ───────────────────────────────────────────────────────────
    getSubjects: builder.query<PaginatedEnvelope<Subject>, SubjectListArgs | void>({
      query: (args) => {
        const { is_core, ...rest } = args ?? {};
        return {
          url: `/academics/subjects/`,
          method: "GET",
          params: { ...listParams(rest), ...(is_core ? { is_core } : {}) },
        };
      },
      providesTags: ["Subjects"],
    }),
    createSubject: builder.mutation<Envelope<Subject>, SubjectWrite>({
      query: (body) => ({ url: `/academics/subjects/`, method: "POST", body }),
      invalidatesTags: ["Subjects", "AcademicStructure", "AcademicOverview"],
    }),

    updateSubject: builder.mutation<
      Envelope<Subject>,
      { id: number } & SubjectWrite
    >({
      query: ({ id, ...body }) => ({
        url: `/academics/subjects/${id}/`,
        method: "PATCH",
        body,
      }),
      // Offerings change what a CLASS reports as its subject count, and what
      // the level rows in the accordion say, so both go with the subject list.
      invalidatesTags: [
        "Subjects", "AcademicStructure", "AcademicOverview", "Classes",
      ],
    }),

    archiveSubject: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/subjects/${id}/archive/`,
        method: "POST",
      }),
      invalidatesTags: ["Subjects", "AcademicStructure", "AcademicOverview"],
    }),

    restoreSubject: builder.mutation<Envelope<null>, number>({
      query: (id) => ({
        url: `/academics/subjects/${id}/restore/`,
        method: "POST",
      }),
      invalidatesTags: ["Subjects", "AcademicStructure", "AcademicOverview"],
    }),

    /**
     * Replace where a subject is offered, on its own.
     *
     * The drawer does not use this - it sends `level_ids` with the rest so Save
     * is one call. This is for a screen that changes only the offerings, and
     * exists because the endpoint does.
     */
    setSubjectOfferings: builder.mutation<
      Envelope<Subject>,
      { id: number; level_ids: number[] }
    >({
      query: ({ id, level_ids }) => ({
        url: `/academics/subjects/${id}/offerings/`,
        method: "PUT",
        body: { level_ids },
      }),
      invalidatesTags: [
        "Subjects", "AcademicStructure", "AcademicOverview", "Classes",
      ],
    }),

    // ── The school's academic vocabulary ───────────────────────────────────
    /**
     * The school's word for a term, its term names and its default arms.
     *
     * Read by nearly every screen through `useSchoolWords`, so it is held for
     * an hour rather than refetched on each mount; a save here invalidates it,
     * which is the only way it changes mid-session. `silent` because a failure
     * must not raise a toast about a request the reader did not make: the hook
     * falls back to the school's term structure, and the screen still reads.
     */
    getAcademicRules: builder.query<Envelope<AcademicRules>, void>({
      query: () => ({ url: ACADEMIC_RULES_URL, method: "GET" }),
      extraOptions: { silent: true },
      keepUnusedDataFor: 3600,
      providesTags: ["AcademicRules"],
    }),

    /**
     * `silent`, like every settings section's save: the section puts a field's
     * refusal under that field and toasts anything else itself.
     */
    updateAcademicRules: builder.mutation<
      Envelope<AcademicRules>,
      AcademicRulesUpdate
    >({
      query: (body) => ({ url: ACADEMIC_RULES_URL, method: "PUT", body }),
      extraOptions: { silent: true },
      invalidatesTags: ["AcademicRules"],
    }),
  }),
});

export const {
  useGetAcademicOverviewQuery,
  useGetStructureTreeQuery,
  useGetSessionsQuery,
  useGetSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useActivateSessionMutation,
  useArchiveSessionMutation,
  useRollForwardSessionMutation,
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useArchiveDepartmentMutation,
  useRestoreDepartmentMutation,
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useArchiveProgramMutation,
  useRestoreProgramMutation,
  useCreateLevelMutation,
  useBulkCreateLevelsMutation,
  useUpdateLevelMutation,
  useArchiveLevelMutation,
  useRestoreLevelMutation,
  useGetClassesQuery,
  useGetClassQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useGenerateArmsMutation,
  useArchiveClassMutation,
  useRestoreClassMutation,
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useArchiveSubjectMutation,
  useRestoreSubjectMutation,
  useSetSubjectOfferingsMutation,
  useGetAcademicRulesQuery,
  useUpdateAcademicRulesMutation,
} = academicsApi;
